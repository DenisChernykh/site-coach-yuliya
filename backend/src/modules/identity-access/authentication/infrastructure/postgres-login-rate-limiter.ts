import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import { PrismaWindowLimiter } from '@/platform/database/prisma-window-limiter'
import { AuthDependencyUnavailableError } from '../../public-contracts/auth-errors'
import type {
  LoginRateLimiterPort,
  LoginRateLimitInput,
  LoginRateLimitDecision,
} from '../application/login-rate-limiter.port'
import type {
  LoginRateLimitKeyDigestPort,
  RedisLoginRateLimiterConfig,
} from './redis-login-rate-limiter'

export class PostgresLoginRateLimiter implements LoginRateLimiterPort {
  private readonly limiter: PrismaWindowLimiter
  public constructor(
    database: PrismaClientProvider,
    private readonly crypto: LoginRateLimitKeyDigestPort,
    private readonly config: Omit<
      RedisLoginRateLimiterConfig,
      'keyPrefix' | 'environment'
    >,
  ) {
    this.limiter = new PrismaWindowLimiter(database)
  }
  public async consume(
    input: LoginRateLimitInput,
  ): Promise<LoginRateLimitDecision> {
    try {
      return await this.limiter.consume([
        {
          key: `login:ip:${this.crypto.hmac(this.config.hmacSecret, `ip:${input.ipAddress}`)}`,
          limit: this.config.ipLimit,
          windowMs: this.config.windowMs,
        },
        {
          key: `login:account:${this.crypto.hmac(this.config.hmacSecret, `account:${input.normalizedEmail}`)}`,
          limit: this.config.accountLimit,
          windowMs: this.config.windowMs,
        },
      ])
    } catch {
      throw new AuthDependencyUnavailableError()
    }
  }
}
