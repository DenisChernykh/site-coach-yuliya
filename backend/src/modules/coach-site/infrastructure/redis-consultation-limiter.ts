import { createHmac } from 'node:crypto'
import type { RedisCommandExecutorPort } from '@/platform/redis/redis-command.executor'
import { RedisScriptRunner } from '@/platform/redis/redis-script.runner'
import { DatabaseUnavailableError } from '@/platform/database/database.contracts'
import type { ConsultationRateLimitPort } from '../application/consultations.port'
import { ConsultationRateLimitError } from '../application/site-errors'

export class RedisConsultationLimiter implements ConsultationRateLimitPort {
  private readonly scripts: RedisScriptRunner
  public constructor(
    executor: RedisCommandExecutorPort,
    private readonly prefix: string,
    private readonly secret: Uint8Array,
  ) {
    this.scripts = new RedisScriptRunner(executor)
    this.scripts.register({
      name: 'coach-consultations-limit-v2',
      source: `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], 600000) end; return {n, redis.call('PTTL', KEYS[1])}`,
    })
  }

  public async consume(ip: string): Promise<void> {
    const digest = createHmac('sha256', this.secret).update(ip).digest('hex')
    let count: number
    let retryAfterMs: number
    try {
      const result = await this.scripts.run<[number, number]>(
        'coach-consultations-limit-v2',
        [`${this.prefix}:consultations:${digest}`],
        [],
      )
      ;[count, retryAfterMs] = result
      if (
        !Number.isSafeInteger(count) ||
        count < 1 ||
        !Number.isSafeInteger(retryAfterMs) ||
        retryAfterMs < 0 ||
        retryAfterMs > 600_000
      )
        throw new DatabaseUnavailableError()
    } catch {
      throw new DatabaseUnavailableError()
    }
    if (count > 5) throw new ConsultationRateLimitError(retryAfterMs)
  }
}
