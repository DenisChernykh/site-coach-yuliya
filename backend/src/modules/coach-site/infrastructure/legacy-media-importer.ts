import { createHash } from 'node:crypto'
import { mkdir, rename, writeFile, copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type {
  MediaPurpose,
  MediaUploadStorePort,
} from '../application/media-upload.port'
import type { DiskMediaFiles } from './disk-media-files'

export class LegacyMediaImporter {
  public constructor(
    private readonly database: PrismaClientProvider,
    private readonly uploads: MediaUploadStorePort,
    private readonly files: DiskMediaFiles,
  ) {}
  public async execute(): Promise<number> {
    const ids = await this.database.withClient(
      (c) =>
        c.$queryRaw<
          { id: string }[]
        >`SELECT id FROM story_media WHERE NOT EXISTS(SELECT 1 FROM media_uploads WHERE media_uploads.id=story_media.id) AND (data IS NOT NULL OR (mime_type LIKE 'image/%' AND path LIKE '%/original/%')) ORDER BY created_at LIMIT 20`,
    )
    const draft = await this.database.withClient((c) =>
      c.siteCmsDraft.findFirst({ select: { content: true } }),
    )
    const purposes = new Map<string, MediaPurpose>()
    const scan = (value: unknown, key = ''): void => {
      if (typeof value === 'string') {
        const match = /^\/v1\/story-media\/([a-f0-9-]{36})$/iu.exec(value)
        if (match)
          purposes.set(
            match[1]!,
            key === 'coverImage'
              ? 'article-cover'
              : key === 'ogImage' || key === 'defaultImage'
                ? 'social'
                : 'document',
          )
        if (key === 'mediaId' || key === 'coverMediaId')
          purposes.set(value, 'story')
      } else if (Array.isArray(value)) value.forEach((item) => scan(item, key))
      else if (value && typeof value === 'object')
        Object.entries(value).forEach(([k, v]) => scan(v, k))
    }
    scan(draft?.content)
    for (const { id } of ids) {
      const media = await this.database.withClient((c) =>
        c.storyMedia.findUniqueOrThrow({ where: { id } }),
      )
      const bytes =
        media.data ??
        (await import('node:fs/promises').then((fs) =>
          fs.readFile(
            join(
              this.files.root,
              'public',
              media.path!.slice('/media/'.length),
            ),
          ),
        ))
      if (!bytes) throw new Error('Missing legacy media')
      const digest = createHash('sha256').update(bytes).digest('hex')
      const directory = join(this.files.root, 'public', id, 'original')
      await mkdir(directory, { recursive: true })
      const extension =
        media.mimeType === 'image/jpeg' ? 'jpg' : media.mimeType.split('/')[1]!
      const file = `${digest}.${extension}`
      const target = join(directory, file)
      await writeFile(`${target}.tmp`, bytes)
      await rename(`${target}.tmp`, target)
      // The original URL retains identical bytes, including for already cached content.
      await this.database.withClient((c) =>
        c.storyMedia.update({
          where: { id },
          data: { path: `/media/${id}/original/${file}`, data: null },
        }),
      )
      if (media.mimeType.startsWith('image/')) {
        await mkdir(this.files.directory(id), { recursive: true, mode: 0o700 })
        await copyFile(target, this.files.source(id))
        await this.uploads.create({
          id,
          name: media.name,
          mimeType: media.mimeType,
          size: media.size,
          sha256: digest,
          purpose: purposes.get(id) ?? 'photo',
          contextKey: 'legacy-import',
        })
        await this.uploads.enqueue(id)
      }
    }
    return ids.length
  }
}
