import type { SiteCmsPort } from './cms.port'
import type { CmsPageContent, CmsWorkspace } from '../domain/cms'
import type { SiteContentPort } from './content.port'
import type { StoryMediaService } from './story-media.service'
import type { HomePageDto } from '../domain/content'

export class SiteCmsService {
  public constructor(
    public readonly cms: SiteCmsPort,
    public readonly content: SiteContentPort,
    private readonly media: StoryMediaService,
  ) {}
  public get(): Promise<CmsWorkspace> {
    return this.cms.get()
  }
  public async save(
    revision: number,
    content: CmsPageContent,
  ): Promise<CmsWorkspace> {
    await this.media.validateStories(content.home.stories ?? [])
    return this.cms.save(revision, content)
  }
  public publish(revision: number): Promise<CmsWorkspace> {
    return this.cms.publish(revision)
  }
  public async updateHome(home: HomePageDto): Promise<HomePageDto> {
    await this.media.validateStories(home.stories ?? [])
    return this.content.updateHome(home)
  }
}
