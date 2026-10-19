import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import { Prisma } from '@/generated/prisma/client'
import type {
  StoryMedia,
  StoryMediaPort,
} from '../application/story-media.port'

const metadata = { id: true, mimeType: true, size: true } as const

export class PrismaStoryMediaAdapter implements StoryMediaPort {
  public constructor(private readonly database: PrismaClientProvider) {}
  public create(input: {
    name: string
    mimeType: string
    data: Uint8Array
  }): Promise<StoryMedia> {
    return this.database.withClient((client) =>
      client.storyMedia.create({
        data: {
          ...input,
          data: Uint8Array.from(input.data),
          size: input.data.length,
        },
        select: metadata,
      }),
    )
  }
  public async find(id: string): Promise<StoryMedia | undefined> {
    return (
      (await this.database.withClient((client) =>
        client.storyMedia.findUnique({ where: { id }, select: metadata }),
      )) ?? undefined
    )
  }
  public async read(
    id: string,
    start: number,
    length: number,
  ): Promise<Uint8Array> {
    const rows = await this.database.withClient((client) =>
      client.$queryRaw<{ data: Uint8Array }[]>(
        Prisma.sql`SELECT substring(data from ${start + 1}::int for ${length}::int) AS data FROM story_media WHERE id = ${id}::uuid`,
      ),
    )
    return rows[0]?.data ?? new Uint8Array()
  }
}
