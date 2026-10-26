import assert from 'node:assert/strict'
import test from 'node:test'
import * as Sentry from '@sentry/node'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  startErrorReporting,
  reportBackendRecord,
  flushErrorReporting,
} = require('../dist/platform/monitoring/error-reporting.js')
const { PinoLogSink } = require('../dist/platform/logging/pino-log.sink.js')

test('compiled backend delivers sanitized correlated errors and skips expected failures', async () => {
  const events = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://monitor.example/v1/ingest/test')
    assert.equal(
      new Headers(options.headers).get('Authorization'),
      'Bearer test-server-key',
    )
    events.push(
      ...(JSON.parse(options.body).events ?? []).filter(
        (event) => event.level !== 'info',
      ),
    )
    return new Response('{}', { status: 202 })
  }
  startErrorReporting({
    environment: 'production',
    endpoint: 'https://monitor.example/v1/ingest/test',
    key: 'test-server-key',
    release: 'test-release',
  })
  const client = Sentry.getClient()
  assert.ok(client)
  const logger = new PinoLogSink(
    {
      environment: 'production',
      logging: {
        level: 'info',
        serviceName: 'test',
        serviceVersion: '0',
        serviceRevision: 'test-release',
      },
    },
    {
      destination: { write() {} },
      correlationFields: () => ({ requestId: 'request-123' }),
    },
  )
  const error = new Error('private-contact@example.com secret=private')
  logger.write({
    level: 'error',
    module: 'Test',
    event: 'http_unhandled_error',
    error,
  })
  logger.write({
    level: 'error',
    module: 'Test',
    event: 'http_request_completed',
  })
  logger.write({ level: 'warn', module: 'Test', event: 'auth_audit' })
  reportBackendRecord({
    level: 'fatal',
    module: 'Test',
    event: 'api_process_failed',
    error,
  })
  logger.write({
    level: 'error',
    module: 'CoachSite',
    event: 'telegram_delivery_failed',
    attributes: { reasonCode: 'TELEGRAM_HTTP_403' },
  })
  await flushErrorReporting()
  assert.equal(events.length, 2)
  assert.equal(events[0].tags.requestId, 'request-123')
  assert.equal(events[0].tags.component, 'backend')
  assert.equal(events[0].release, 'test-release')
  assert.ok(events[0].exception.values[0].stacktrace.frames.length)
  assert.equal(events[1].tags.reasonCode, 'TELEGRAM_HTTP_403')
  assert.ok(!JSON.stringify(events).includes('private'))
  await Sentry.close()
  globalThis.fetch = originalFetch
})
