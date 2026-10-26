import type { ErrorEvent } from '@sentry/browser'

const safeName = /^[A-Za-z][A-Za-z0-9_.-]{0,100}$/
const safeTag = /^[A-Za-z0-9_.:/{}-]{1,160}$/

function sourceFilename(filename: string | undefined): string | undefined {
  if (!filename) return undefined
  try {
    const url = new URL(filename)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    return url.origin + url.pathname
  } catch {
    return filename.split(/[?#]/, 1)[0]?.slice(0, 500)
  }
}

export function sanitizeErrorEvent(event: ErrorEvent): ErrorEvent {
  // Never copy request data, user context, breadcrumbs, locals or arbitrary messages.
  const result: ErrorEvent = {
    type: undefined,
    level: event.level ?? 'error',
    platform: event.platform ?? 'javascript',
  }
  if (event.event_id) result.event_id = event.event_id
  if (event.timestamp) result.timestamp = event.timestamp
  if (event.release) result.release = event.release
  if (event.environment) result.environment = event.environment
  if (event.debug_meta?.images) {
    result.debug_meta = {
      images: event.debug_meta.images.flatMap((item) => {
        const codeFile = sourceFilename(item.code_file)
        return item.type === 'sourcemap' &&
          codeFile &&
          /^[0-9a-f-]{36}$/i.test(item.debug_id)
          ? [
              {
                type: 'sourcemap' as const,
                code_file: codeFile,
                debug_id: item.debug_id,
              },
            ]
          : []
      }),
    }
  }
  result.tags = Object.fromEntries(
    Object.entries(event.tags ?? {}).filter(
      ([key, value]) =>
        [
          'component',
          'event',
          'module',
          'requestId',
          'status',
          'reasonCode',
        ].includes(key) &&
        typeof value === 'string' &&
        safeTag.test(value),
    ),
  )
  if (event.exception?.values) {
    result.exception = {
      values: event.exception.values.slice(0, 2).map((exception) => {
        const type = safeName.test(exception.type ?? '')
          ? exception.type!
          : 'Error'
        return {
          type,
          value: type,
          ...(exception.stacktrace
            ? {
                stacktrace: {
                  frames: (exception.stacktrace.frames ?? [])
                    .slice(-12)
                    .map((frame) => ({
                      ...(sourceFilename(frame.filename)
                        ? { filename: sourceFilename(frame.filename)! }
                        : {}),
                      ...(typeof frame.lineno === 'number'
                        ? { lineno: frame.lineno }
                        : {}),
                      ...(typeof frame.colno === 'number'
                        ? { colno: frame.colno }
                        : {}),
                      ...(typeof frame.in_app === 'boolean'
                        ? { in_app: frame.in_app }
                        : {}),
                      ...(frame.function &&
                      /^[\w.$<> /-]{1,160}$/.test(frame.function)
                        ? { function: frame.function }
                        : {}),
                    })),
                },
              }
            : {}),
        }
      }),
    }
  } else {
    result.message =
      typeof result.tags.event === 'string'
        ? result.tags.event
        : 'Application error'
  }
  if (event.fingerprint?.every((part) => safeTag.test(part))) {
    result.fingerprint = event.fingerprint.slice(0, 5)
  }
  return result
}
