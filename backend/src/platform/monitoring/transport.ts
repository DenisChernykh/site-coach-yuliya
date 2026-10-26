import type { init } from '@sentry/node'
type Transport = ReturnType<
  NonNullable<NonNullable<Parameters<typeof init>[0]>['transport']>
>
type Envelope = Parameters<Transport['send']>[0]

export function monitorTransport(
  endpoint: string,
  key: string,
  server = false,
  fetcher: typeof fetch = fetch,
): Transport {
  const pending = new Set<Promise<{ statusCode: number }>>()
  return {
    send(envelope: Envelope) {
      if (pending.size >= 20) return Promise.resolve({ statusCode: 429 })
      const events = envelope[1]
        .filter(([header]) => header.type === 'event')
        .map(([, payload]) => payload)
        .slice(0, 4)
      if (!events.length) return Promise.resolve({ statusCode: 204 })
      const body = JSON.stringify({ events })
      if (new TextEncoder().encode(body).length > 24000)
        return Promise.resolve({ statusCode: 413 })
      const task = (async () => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const response = await fetcher(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(server
                  ? { Authorization: `Bearer ${key}` }
                  : { 'X-Monitor-Key': key }),
              },
              body,
              credentials: 'omit',
              redirect: 'error',
              signal: AbortSignal.timeout(2000),
              keepalive: !server,
            })
            if (response.status < 500) return { statusCode: response.status }
          } catch {
            // A failed collector must never break an application operation.
          }
        }
        return { statusCode: 503 }
      })()
      pending.add(task)
      void task.finally(() => pending.delete(task))
      return task
    },
    async flush(timeout = 2000) {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        return await Promise.race([
          Promise.all([...pending]).then((results) =>
            results.every((result) => result.statusCode < 300),
          ),
          new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(false), timeout)
          }),
        ])
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
