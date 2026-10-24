import type { Server } from 'node:http'

import { RequestMethod, ValidationPipe } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { Express } from 'express'
import type { RequestHandler, Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

import type { RuntimeConfigService } from '@/platform/config/runtime-config.service'
import type { ApplicationLifecycleState } from '@/platform/lifecycle/application-lifecycle.state'
import type { RequestContext } from '@/platform/http/context/request-context'
import { createRequestContextMiddleware } from '@/platform/http/context/request-context.middleware'
import { RequestValidationError } from '@/platform/http/errors/request-validation.error'
import { mapValidationErrors } from '@/platform/http/errors/validation-error.mapper'

import { createCorsOptions } from './cors-options'
import { createTrafficGateMiddleware } from './traffic-gate.middleware'
import { trustedProxySetting } from './trusted-proxy'
import type { ActiveRequestTracker } from './active-request-tracker'
import type { ProtectedJsonBody } from '../policy/protected-json-body.contracts'
import { createProtectedJsonAdmission } from './protected-json-admission.middleware'
import { ProtectedRequestCompletionInterceptor } from '../policy/protected-request-completion.interceptor'

/** Applies the production API prefix and its infrastructure-route exclusions. */
export function configureApiRouteMetadata(
  app: Pick<NestExpressApplication, 'setGlobalPrefix'>,
): void {
  app.setGlobalPrefix('v1', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/startup', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  })
}

/** Applies security-sensitive HTTP policy before application initialization. */
export function configureHttpApplication(
  app: NestExpressApplication,
  config: RuntimeConfigService,
  lifecycle: ApplicationLifecycleState,
  requestContext: RequestContext,
  requestTracker?: ActiveRequestTracker,
  accessLogMiddleware?: RequestHandler,
  protectedJsonBodies: readonly ProtectedJsonBody[] = [],
): void {
  app.use(createRequestContextMiddleware(requestContext))
  if (accessLogMiddleware !== undefined) app.use(accessLogMiddleware)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { 'frame-src': ["'self'", ...config.http.corsOrigins] },
      },
    }),
  )
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Service-Revision', config.logging.serviceRevision)
    next()
  })
  app.enableCors(createCorsOptions(config.http.corsOrigins))
  const expressApplication: Express = app.getHttpAdapter().getInstance()
  expressApplication.set(
    'trust proxy',
    trustedProxySetting(config.http.trustedProxyCidrs),
  )
  app.use(createTrafficGateMiddleware(lifecycle))
  if (requestTracker !== undefined) app.use(requestTracker.middleware())
  app.use(cookieParser())
  if (protectedJsonBodies.length > 0)
    app.useGlobalInterceptors(new ProtectedRequestCompletionInterceptor())
  for (const override of protectedJsonBodies) {
    const admitted = new WeakSet<object>()
    expressApplication.post(
      override.path,
      createProtectedJsonAdmission(override, admitted),
    )
    app.useBodyParser('json', {
      limit: override.limitBytes,
      inflate: false,
      type: (request) => admitted.has(request),
    })
  }
  app.useBodyParser('json', { limit: config.http.jsonBodyLimitBytes })
  app.useBodyParser('urlencoded', {
    extended: false,
    limit: config.http.jsonBodyLimitBytes,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      exceptionFactory: (errors) =>
        new RequestValidationError(mapValidationErrors(errors)),
    }),
  )
  configureApiRouteMetadata(app)
  const server: Server = app.getHttpServer()
  server.requestTimeout = config.http.requestTimeoutMs
  server.headersTimeout = config.http.headersTimeoutMs
  server.keepAliveTimeout = config.http.keepAliveTimeoutMs
}
