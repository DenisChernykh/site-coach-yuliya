import { createHmac } from 'node:crypto'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import { PrismaWindowLimiter } from '@/platform/database/prisma-window-limiter'
import type { ConsultationRateLimitPort } from '../application/consultations.port'
import { ConsultationRateLimitError } from '../application/site-errors'

export class PostgresConsultationLimiter implements ConsultationRateLimitPort {
  private readonly limiter: PrismaWindowLimiter
  public constructor(
    database: PrismaClientProvider,
    private readonly secret: Uint8Array,
  ) {
    this.limiter = new PrismaWindowLimiter(database)
  }
  public async consume(ip: string): Promise<void> {
    const digest = createHmac('sha256', this.secret).update(ip).digest('hex')
    const result = await this.limiter.consume([
      { key: `consultations:${digest}`, limit: 5, windowMs: 600_000 },
    ])
    if (!result.allowed)
      throw new ConsultationRateLimitError(result.retryAfterMs)
  }
}
