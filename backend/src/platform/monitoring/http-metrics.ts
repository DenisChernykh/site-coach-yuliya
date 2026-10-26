import { randomUUID } from 'node:crypto'
import type { StructuredLogRecord } from '@/platform/logging/logging.contracts'

export class HttpMetricBuffer {
  private readonly windows = new Map<
    number,
    {
      minute: number
      instance: string
      requests: number
      errors: number
      duration_sum: number
      buckets: number[]
    }
  >()
  private readonly instance = randomUUID()
  private flushing = false
  public constructor(
    private readonly endpoint: string,
    private readonly key: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  public record(
    attributes: StructuredLogRecord['attributes'],
    at = Date.now(),
  ): void {
    const duration = attributes?.['durationMs']
    const status = attributes?.['status']
    if (
      typeof duration !== 'number' ||
      !Number.isFinite(duration) ||
      duration < 0 ||
      typeof status !== 'number'
    )
      return
    const minute = Math.floor(at / 60000) * 60
    let window = this.windows.get(minute)
    if (!window) {
      window = {
        minute,
        instance: this.instance,
        requests: 0,
        errors: 0,
        duration_sum: 0,
        buckets: [0, 0, 0, 0, 0, 0],
      }
      this.windows.set(minute, window)
    }
    window.requests += 1
    window.errors += status >= 500 ? 1 : 0
    window.duration_sum += duration
    const bucket = [100, 300, 1000, 3000, 10000].findIndex(
      (limit) => duration <= limit,
    )
    window.buckets[bucket < 0 ? 5 : bucket]! += 1
    // Keep a bounded retry window during collector outages.
    while (this.windows.size > 30)
      this.windows.delete(this.windows.keys().next().value!)
  }

  public async flush(includeCurrent = false, at = Date.now()): Promise<void> {
    if (this.flushing) return
    this.flushing = true
    try {
      const current = Math.floor(at / 60000) * 60
      const ready = [...this.windows.values()]
        .filter((window) => includeCurrent || window.minute < current)
        .slice(0, 2)
      await Promise.all(
        ready.map(async (metrics) => {
          try {
            const response = await this.fetcher(this.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.key}`,
              },
              body: JSON.stringify({ metrics }),
              redirect: 'error',
              signal: AbortSignal.timeout(2000),
            })
            if (response.ok || response.status === 400)
              this.windows.delete(metrics.minute)
          } catch {
            /* Retry completed windows on the next minute. */
          }
        }),
      )
    } finally {
      this.flushing = false
    }
  }
}

let metrics: HttpMetricBuffer | undefined
export function startHttpMetrics(endpoint: string, key: string): void {
  if (metrics) return
  metrics = new HttpMetricBuffer(endpoint, key)
  setInterval(() => {
    void metrics?.flush()
  }, 60000).unref()
}
export function recordHttpMetrics(
  attributes: StructuredLogRecord['attributes'],
): void {
  metrics?.record(attributes)
}
export async function flushHttpMetrics(includeCurrent = false): Promise<void> {
  await metrics?.flush(includeCurrent)
}
