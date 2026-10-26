import type { StoryGroup } from '../domain/stories'
import type { StoryMedia, StoryMediaPort } from './story-media.port'
import { InvalidStoryMediaError, SiteRecordNotFoundError } from './site-errors'

export class StoryMediaService {
  public constructor(private readonly media: StoryMediaPort) {}

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
