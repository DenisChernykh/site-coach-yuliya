import { monitorTransport } from './transport';
import {
  captureException,
  dedupeIntegration,
  globalHandlersIntegration,
  init,
} from '@sentry/browser';
import { sanitizeErrorEvent } from './privacy';

let initialized = false;
let events = 0;
let windowStart = 0;

export function initializeMonitoring(): void {
  if (initialized || typeof window === 'undefined') return;
  if (
    !import.meta.env.PROD ||
    import.meta.env.PUBLIC_DATA_SOURCE !== 'api' ||
    !import.meta.env.PUBLIC_MONITOR_URL ||
    !import.meta.env.PUBLIC_MONITOR_KEY
  )
    return;
  initialized = true;
  init({
    dsn: 'https://public@collector.invalid/1',
    transport: () =>
      monitorTransport(
        import.meta.env.PUBLIC_MONITOR_URL,
        import.meta.env.PUBLIC_MONITOR_KEY,
      ),
    sendClientReports: false,
    environment: 'production',
    release: import.meta.env.PUBLIC_MONITOR_RELEASE,
    defaultIntegrations: false,
    integrations: [globalHandlersIntegration(), dedupeIntegration()],
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
    transportOptions: { bufferSize: 20 },
    beforeSend(event) {
      if (Date.now() - windowStart > 60_000) {
        events = 0;
        windowStart = Date.now();
      }
      if (++events > 20) return null;
      event.tags = { ...event.tags, component: 'site' };
      return sanitizeErrorEvent(event);
    },
  });
}

export function reportApiFailure(
  error: Error,
  status?: number,
  requestId?: string,
): void {
  initializeMonitoring();
  if (!initialized) return;
  captureException(error, {
    tags: {
      event: 'browser_api_failure',
      ...(status === undefined ? {} : { status: String(status) }),
      ...(requestId ? { requestId } : {}),
    },
  });
}
