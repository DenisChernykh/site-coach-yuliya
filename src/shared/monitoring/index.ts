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
    !import.meta.env.PUBLIC_SENTRY_DSN
  )
    return;
  initialized = true;
  init({
    dsn: import.meta.env.PUBLIC_SENTRY_DSN,
    environment: 'production',
    release: import.meta.env.PUBLIC_SENTRY_RELEASE,
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
