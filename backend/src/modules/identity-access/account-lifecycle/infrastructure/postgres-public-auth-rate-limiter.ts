import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import { PrismaWindowLimiter } from '@/platform/database/prisma-window-limiter'
import { AuthDependencyUnavailableError } from '../../public-contracts/auth-errors'
import type {
  PublicAuthOperation,
  PublicAuthRateLimiterPort,
} from '../application/public-auth-rate-limiter.port'
import type {
  PublicAccountRateLimitKeyDigestPort,
  RedisPublicAuthRateLimiterConfig,
} from './redis-public-auth-rate-limiter'

export class PostgresPublicAuthRateLimiter implements PublicAuthRateLimiterPort {
  private readonly limiter: PrismaWindowLimiter
  public constructor(
    database: PrismaClientProvider,
    private readonly crypto: PublicAccountRateLimitKeyDigestPort,
    private readonly config: Omit<
      RedisPublicAuthRateLimiterConfig,
      'keyPrefix' | 'environment'
    >,
  ) {
    this.limiter = new PrismaWindowLimiter(database)
  }
  public async consume(input: {
    operation: PublicAuthOperation
    ipAddress: string
    normalizedEmail: string
  }): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
    const config = this.config
    const register = input.operation === 'register'
    const resend = input.operation === 'email-verification-resend'
    const account = this.crypto.hmac(
      config.hmacSecret,
      `account:${input.normalizedEmail}`,
    )
    const prefix = `public:${input.operation}`
    const buckets = [
      {
        key: `${prefix}:ip:${this.crypto.hmac(config.hmacSecret, `ip:${input.ipAddress}`)}`,
        limit: register
          ? config.registrationIpLimit
          : resend
            ? config.resendIpLimit
            : config.resetRequestIpLimit,
        windowMs: config.requestWindowMs,
      },
      {
        key: `${prefix}:account:${account}`,
        limit: register
          ? config.registrationAccountLimit
          : resend
            ? config.resendAccountLimit
            : config.resetRequestAccountLimit,
        windowMs: config.requestWindowMs,
      },
    ]
    if (!register)
      buckets.push({
        key: `${prefix}:cooldown:${account}`,
        limit: 1,
        windowMs: config.resendCooldownMs,
      })
    try {
      return await this.limiter.consume(buckets)
    } catch {
      throw new AuthDependencyUnavailableError()
    }
  }
}
