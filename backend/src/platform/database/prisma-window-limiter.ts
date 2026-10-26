import { Prisma } from '@/generated/prisma/client'
import type { PrismaClientProvider } from './prisma-client.provider'

export class PrismaWindowLimiter {
  public constructor(private readonly database: PrismaClientProvider) {}
  public async consume(
    buckets: readonly { key: string; limit: number; windowMs: number }[],
  ): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
    const sorted = [...buckets].sort((a, b) => a.key.localeCompare(b.key))
    if (
      !sorted.length ||
      sorted.some((b) => b.limit < 1 || b.windowMs < 1 || b.key.length > 160)
    )
      throw new Error('Invalid rate limit')
    const rows = await this.database.withClient((c) =>
      c.$queryRaw<
        { key: string; count: number; retryAfterMs: number }[]
      >(Prisma.sql`
   INSERT INTO rate_limit_buckets (key,count,expires_at) VALUES ${Prisma.join(sorted.map((b) => Prisma.sql`(${b.key},1,NOW()+${b.windowMs}*INTERVAL '1 millisecond')`))}
   ON CONFLICT (key) DO UPDATE SET count=CASE WHEN rate_limit_buckets.expires_at<=NOW() THEN 1 ELSE LEAST(rate_limit_buckets.count+1,1000000) END,
   expires_at=CASE WHEN rate_limit_buckets.expires_at<=NOW() THEN EXCLUDED.expires_at ELSE rate_limit_buckets.expires_at END
   RETURNING key,count, GREATEST(1,CEIL(EXTRACT(EPOCH FROM (expires_at-NOW()))*1000))::int AS "retryAfterMs"`),
    )
    await this.database.withClient(
      (c) =>
        c.$executeRaw`DELETE FROM rate_limit_buckets WHERE key IN (SELECT key FROM rate_limit_buckets WHERE expires_at<NOW() LIMIT 100)`,
    )
    const blocked = rows.filter(
      (row) => row.count > sorted.find((b) => b.key === row.key)!.limit,
    )
    return blocked.length
      ? {
          allowed: false,
          retryAfterMs: Math.max(...blocked.map((row) => row.retryAfterMs)),
        }
      : { allowed: true }
  }
}
