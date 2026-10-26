import { resolve } from 'node:path'
import type { Request, Response, NextFunction } from 'express'
import type { AddressInfo } from 'node:net'

import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { RuntimeConfigService } from '@/platform/config/runtime-config.service'
import type { ApplicationRuntimeConfig } from '@/platform/config/runtime-config.types'
import { createApiRuntimeConfig } from '@/platform/config/runtime-environment'
import type { DatabaseLifecycle } from '@/platform/database/database.contracts'
import { DATABASE_LIFECYCLE } from '@/platform/database/database.tokens'
import { configureHttpApplication } from '@/platform/http/bootstrap/configure-http-application'
import {
  PRE_BODY_ACCESS_POLICY,
  type PreBodyAccessPolicy,
} from '@/platform/http/policy/protected-json-body.contracts'
import {
  STORY_MEDIA_UPLOAD,
  MEDIA_CHUNK_UPLOAD,
} from '@/modules/coach-site/composition/story-media-upload.policy'
import { ApplicationLifecycleState } from '@/platform/lifecycle/application-lifecycle.state'
import type { RedisLifecycle } from '@/platform/redis/redis-lifecycle'
import { ActiveRequestTracker } from '@/platform/http/bootstrap/active-request-tracker'
import { RequestContext } from '@/platform/http/context/request-context'
import {
  DOCS_ACCESS_POLICY,
  type DocsAccessPolicy,
} from '@/platform/http/docs/docs-access.contracts'
import { configureApiDocs } from '@/platform/http/docs/configure-api-docs'
import { HttpProblemRegistry } from '@/platform/http/errors/http-problem.registry'
import { CorrelationFieldsProvider } from '@/platform/http/context/correlation-fields.provider'
import { createHttpAccessLogMiddleware } from '@/platform/logging/http-access-log.middleware'
import { NestLoggerAdapter } from '@/platform/logging/nest-logger.adapter'
import {
  STRUCTURED_LOGGER,
  type StructuredLogger,
} from '@/platform/logging/logging.contracts'
import type { ObservabilityRuntime } from '@/platform/observability/observability.runtime'

import { ApiModule } from './api.module'
import { configureAdminUi } from '@/platform/http/admin/configure-admin-ui'

/** Minimal application handle owned by the startup runtime. */
export interface ApiApplicationHandle {
  listen(): Promise<void>
  close(): Promise<void>
  address(): AddressInfo | string | null
  /** Stops accepting new connections. */
  closeListener?(): Promise<void>
  /** Closes idle keep-alive connections after listener close. */
  closeIdleConnections?(): void
  /** Force-closes remaining transport connections. */
  closeAllConnections?(): void
}

/** Lifecycle operations required by startup orchestration. */
export interface ApiLifecycleHandle {
  readonly phase: 'starting' | 'ready' | 'draining'
  markReady(): void
  beginDrain(): boolean
}

/** Startup operations required by runtime orchestration without DI internals. */
/** Resources created before the explicit database startup step. */
export interface ApiRuntimeResources {
  readonly application: ApiApplicationHandle
  readonly database: DatabaseLifecycle
  readonly lifecycle: ApiLifecycleHandle
  readonly requestTracker?: ActiveRequestTracker
  readonly redis?: RedisLifecycle
  readonly observability?: ObservabilityRuntime
  readonly httpDrainTimeoutMs?: number
  readonly shutdownGraceMs?: number
}

/**
 * Creates, configures and initializes the API without opening its listener.
 *
 * @param runtimeConfig - Prevalidated config or process environment projection.
 */
export async function configureApi(
  runtimeConfig: ApplicationRuntimeConfig = createApiRuntimeConfig(),
  observability?: ObservabilityRuntime,
): Promise<ApiRuntimeResources> {
  const app = await NestFactory.create<NestExpressApplication>(
    ApiModule.forRoot(runtimeConfig),
    {
      bodyParser: false,
      bufferLogs: true,
    },
  )
  app.useLogger(app.get(NestLoggerAdapter))
  const config = app.get(RuntimeConfigService)
  const lifecycle = app.get(ApplicationLifecycleState)
  const database = app.get<DatabaseLifecycle>(DATABASE_LIFECYCLE)
  const requestTracker = app.get(ActiveRequestTracker)
  const requestContext = app.get(RequestContext)
  const correlation = app.get(CorrelationFieldsProvider)
  const logger = app.get<StructuredLogger>(STRUCTURED_LOGGER)
  configureHttpApplication(
    app,
    config,
    lifecycle,
    requestContext,
    requestTracker,
    createHttpAccessLogMiddleware({
      logger,
      correlation,
    }),
    [
      ...[STORY_MEDIA_UPLOAD, MEDIA_CHUNK_UPLOAD].map((route) => ({
        ...route,
        accessPolicy: app.get<PreBodyAccessPolicy>(PRE_BODY_ACCESS_POLICY),
        maxConcurrent: 2,
        requestsPerWindow: 240,
        windowMs: 60_000,
        timeoutMs: config.http.requestTimeoutMs,
      })),
    ],
  )
  const docsPolicy =
    config.docs.mode === 'protected'
      ? app.get<DocsAccessPolicy | null>(DOCS_ACCESS_POLICY)
      : null
  configureApiDocs(
    app,
    runtimeConfig,
    requestContext,
    docsPolicy,
    app.get(HttpProblemRegistry).definitions,
  )
  app.useStaticAssets(
    resolve(runtimeConfig.coachSite?.mediaDirectory ?? 'var/media', 'public'),
    {
      prefix: '/media/',
      immutable: true,
      maxAge: '1y',
      index: false,
      dotfiles: 'deny',
      setHeaders: (response: Response) => {
        response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      },
    },
  )
  app.use(
    '/media',
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      const failure = error as {
        status?: number
        headers?: Record<string, unknown>
      } | null
      const range = failure?.headers?.['Content-Range']
      if (
        failure?.status === 416 &&
        typeof range === 'string' &&
        /^bytes \*\/\d+$/u.test(range)
      ) {
        response
          .status(416)
          .set({
            'Content-Range': range,
            'Cache-Control': 'no-store',
            'Cross-Origin-Resource-Policy': 'cross-origin',
          })
          .end()
        return
      }
      next(error)
    },
  )
  await configureAdminUi(app, runtimeConfig.coachSite?.adminDirectory ?? '')
  await app.init()

  return {
    database,
    lifecycle,
    requestTracker,
    ...(observability === undefined ? {} : { observability }),
    httpDrainTimeoutMs: config.http.drainTimeoutMs,
    shutdownGraceMs: config.http.shutdownGraceMs,
    application: {
      listen: async () => {
        await app.listen(config.http.port, config.http.host)
      },
      close: () => app.close(),
      address: () => app.getHttpServer().address(),
      closeListener: () => {
        try {
          app.getHttpServer().close()
        } catch (error: unknown) {
          if (
            (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING'
          ) {
            return Promise.reject(
              error instanceof Error
                ? error
                : new Error('Listener close failed'),
            )
          }
        }
        return Promise.resolve()
      },
      closeIdleConnections: () => app.getHttpServer().closeIdleConnections(),
      closeAllConnections: () => app.getHttpServer().closeAllConnections(),
    },
  }
}
