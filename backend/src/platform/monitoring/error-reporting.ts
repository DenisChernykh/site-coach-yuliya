import { monitorTransport } from './transport'
import {
  startHttpMetrics,
  recordHttpMetrics,
  flushHttpMetrics,
} from './http-metrics'
import * as Sentry from '@sentry/node'
import type { StructuredLogRecord } from '@/platform/logging/logging.contracts'
import { sanitizeErrorEvent } from './privacy'
import type { ErrorReportingConfig } from '@/platform/config/error-reporting-config'

let initialized = false
let collectorOrigin: string | undefined
let events = 0
let windowStart = 0
const reportedErrors = new WeakSet<object>()

export function startErrorReporting(input: ErrorReportingConfig): void {
  if (
    initialized ||
    input.environment !== 'production' ||
    !input.endpoint ||
    !input.key
  )
    return
  // Validate without printing the DSN. Monitoring failure must not expose configuration.
  const endpoint = new URL(input.endpoint)
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error('Invalid MONITOR_URL')
  }
  collectorOrigin = endpoint.origin
  startHttpMetrics(input.endpoint, input.key)
  Sentry.init({
    dsn: 'https://public@collector.invalid/1',
    transport: () => monitorTransport(input.endpoint!, input.key!, true),
    sendClientReports: false,
    environment: 'production',
    ...(input.release ? { release: input.release } : {}),
    defaultIntegrations: false,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration({ mode: 'strict' }),
    ],
    enableOpenTelemetrySetup: false,
    enableRuntimeChannelInjection: false,
    includeServerName: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    tracesSampleRate: 0,
    beforeSendLog: () => null,
    shutdownTimeout: 2000,
    transportOptions: { bufferSize: 50 },
    beforeSend(event) {
      if (Date.now() - windowStart > 60_000) {
        events = 0
        windowStart = Date.now()
      }
      if (++events > 60) return null
      event.tags = { ...event.tags, component: 'backend' }
      return sanitizeErrorEvent(event)
    },
  })
  initialized = true
  Sentry.captureMessage('backend_started', {
    level: 'info',
    tags: {
      component: 'backend',
      event: 'backend_started',
      module: 'Bootstrap',
    },
  })
}

export function reportBackendRecord(record: StructuredLogRecord): void {
  if (!initialized) return
  if (record.event === 'http_request_completed') {
    recordHttpMetrics(record.attributes)
    return
  }
  if (!['error', 'fatal', 'warn'].includes(record.level)) return
  // A 5xx access record and its exception are the same failure. Security denials
  // are expected outcomes and must not exhaust the error quota.
  if (
    record.event === 'http_request_completed' ||
    record.event === 'auth_audit'
  )
    return
  if (record.level === 'warn' && !record.event.endsWith('_failed')) return
  if (record.error instanceof Error) {
    if (reportedErrors.has(record.error)) return
    reportedErrors.add(record.error)
  }
  try {
    const context = {
      level:
        record.level === 'warn'
          ? ('warning' as const)
          : record.level === 'fatal'
            ? ('fatal' as const)
            : ('error' as const),
      tags: {
        event: record.event,
        module: record.module,
        ...(record.correlation?.requestId
          ? { requestId: record.correlation.requestId }
          : {}),
        ...(typeof record.attributes?.reasonCode === 'string'
          ? { reasonCode: record.attributes.reasonCode }
          : {}),
      },
    }
    if (record.error !== undefined)
      Sentry.captureException(record.error, context)
    else
      Sentry.captureMessage(record.event, {
        ...context,
        fingerprint: [
          record.module,
          record.event,
          String(record.attributes?.reasonCode ?? 'failure'),
        ],
      })
  } catch {
    // Reporting is best effort and cannot change an application result.
  }
}

export async function flushErrorReporting(): Promise<void> {
  if (initialized)
    await Promise.all([
      Sentry.flush(2000).catch(() => false),
      flushHttpMetrics(true),
    ])
}

export function errorReportingOrigin(): string | undefined {
  return collectorOrigin
}
