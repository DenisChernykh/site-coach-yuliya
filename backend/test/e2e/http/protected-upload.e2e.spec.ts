import {
  request as httpRequest,
  type Server,
  type IncomingHttpHeaders,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { gzipSync } from 'node:zlib'
import { setImmediate } from 'node:timers/promises'

import { HttpAdapterHost, Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'

import { MediaUploadController } from '@/modules/coach-site/presentation/media-upload.controller'
import { AdminStoryMediaController } from '@/modules/coach-site/presentation/story-media.controller'
import { MediaUploadService } from '@/modules/coach-site/application/media-upload.service'
import { MANAGE_SITE_CONTENT } from '@/modules/coach-site/application/site-permissions'
import { AUTH_HTTP_PROBLEM_CONTRIBUTION } from '@/modules/identity-access/composition/auth-http-problem.contribution'
import type { AuthenticateSessionUseCase } from '@/modules/identity-access/authorization/application/authenticate-session.use-case'
import { AuthenticationGuard } from '@/modules/identity-access/authorization/presentation/authentication.guard'
import { BrowserOriginGuard } from '@/modules/identity-access/authorization/presentation/browser-origin.guard'
import { SessionCsrfGuard } from '@/modules/identity-access/authorization/presentation/session-csrf.guard'
import { PermissionGuard } from '@/modules/identity-access/authorization/presentation/permission.guard'
import { AuthRequestContext } from '@/modules/identity-access/authorization/presentation/auth-request.context'
import { PreBodyAccessPolicyAdapter } from '@/modules/identity-access/authorization/presentation/pre-body-access-policy.adapter'
import {
  MEDIA_CHUNK_UPLOAD,
  STORY_MEDIA_UPLOAD,
} from '@/modules/coach-site/composition/story-media-upload.policy'
import type { GetCsrfTokenQuery } from '@/modules/identity-access/sessions/application/get-csrf-token.query'
import { RuntimeConfigService } from '@/platform/config/runtime-config.service'
import { buildApiRuntimeConfig } from '@/platform/config/runtime-environment'
import { configureHttpApplication } from '@/platform/http/bootstrap/configure-http-application'
import { RequestContext } from '@/platform/http/context/request-context'
import { CORE_HTTP_PROBLEM_CONTRIBUTION } from '@/platform/http/errors/http-problem.mapper'
import { HttpProblemRegistry } from '@/platform/http/errors/http-problem.registry'
import { ProblemExceptionFilter } from '@/platform/http/errors/problem-exception.filter'
import { ApplicationLifecycleState } from '@/platform/lifecycle/application-lifecycle.state'
import { requiredRuntimeEnvironment } from '@test/support/required-runtime-environment'
import {
  AuthenticationRequiredError,
  AuthDependencyUnavailableError,
} from '@/modules/identity-access/public-contracts/auth-errors'
import { TestHttpController } from '@test/e2e/fixtures/http/test-http.controller'

interface HeadersOnlyResult {
  status: number | undefined
  headers: IncomingHttpHeaders
  body: { code: string }
}

describe('protected upload body admission', () => {
  let app: NestExpressApplication
  let server: Server
  const upload = jest.fn(() =>
    Promise.resolve({
      id: 'media',
      mimeType: 'image/png',
      size: 8,
      type: 'image',
    }),
  )
  const chunk = jest.fn().mockResolvedValue(undefined)
  const cookieName = 'nest-js-starter-session'
  const rawToken = Buffer.alloc(32, 1).toString('base64url')
  const csrfToken = Buffer.alloc(32, 2).toString('base64url')
  const authenticate = {
    execute: jest.fn(() =>
      Promise.resolve({
        userId: 'admin',
        sessionId: 'session',
        normalizedEmail: 'admin@example.com',
        roleKeys: ['system.admin'],
        permissions: new Set([MANAGE_SITE_CONTENT]),
      }),
    ),
  }
  const csrf = { execute: jest.fn(() => Promise.resolve({ csrfToken })) }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AdminStoryMediaController,
        MediaUploadController,
        TestHttpController,
      ],
      providers: [
        {
          provide: MediaUploadService,
          useValue: {
            create: upload,
            chunk,
            finish: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile()
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    })
    const config = new RuntimeConfigService(
      buildApiRuntimeConfig(
        requiredRuntimeEnvironment({
          DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
          CORS_ORIGINS: 'https://app.example.com',
        }),
      ),
    )
    const context = new RequestContext()
    app.useGlobalFilters(
      new ProblemExceptionFilter(
        app.get(HttpAdapterHost),
        context,
        { write: jest.fn() },
        new HttpProblemRegistry([
          CORE_HTTP_PROBLEM_CONTRIBUTION,
          AUTH_HTTP_PROBLEM_CONTRIBUTION,
        ]),
      ),
    )
    const authContext = new AuthRequestContext()
    const reflector = new Reflector()
    const guards = [
      new AuthenticationGuard(
        reflector,
        authenticate as unknown as AuthenticateSessionUseCase,
        authContext,
        cookieName,
      ),
      new BrowserOriginGuard(['https://app.example.com']),
      new SessionCsrfGuard(
        reflector,
        authContext,
        csrf as unknown as GetCsrfTokenQuery,
      ),
      new PermissionGuard(reflector, authContext),
    ] as const
    app.useGlobalGuards(...guards)
    const lifecycle = new ApplicationLifecycleState()
    lifecycle.markReady()
    configureHttpApplication(
      app,
      config,
      lifecycle,
      context,
      undefined,
      undefined,
      [STORY_MEDIA_UPLOAD, MEDIA_CHUNK_UPLOAD].map((policy) => ({
        ...policy,
        accessPolicy: new PreBodyAccessPolicyAdapter(...guards),
        maxConcurrent: 2,
        requestsPerWindow: 60,
        windowMs: 60_000,
        timeoutMs: 30_000,
      })),
    )
    await app.init()
    await app.listen(0, '127.0.0.1')
    server = app.getHttpServer()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    upload.mockClear()
    chunk.mockClear()
    authenticate.execute.mockReset().mockResolvedValue({
      userId: 'admin',
      sessionId: 'session',
      normalizedEmail: 'admin@example.com',
      roleKeys: ['system.admin'],
      permissions: new Set([MANAGE_SITE_CONTENT]),
    })
  })

  it('rejects an unauthenticated malformed body before parsing JSON', async () => {
    const response = await request(server)
      .post('/v1/admin/story-media')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(401)
    expect(response.body).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' })
    expect(upload).not.toHaveBeenCalled()
  })

  const authHeaders = (): Record<string, string> => ({
    Cookie: `${cookieName}=${rawToken}`,
    Origin: 'https://app.example.com',
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json',
  })

  function headersOnly(
    path: string,
    headers: Record<string, string> = {},
  ): Promise<HeadersOnlyResult> {
    return new Promise<HeadersOnlyResult>((resolve, reject) => {
      const { port } = server.address() as AddressInfo
      const client = httpRequest(
        {
          host: '127.0.0.1',
          port,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        },
        (response) => {
          let body = ''
          response.setEncoding('utf8')
          response.on('data', (chunk: string) => {
            body += chunk
          })
          response.on('end', () => {
            client.destroy()
            resolve({
              status: response.statusCode,
              headers: response.headers,
              body: JSON.parse(body) as { code: string },
            })
          })
        },
      )
      client.on('error', reject)
      client.setTimeout(2000, () => {
        client.destroy(new Error('Admission waited for the body'))
      })
      client.flushHeaders()
    })
  }

  it.each([
    { 'Content-Length': String(41 * 1024 * 1024) },
    { 'Transfer-Encoding': 'chunked' },
  ])(
    'rejects missing authentication before the client sends any body: %j',
    async (headers) => {
      const response = await headersOnly('/v1/admin/story-media', headers)
      expect(response.status).toBe(401)
      expect(response.body.code).toBe('AUTHENTICATION_REQUIRED')
      expect(upload).not.toHaveBeenCalled()
    },
  )

  it.each([
    '/v1/admin/story-media?source=editor',
    '/v1/admin/story-media/',
    '/V1/ADMIN/STORY-MEDIA',
  ])('applies admission to the same native route variant: %s', async (path) => {
    await request(server)
      .post(path)
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(401)
    await request(server)
      .post(path)
      .set(authHeaders())
      .send({
        name: 'photo.png',
        mimeType: 'image/png',
        base64: 'a'.repeat(1_100_000),
      })
      .expect(201)
  })

  it.each([
    '/v1/admin/story-media/extra',
    '/v1/admin/story-media//',
    '/v1/admin/%73tory-media',
    '/v1/admin/story%2dmedia',
    '/v1/admin/story-media%2f',
    '//v1/admin/story-media',
    '/v1/admin/story-media%',
  ])('does not grant the expanded parser to another path: %s', async (path) => {
    await request(server)
      .post(path)
      .set(authHeaders())
      .send({ data: 'a'.repeat(1_100_000) })
      .expect(413)
    expect(upload).not.toHaveBeenCalled()
  })

  it.each([
    { Origin: 'https://evil.example' },
    { 'Sec-Fetch-Site': 'cross-site' },
    { 'X-CSRF-Token': Buffer.alloc(32, 3).toString('base64url') },
    { 'X-CSRF-Token': '' },
  ])(
    'rejects browser/CSRF violations before malformed JSON: %j',
    async (headers) => {
      const response = await request(server)
        .post('/v1/admin/story-media')
        .set({ ...authHeaders(), ...headers })
        .send('{')
        .expect(403)
      expect(response.body).toMatchObject({ code: 'AUTHORIZATION_DENIED' })
      expect(upload).not.toHaveBeenCalled()
    },
  )

  it('checks the target controller permission before parsing', async () => {
    authenticate.execute.mockResolvedValueOnce({
      userId: 'admin',
      sessionId: 'session',
      normalizedEmail: 'admin@example.com',
      roleKeys: [],
      permissions: new Set(),
    })
    await request(server)
      .post('/v1/admin/story-media')
      .set(authHeaders())
      .send('{')
      .expect(403)
    expect(upload).not.toHaveBeenCalled()
  })

  it('fails closed on an unavailable authentication dependency before parsing', async () => {
    authenticate.execute.mockRejectedValueOnce(
      new AuthDependencyUnavailableError(),
    )
    const response = await request(server)
      .post('/v1/admin/story-media')
      .set(authHeaders())
      .send('{')
      .expect(503)
    expect(response.body).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' })
  })

  it('reauthenticates after receiving the body and rejects a revoked session', async () => {
    authenticate.execute
      .mockResolvedValueOnce({
        userId: 'admin',
        sessionId: 'session',
        normalizedEmail: 'admin@example.com',
        roleKeys: ['system.admin'],
        permissions: new Set([MANAGE_SITE_CONTENT]),
      })
      .mockRejectedValueOnce(new AuthenticationRequiredError())
    await request(server)
      .post('/v1/admin/story-media')
      .set(authHeaders())
      .send({
        name: 'photo.png',
        mimeType: 'image/png',
        base64: 'a'.repeat(1_100_000),
      })
      .expect(401)
    expect(authenticate.execute).toHaveBeenCalledTimes(2)
    expect(upload).not.toHaveBeenCalled()
  })

  it('rejects a declared oversized body without waiting for it', async () => {
    const response = await headersOnly('/v1/admin/story-media', {
      ...authHeaders(),
      'Content-Length': String(41 * 1024 * 1024 + 1),
    })
    expect(response.status).toBe(413)
    expect(response.body.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('rejects compressed bodies before decompression', async () => {
    await request(server)
      .post('/v1/admin/story-media')
      .set({ ...authHeaders(), 'Content-Encoding': 'gzip' })
      .send(gzipSync('{'))
      .expect(415)
    expect(upload).not.toHaveBeenCalled()
  })

  it('accepts the JSON envelope for a maximum-size 30 MiB video', async () => {
    const base64 = Buffer.alloc(30 * 1024 * 1024).toString('base64')
    await request(server)
      .post('/v1/admin/story-media')
      .set(authHeaders())
      .send({ name: 'video.mp4', mimeType: 'video/mp4', base64 })
      .expect(201)
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'video.mp4',
        mimeType: 'video/mp4',
        size: 30 * 1024 * 1024,
        purpose: 'story',
      }),
    )
  })

  it('counts actual chunked body bytes without a Content-Length header', async () => {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const { port } = server.address() as AddressInfo
      const client = httpRequest(
        {
          host: '127.0.0.1',
          port,
          path: '/v1/admin/story-media',
          method: 'POST',
          headers: { ...authHeaders(), 'Transfer-Encoding': 'chunked' },
        },
        (response) => {
          response.resume()
          response.once('end', () => resolve(response.statusCode))
        },
      )
      client.on('error', reject)
      const chunk = Buffer.alloc(1024 * 1024, 'a')
      for (let index = 0; index < 42; index++) client.write(chunk)
      client.end()
    })
    expect(status).toBe(413)
    expect(upload).not.toHaveBeenCalled()
  })

  it('keeps the default body limit for other endpoints', async () => {
    await request(server)
      .post('/v1/technical/echo')
      .set(authHeaders())
      .send({ value: 'a'.repeat(1_100_000) })
      .expect(413)
  })

  it('retains processing slots after complete-body clients disconnect until their handlers settle', async () => {
    let settle!: () => void
    let started!: () => void
    let count = 0
    const pending = new Promise<void>((resolve) => {
      settle = resolve
    })
    const bothStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    const processUpload = async (): Promise<{
      id: string
      mimeType: string
      size: number
      type: string
    }> => {
      count += 1
      if (count === 2) started()
      await pending
      return { id: 'media', mimeType: 'image/png', size: 8, type: 'image' }
    }
    upload
      .mockImplementationOnce(processUpload)
      .mockImplementationOnce(processUpload)
    const { port } = server.address() as AddressInfo
    const body = {
      name: 'photo.png',
      mimeType: 'image/png',
      base64: 'iVBORw0KGgo=',
    }
    const clients = Array.from({ length: 2 }, () => {
      const client = httpRequest({
        host: '127.0.0.1',
        port,
        path: '/v1/admin/story-media',
        method: 'POST',
        headers: authHeaders(),
      })
      client.on('error', () => undefined)
      client.end(JSON.stringify(body))
      return client
    })
    try {
      await bothStarted
      for (const client of clients) client.destroy()
      await setImmediate()
      await request(server)
        .post('/v1/admin/story-media')
        .set(authHeaders())
        .send(body)
        .expect(429)
    } finally {
      settle()
      for (const client of clients) client.destroy()
    }
    await setImmediate()
    await request(server)
      .post('/v1/admin/story-media')
      .set(authHeaders())
      .send(body)
      .expect(201)
  })

  it('protects raw chunks before reading and preserves binary bytes', async () => {
    const path =
      '/v1/admin/media-uploads/00000000-0000-4000-8000-000000000001/chunks/0'
    expect(
      (
        await headersOnly(path, {
          'Content-Type': 'application/octet-stream',
          'Transfer-Encoding': 'chunked',
        })
      ).status,
    ).toBe(401)
    expect(
      (
        await headersOnly(path, {
          ...authHeaders(),
          'Content-Type': 'application/octet-stream',
          'X-CSRF-Token': '',
          'Transfer-Encoding': 'chunked',
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await headersOnly(path, {
          ...authHeaders(),
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(1024 * 1024 + 1),
        })
      ).status,
    ).toBe(413)
    const bytes = Buffer.from([0, 255, 127, 128, 1, 2, 3, 4])
    await request(server)
      .post(path)
      .set({ ...authHeaders(), 'Content-Type': 'application/octet-stream' })
      .send(bytes)
      .expect(204)
    expect(chunk).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      0,
      bytes,
    )
  })

  it('returns the standard rate-limit problem and Retry-After before parsing', async () => {
    let last
    for (let index = 0; index < 61; index++) {
      last = await request(server)
        .post('/v1/admin/story-media')
        .set('Content-Type', 'application/json')
        .send('{')
      if (last.status === 429) break
    }
    expect(last?.status).toBe(429)
    expect(last?.body).toMatchObject({ code: 'RATE_LIMIT_EXCEEDED' })
    expect(Number(last?.headers['retry-after'])).toBeGreaterThan(0)
    expect(last?.headers['content-type']).toMatch(
      /^application\/problem\+json/u,
    )
    expect(upload).not.toHaveBeenCalled()
  })
})
