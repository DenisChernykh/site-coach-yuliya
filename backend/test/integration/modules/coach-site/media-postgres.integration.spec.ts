import { randomUUID, createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { startPostgresContainer } from '@test/integration/support/postgres-container'
import { buildPostgresCommandConfig } from '@/platform/config/runtime-environment'
import { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import { PrismaTransactionAdapter } from '@/platform/database/prisma-transaction.adapter'
import { PrismaTransactionContext } from '@/platform/database/prisma-transaction.context'
import { PrismaWindowLimiter } from '@/platform/database/prisma-window-limiter'
import { PrismaMediaUploadAdapter } from '@/modules/coach-site/infrastructure/prisma-media-upload.adapter'
import { DiskMediaFiles } from '@/modules/coach-site/infrastructure/disk-media-files'
import { SharpMediaProcessor } from '@/modules/coach-site/infrastructure/sharp-media-processor'
import {
  MediaUploadService,
  ProcessMediaUploads,
} from '@/modules/coach-site/application/media-upload.service'
import {
  MEDIA_CHUNK_BYTES,
  type MediaUploadInput,
} from '@/modules/coach-site/application/media-upload.port'
import { PostgresSessionStore } from '@/modules/identity-access/sessions/infrastructure/postgres-session.store'
import { NodeSessionCryptoAdapter } from '@/modules/identity-access/sessions/infrastructure/node-session-crypto.adapter'
import { LegacyMediaImporter } from '@/modules/coach-site/infrastructure/legacy-media-importer'

let container: StartedPostgreSqlContainer
let db: PrismaClientProvider
let store: PrismaMediaUploadAdapter
let files: DiskMediaFiles
let service: MediaUploadService
let directory: string
beforeAll(async () => {
  container = await startPostgresContainer()
  const migrated = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
    encoding: 'utf8',
  })
  if (migrated.status !== 0) throw new Error(migrated.stderr)
  const config = buildPostgresCommandConfig({
    NODE_ENV: 'test',
    DATABASE_URL: container.getConnectionUri(),
  })
  const context = new PrismaTransactionContext()
  db = new PrismaClientProvider(config, context)
  await db.connect(AbortSignal.timeout(5000))
  store = new PrismaMediaUploadAdapter(
    db,
    new PrismaTransactionAdapter(db, context, config),
  )
  directory = await mkdtemp(join(tmpdir(), 'coach-media-test-'))
  files = new DiskMediaFiles(directory)
  service = new MediaUploadService(store, files)
})
afterEach(async () => {
  await db.withClient((c) => c.mediaUpload.deleteMany())
  await db.withClient((c) => c.storyMedia.deleteMany())
  await db.withClient((c) => c.browserSession.deleteMany())
  await db.withClient((c) => c.rateLimitBucket.deleteMany())
  await db.withClient((c) =>
    c.mediaWorkerLock.update({
      where: { id: 1 },
      data: { token: null, expiresAt: new Date(0) },
    }),
  )
})
afterAll(async () => {
  await db?.close(AbortSignal.timeout(3000))
  await container?.stop()
  if (directory) await rm(directory, { recursive: true, force: true })
})
function input(
  bytes: Buffer,
  purpose: MediaUploadInput['purpose'] = 'photo',
): MediaUploadInput {
  return {
    id: randomUUID(),
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    purpose,
    contextKey: 'test:cover',
  }
}
async function upload(
  bytes: Buffer,
  purpose: MediaUploadInput['purpose'] = 'photo',
): Promise<MediaUploadInput> {
  const data = input(bytes, purpose)
  await service.create(data)
  for (let i = 0; i * MEDIA_CHUNK_BYTES < bytes.length; i++)
    await service.chunk(
      data.id,
      i,
      bytes.subarray(i * MEDIA_CHUNK_BYTES, (i + 1) * MEDIA_CHUNK_BYTES),
    )
  await service.finish(data.id)
  return data
}
it('resumes received binary chunks, rejects conflicting duplicates and verifies the full file hash', async () => {
  const bytes = Buffer.alloc(MEDIA_CHUNK_BYTES + 3, 1)
  const data = input(bytes)
  await service.create(data)
  await service.chunk(data.id, 0, bytes.subarray(0, MEDIA_CHUNK_BYTES))
  await expect(service.finish(data.id)).rejects.toThrow()
  expect((await service.get(data.id)).receivedChunks).toEqual([0])
  await expect(service.create(data)).resolves.toMatchObject({
    id: data.id,
    status: 'UPLOADING',
  })
  await service.chunk(data.id, 0, bytes.subarray(0, MEDIA_CHUNK_BYTES))
  await expect(
    service.chunk(data.id, 0, Buffer.alloc(MEDIA_CHUNK_BYTES, 2)),
  ).rejects.toThrow()
  await service.chunk(data.id, 1, bytes.subarray(MEDIA_CHUNK_BYTES))
  await expect(service.finish(data.id)).resolves.toMatchObject({
    status: 'QUEUED',
  })
  await expect(service.finish(data.id)).resolves.toMatchObject({
    status: 'QUEUED',
  })
  expect(
    await db.withClient((c) =>
      c.storyMedia.findUnique({ where: { id: data.id } }),
    ),
  ).toBeNull()
  const wrong = { ...input(bytes), sha256: '0'.repeat(64) }
  await service.create(wrong)
  for (let i = 0; i < 2; i++)
    await service.chunk(
      wrong.id,
      i,
      bytes.subarray(i * MEDIA_CHUNK_BYTES, (i + 1) * MEDIA_CHUNK_BYTES),
    )
  await expect(service.finish(wrong.id)).rejects.toThrow()
})
it('reopens an expired incomplete upload without losing received parts', async () => {
  const bytes = Buffer.alloc(32, 1)
  const data = input(bytes)
  await service.create(data)
  await service.chunk(data.id, 0, bytes)
  await db.withClient((c) =>
    c.mediaUpload.update({
      where: { id: data.id },
      data: { createdAt: new Date(Date.now() - 8 * 86400000) },
    }),
  )
  await store.cleanup()
  expect((await service.get(data.id)).error).toBe('UPLOAD_INCOMPLETE')
  await expect(service.create(data)).resolves.toMatchObject({
    status: 'UPLOADING',
    error: null,
  })
  expect((await service.get(data.id)).receivedChunks).toEqual([0])
  await expect(service.finish(data.id)).resolves.toMatchObject({
    status: 'QUEUED',
  })
})
it.each(['photo', 'article-cover', 'story', 'document', 'social'] as const)(
  'processes %s through the same durable queue and publishes only complete renditions',
  async (purpose) => {
    const bytes = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: '#829bc0' },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()
    const data = await upload(bytes, purpose)
    const runner = new ProcessMediaUploads(
      store,
      new SharpMediaProcessor(files),
    )
    await expect(runner.run(randomUUID())).resolves.toBe(1)
    const ready = await service.get(data.id)
    expect(ready.status).toBe('READY')
    const result = await sharp(
      await readFile(
        join(directory, 'public', ready.output!.url.slice('/media/'.length)),
      ),
    ).metadata()
    expect(result.format).toBe(purpose === 'social' ? 'jpeg' : 'webp')
    expect(result.orientation).toBeUndefined()
    expect(result.exif).toBeUndefined()
    expect(result.width).toBeLessThanOrEqual(
      purpose === 'story' ? 1080 : purpose === 'social' ? 1200 : 2560,
    )
    expect(result.height).toBeLessThanOrEqual(
      purpose === 'story' ? 1920 : purpose === 'social' ? 630 : 2560,
    )
    expect(ready.output!.mobileUrl).not.toBe(ready.output!.url)
    const persisted = await db.withClient((c) =>
      c.storyMedia.findUniqueOrThrow({ where: { id: data.id } }),
    )
    expect(persisted.data).toBeNull()
    expect(persisted.path).toBe(ready.output!.url)
  },
)
it('recovers a dead worker lease and fences its late completion', async () => {
  const data = await upload(
    await sharp({
      create: { width: 20, height: 10, channels: 3, background: 'red' },
    })
      .jpeg()
      .toBuffer(),
  )
  const stale = randomUUID(),
    current = randomUUID()
  expect(await store.acquire(stale)).toBe(true)
  expect(await store.acquire(current)).toBe(false)
  expect((await store.claim(stale))?.id).toBe(data.id)
  await db.withClient((c) =>
    c.mediaWorkerLock.update({
      where: { id: 1 },
      data: { expiresAt: new Date(0) },
    }),
  )
  await db.withClient((c) =>
    c.mediaUpload.update({
      where: { id: data.id },
      data: { claimedUntil: new Date(0) },
    }),
  )
  expect(await store.acquire(current)).toBe(true)
  const claimed = await store.claim(current)
  expect(claimed?.attempts).toBe(2)
  const output = await new SharpMediaProcessor(files).process(claimed!, current)
  expect(await store.complete(data.id, stale, output)).toBe(false)
  expect(await store.complete(data.id, current, output)).toBe(true)
  await store.release(stale)
  expect(await store.acquire(randomUUID())).toBe(false)
  await store.release(current)
})
it('keeps a failed job recoverable, limits attempts, and rejects invalid media permanently', async () => {
  const data = await upload(Buffer.from('invalid jpeg'))
  await new ProcessMediaUploads(store, new SharpMediaProcessor(files)).run(
    randomUUID(),
  )
  expect(await service.get(data.id)).toMatchObject({
    status: 'FAILED',
    error: 'INVALID_MEDIA',
    attempts: 1,
  })
  await expect(service.retry(data.id)).rejects.toThrow()
  const valid = await upload(
    await sharp({
      create: { width: 20, height: 10, channels: 3, background: 'red' },
    })
      .jpeg()
      .toBuffer(),
  )
  const failure = { process: () => Promise.reject(new Error('disk failure')) }
  for (let i = 0; i < 3; i++) {
    await db.withClient((c) =>
      c.mediaUpload.update({
        where: { id: valid.id },
        data: { nextAttemptAt: new Date(0) },
      }),
    )
    await new ProcessMediaUploads(store, failure).run(randomUUID())
  }
  expect(await service.get(valid.id)).toMatchObject({
    status: 'FAILED',
    attempts: 3,
  })
  await service.retry(valid.id)
  await new ProcessMediaUploads(store, new SharpMediaProcessor(files)).run(
    randomUUID(),
  )
  expect((await service.get(valid.id)).status).toBe('READY')
})
it('moves legacy bytes to disk without changing their original URL content', async () => {
  const bytes = await sharp({
    create: { width: 40, height: 20, channels: 3, background: 'blue' },
  })
    .jpeg()
    .toBuffer()
  const row = await db.withClient((c) =>
    c.storyMedia.create({
      data: {
        name: 'old.jpg',
        mimeType: 'image/jpeg',
        size: bytes.length,
        data: bytes,
      },
    }),
  )
  expect(await new LegacyMediaImporter(db, store, files).execute()).toBe(1)
  await new ProcessMediaUploads(store, new SharpMediaProcessor(files)).run(
    randomUUID(),
  )
  const migrated = await db.withClient((c) =>
    c.storyMedia.findUniqueOrThrow({ where: { id: row.id } }),
  )
  expect(migrated.data).toBeNull()
  expect(
    await readFile(
      join(directory, 'public', migrated.path!.slice('/media/'.length)),
    ),
  ).toEqual(bytes)
  expect(migrated.variants).toHaveProperty('mobileUrl')
})
it('stores opaque sessions in PostgreSQL with idle/absolute expiry, CSRF and owner-scoped revocation', async () => {
  const crypto = new NodeSessionCryptoAdapter()
  const sessions = new PostgresSessionStore(db, crypto, {
    sessionKeySecret: Buffer.alloc(32, 1),
    csrfSecret: Buffer.alloc(32, 2),
    idleTimeoutMs: 1000,
    absoluteTimeoutMs: 3000,
    touchIntervalMs: 100,
  })
  const now = Date.now(),
    userId = randomUUID()
  const issued = await sessions.issue({
    userId,
    sessionGeneration: 2n,
    globalSessionEpoch: 3n,
    nowMs: now,
    deviceLabel: 'test',
    networkFingerprint: 'test',
  })
  const records = await db.withClient((c) => c.browserSession.findMany())
  expect(JSON.stringify(records)).not.toContain(issued.rawToken)
  const record = await sessions.readAndTouch(issued.rawToken, now + 500)
  expect(record?.sessionGeneration).toBe('2')
  expect(sessions.csrfToken(record!)).toBe(issued.csrfToken)
  expect(
    await sessions.readAndTouch(issued.rawToken, now + 1600),
  ).toBeUndefined()
  const another = await sessions.issue({
    userId,
    sessionGeneration: 2n,
    globalSessionEpoch: 3n,
    nowMs: now,
    deviceLabel: 'test',
    networkFingerprint: 'test',
  })
  expect(await sessions.revoke(randomUUID(), another.publicId)).toBe(false)
  expect(await sessions.revoke(userId, another.publicId)).toBe(true)
  expect(await sessions.readAndTouch(another.rawToken, now + 1)).toBeUndefined()
})
it('counts concurrent rate-limit requests atomically without Redis and resets expired buckets', async () => {
  const limiter = new PrismaWindowLimiter(db)
  const bucket = { key: 'test:ip', limit: 5, windowMs: 60000 }
  const results = await Promise.all(
    Array.from({ length: 10 }, () => limiter.consume([bucket])),
  )
  expect(results.filter((r) => r.allowed)).toHaveLength(5)
  expect(results.filter((r) => !r.allowed)).toHaveLength(5)
  await db.withClient((c) =>
    c.rateLimitBucket.updateMany({ data: { expiresAt: new Date(0) } }),
  )
  expect(await limiter.consume([bucket])).toEqual({ allowed: true })
})
