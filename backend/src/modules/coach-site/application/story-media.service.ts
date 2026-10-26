import type { StoryGroup } from '../domain/stories'
import type { StoryMedia, StoryMediaPort } from './story-media.port'
import type { ArticleCoverOptimizerPort } from './article-cover-optimizer.port'
import { InvalidStoryMediaError, SiteRecordNotFoundError } from './site-errors'

export class StoryMediaService {
  public constructor(
    private readonly media: StoryMediaPort,
    private readonly covers: ArticleCoverOptimizerPort,
  ) {}

  public async upload(input: {
    name: string
    mimeType: string
    base64: string
    purpose?: 'article-cover'
  }): Promise<StoryMedia & { type: 'image' | 'video' }> {
    const data = Buffer.from(input.base64, 'base64')
    const image = input.mimeType.startsWith('image/')
    if (
      !data.length ||
      data.length > (image ? 8 : 30) * 1024 * 1024 ||
      data.toString('base64') !== input.base64 ||
      !this.matches(data, input.mimeType)
    )
      throw new InvalidStoryMediaError()
    const cover = input.purpose === 'article-cover'
    if (cover && !image) throw new InvalidStoryMediaError()
    const stored = cover ? await this.covers.optimize(data) : data
    const result = await this.media.create({
      name: cover
        ? input.name.replace(/\.[^.]+$/u, '').slice(0, 195) + '.webp'
        : input.name,
      mimeType: cover ? 'image/webp' : input.mimeType,
      data: stored,
    })
    return { ...result, type: image ? 'image' : 'video' }
  }

  private matches(data: Buffer, mime: string): boolean {
    if (mime === 'image/jpeg')
      return data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    if (mime === 'image/png')
      return data
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    if (mime === 'image/webp')
      return (
        data.toString('ascii', 0, 4) === 'RIFF' &&
        data.toString('ascii', 8, 12) === 'WEBP'
      )
    if (mime === 'video/mp4') return data.toString('ascii', 4, 8) === 'ftyp'
    if (mime === 'video/webm')
      return data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    return false
  }

  public async validateStories(stories: readonly StoryGroup[]): Promise<void> {
    const references = new Map<string, 'image' | 'video'>()
    const reference = (id: string, type: 'image' | 'video'): void => {
      const previous = references.get(id)
      if (previous && previous !== type) throw new InvalidStoryMediaError()
      references.set(id, type)
    }
    for (const story of stories) {
      reference(story.coverMediaId, 'image')
      for (const slide of story.slides) {
        reference(slide.mediaId, slide.type)
      }
    }
    for (const [id, type] of references) {
      const media = await this.media.find(id)
      if (!media || !media.mimeType.startsWith(type + '/'))
        throw new InvalidStoryMediaError()
    }
  }

  public async get(id: string): Promise<StoryMedia> {
    const media = await this.media.find(id)
    if (!media) throw new SiteRecordNotFoundError()
    return media
  }

  public read(id: string, start: number, length: number): Promise<Uint8Array> {
    return this.media.read(id, start, length)
  }
}
