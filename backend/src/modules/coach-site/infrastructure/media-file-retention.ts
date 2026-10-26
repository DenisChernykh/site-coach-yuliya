import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'

export async function pruneMediaStaging(
  database: PrismaClientProvider,
  root: string,
): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 86_400_000)
  const ready = await database.withClient((c) =>
    c.mediaUpload.findMany({
      where: { status: 'READY', updatedAt: { lt: cutoff } },
      select: { id: true },
      take: 1000,
    }),
  )
  for (const { id } of ready)
    await rm(join(root, 'private', id), { recursive: true, force: true })
  // Remove unpublished attempts after a grace period; never delete current output or legacy originals.
  for (const id of await readdir(join(root, 'public')).catch(() => [])) {
    if (!/^[a-f0-9-]{36}$/iu.test(id)) continue
    const media = await database.withClient((c) =>
      c.storyMedia.findUnique({
        where: { id },
        select: { path: true, variants: true },
      }),
    )
    const retained = JSON.stringify(media)
    for (const attempt of await readdir(join(root, 'public', id))) {
      if (
        attempt === 'original' ||
        !/^[a-f0-9-]{36}$/iu.test(attempt) ||
        retained.includes(`/${attempt}/`)
      )
        continue
      const path = join(root, 'public', id, attempt)
      if ((await stat(path)).mtime < cutoff)
        await rm(path, { recursive: true, force: true })
    }
  }
}
