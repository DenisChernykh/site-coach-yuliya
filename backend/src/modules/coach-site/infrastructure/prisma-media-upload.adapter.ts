import type { Prisma } from '@/generated/prisma/client'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type { TransactionPort } from '@/shared/application/transaction.port'
import { InvalidStoryMediaError } from '../application/site-errors'
import type {
  MediaUpload,
  MediaUploadInput,
  MediaUploadStorePort,
  MediaOutput,
} from '../application/media-upload.port'

export class PrismaMediaUploadAdapter implements MediaUploadStorePort {
  public constructor(
    private readonly database: PrismaClientProvider,
    private readonly transaction: TransactionPort,
  ) {}
  public async create(input: MediaUploadInput): Promise<MediaUpload> {
    return this.transaction.run(async () =>
      this.database.withClient(async (client) => {
        await client.$queryRaw`SELECT pg_advisory_xact_lock(8410271)::text`
        const existing = await this.get(input.id)
        if (existing) {
          if (
            existing.sha256 !== input.sha256 ||
            existing.size !== input.size ||
            existing.purpose !== input.purpose ||
            existing.mimeType !== input.mimeType ||
            existing.contextKey !== input.contextKey
          )
            throw new InvalidStoryMediaError()
          if (
            existing.status === 'FAILED' &&
            existing.error === 'UPLOAD_INCOMPLETE'
          ) {
            return (await client.mediaUpload.update({
              where: { id: input.id },
              data: { status: 'UPLOADING', error: null, createdAt: new Date() },
            })) as unknown as MediaUpload
          }
          return existing
        }
        const total = await client.mediaUpload.aggregate({
          _sum: { size: true },
        })
        // Admission includes originals plus headroom for generated variants on a small hosting disk.
        if ((total._sum.size ?? 0) + input.size > 1024 * 1024 * 1024)
          throw new InvalidStoryMediaError()
        const row = await client.mediaUpload.create({ data: input })
        return row as unknown as MediaUpload
      }),
    )
  }
  public async get(id: string): Promise<MediaUpload | undefined> {
    const row = await this.database.withClient((c) =>
      c.mediaUpload.findUnique({ where: { id } }),
    )
    return row ? (row as unknown as MediaUpload) : undefined
  }
  public async list(contextKey?: string): Promise<MediaUpload[]> {
    return (await this.database.withClient((c) =>
      c.mediaUpload.findMany({
        where: contextKey ? { contextKey } : {},
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    )) as unknown as MediaUpload[]
  }
  public async enqueue(id: string): Promise<void> {
    await this.database.withClient((c) =>
      c.mediaUpload.updateMany({
        where: { id, status: 'UPLOADING' },
        data: { status: 'QUEUED' },
      }),
    )
  }
  public async retry(id: string): Promise<void> {
    await this.database.withClient((c) =>
      c.mediaUpload.updateMany({
        where: { id, status: 'FAILED' },
        data: {
          status: 'QUEUED',
          attempts: 0,
          error: null,
          nextAttemptAt: new Date(),
        },
      }),
    )
  }
  public async acquire(token: string): Promise<boolean> {
    const changed = await this.database.withClient(
      (c) =>
        c.$executeRaw`UPDATE media_worker_lock SET token=${token}::uuid, expires_at=NOW()+INTERVAL '120 seconds' WHERE id=1 AND expires_at<NOW()`,
    )
    return changed === 1
  }
  public async release(token: string): Promise<void> {
    await this.database.withClient(
      (c) =>
        c.$executeRaw`UPDATE media_worker_lock SET token=NULL, expires_at=NOW() WHERE id=1 AND token=${token}::uuid`,
    )
  }
  public async claim(token: string): Promise<MediaUpload | undefined> {
    return this.transaction.run(async () =>
      this.database.withClient(async (c) => {
        const locked =
          await c.$executeRaw`UPDATE media_worker_lock SET expires_at=NOW()+INTERVAL '120 seconds' WHERE id=1 AND token=${token}::uuid AND expires_at>NOW()`
        if (!locked) return undefined
        await c.$executeRaw`UPDATE media_uploads SET status='FAILED', error='PROCESSING_FAILED', updated_at=NOW() WHERE status='PROCESSING' AND claimed_until<NOW() AND attempts>=3`
        const ids = await c.$queryRaw<
          { id: string }[]
        >`SELECT id FROM media_uploads WHERE attempts<3 AND ((status='QUEUED' AND next_attempt_at<=NOW()) OR (status='PROCESSING' AND claimed_until<NOW())) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`
        const id = ids[0]?.id
        if (!id) return undefined
        return (await c.mediaUpload.update({
          where: { id },
          data: {
            status: 'PROCESSING',
            attempts: { increment: 1 },
            claimToken: token,
            claimedUntil: new Date(Date.now() + 120_000),
          },
        })) as unknown as MediaUpload
      }),
    )
  }
  public async complete(
    id: string,
    token: string,
    output: MediaOutput,
  ): Promise<boolean> {
    return this.transaction.run(async () =>
      this.database.withClient(async (c) => {
        const result = await c.mediaUpload.updateMany({
          where: {
            id,
            status: 'PROCESSING',
            claimToken: token,
            claimedUntil: { gt: new Date() },
          },
          data: {
            status: 'READY',
            error: null,
            output: output as unknown as Prisma.InputJsonValue,
            claimToken: null,
            claimedUntil: null,
          },
        })
        if (!result.count) return false
        const upload = await this.get(id)
        await c.storyMedia.upsert({
          where: { id },
          create: {
            id,
            name: upload!.name,
            mimeType: output.mimeType,
            size: output.size,
            path: output.url,
            variants: output as unknown as Prisma.InputJsonValue,
          },
          update: { variants: output as unknown as Prisma.InputJsonValue },
        })
        return true
      }),
    )
  }
  public async fail(
    id: string,
    token: string,
    permanent: boolean,
  ): Promise<void> {
    await this.database.withClient(
      (c) =>
        c.$executeRaw`UPDATE media_uploads SET status=CASE WHEN ${permanent} OR attempts>=3 THEN 'FAILED' ELSE 'QUEUED' END, error=${permanent ? 'INVALID_MEDIA' : 'PROCESSING_FAILED'}, next_attempt_at=NOW()+INTERVAL '1 minute', claim_token=NULL, claimed_until=NULL, updated_at=NOW() WHERE id=${id}::uuid AND claim_token=${token}::uuid AND status='PROCESSING'`,
    )
  }
  public async cleanup(): Promise<void> {
    await this.database.withClient(
      (c) =>
        c.$executeRaw`UPDATE media_uploads SET status='FAILED', error='UPLOAD_INCOMPLETE', updated_at=NOW() WHERE status='UPLOADING' AND created_at<NOW()-INTERVAL '7 days'`,
    )
  }
}
