import type { Prisma } from '@/generated/prisma/client'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import { AuthDependencyUnavailableError } from '../../public-contracts/auth-errors'
import type {
  SessionStorePort,
  StoredSessionRecord,
  IssueSessionInput,
  BrowserSessionSummary,
} from '../application/session-store.port'
import type { IssuedBrowserSession } from '../application/session-issuance.contract'
import type {
  SessionCryptoPort,
  RedisSessionStoreConfig,
} from './redis-session.store'
import { sessionRecordCodec } from './session-record.codec'

export class PostgresSessionStore implements SessionStorePort {
  public constructor(
    private readonly database: PrismaClientProvider,
    private readonly crypto: SessionCryptoPort,
    private readonly config: Omit<
      RedisSessionStoreConfig,
      'keyPrefix' | 'environment'
    >,
  ) {}
  public csrfToken(record: StoredSessionRecord): string {
    return this.crypto.hmac(
      this.config.csrfSecret,
      `${record.publicId}.${record.csrfSeed}`,
    )
  }
  private digest(rawToken: string): string {
    return this.crypto.hmac(this.config.sessionKeySecret, rawToken)
  }
  public async issue(input: IssueSessionInput): Promise<IssuedBrowserSession> {
    const rawToken = this.crypto.generateSessionToken()
    const record: StoredSessionRecord = {
      schema: 1,
      publicId: this.crypto.generatePublicId(),
      userId: input.userId,
      sessionGeneration: String(input.sessionGeneration),
      globalSessionEpoch: String(input.globalSessionEpoch),
      csrfSeed: this.crypto.generateCsrfSeed(),
      createdAtMs: input.nowMs,
      lastSeenAtMs: input.nowMs,
      absoluteExpiresAtMs: input.nowMs + this.config.absoluteTimeoutMs,
      deviceLabel: input.deviceLabel,
      networkFingerprint: input.networkFingerprint,
    }
    try {
      await this.database.withClient((c) =>
        c.browserSession.deleteMany({
          where: { expiresAt: { lte: new Date(input.nowMs) } },
        }),
      )
      await this.database.withClient((c) =>
        c.browserSession.create({
          data: {
            digest: this.digest(rawToken),
            publicId: record.publicId,
            userId: record.userId,
            payload: record as unknown as Prisma.InputJsonValue,
            expiresAt: new Date(
              Math.min(
                record.absoluteExpiresAtMs,
                input.nowMs + this.config.idleTimeoutMs,
              ),
            ),
          },
        }),
      )
    } catch {
      throw new AuthDependencyUnavailableError()
    }
    return {
      rawToken,
      publicId: record.publicId,
      csrfToken: this.csrfToken(record),
      absoluteExpiresAt: new Date(record.absoluteExpiresAtMs),
    }
  }
  public async readAndTouch(
    rawToken: string,
    nowMs: number,
  ): Promise<StoredSessionRecord | undefined> {
    try {
      const rows = await this.database.withClient(
        (c) => c.$queryRaw<{ payload: Prisma.JsonValue }[]>`
    UPDATE browser_sessions SET
    payload=CASE WHEN (payload->>'lastSeenAtMs')::bigint+${this.config.touchIntervalMs}<=${nowMs} THEN jsonb_set(payload,'{lastSeenAtMs}',to_jsonb(${nowMs}::bigint)) ELSE payload END,
    expires_at=CASE WHEN (payload->>'lastSeenAtMs')::bigint+${this.config.touchIntervalMs}<=${nowMs} THEN LEAST(to_timestamp((payload->>'absoluteExpiresAtMs')::double precision/1000),to_timestamp((${nowMs}::bigint+${this.config.idleTimeoutMs}::bigint)::double precision/1000)) ELSE expires_at END
    WHERE digest=${this.digest(rawToken)} AND expires_at>${new Date(nowMs)} AND (payload->>'absoluteExpiresAtMs')::bigint>${nowMs}
    RETURNING payload`,
      )
      if (!rows[0]) return undefined
      const decoded = sessionRecordCodec.decode(JSON.stringify(rows[0].payload))
      return decoded.ok ? decoded.value : undefined
    } catch {
      throw new AuthDependencyUnavailableError()
    }
  }
  public async list(
    userId: string,
    currentPublicId: string,
  ): Promise<readonly BrowserSessionSummary[]> {
    try {
      const rows = await this.database.withClient((c) =>
        c.browserSession.findMany({
          where: { userId, expiresAt: { gt: new Date() } },
        }),
      )
      return rows
        .flatMap((row) => {
          const decoded = sessionRecordCodec.decode(JSON.stringify(row.payload))
          if (!decoded.ok) return []
          const r = decoded.value
          return [
            {
              publicId: r.publicId,
              createdAt: new Date(r.createdAtMs),
              lastSeenAt: new Date(r.lastSeenAtMs),
              absoluteExpiresAt: new Date(r.absoluteExpiresAtMs),
              deviceLabel: r.deviceLabel,
              current: r.publicId === currentPublicId,
            },
          ]
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch {
      throw new AuthDependencyUnavailableError()
    }
  }
  public async revoke(userId: string, publicId: string): Promise<boolean> {
    try {
      return (
        (
          await this.database.withClient((c) =>
            c.browserSession.deleteMany({ where: { userId, publicId } }),
          )
        ).count > 0
      )
    } catch {
      throw new AuthDependencyUnavailableError()
    }
  }
  public async revokeAll(userId: string): Promise<number> {
    try {
      return (
        await this.database.withClient((c) =>
          c.browserSession.deleteMany({ where: { userId } }),
        )
      ).count
    } catch {
      throw new AuthDependencyUnavailableError()
    }
  }
}
