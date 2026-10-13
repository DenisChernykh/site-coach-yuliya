import type { SiteCmsPort } from './cms.port'
import type { CmsPageContent, CmsWorkspace } from '../domain/cms'
import type { SiteContentPort } from './content.port'

export class SiteCmsService {
  public constructor(
    public readonly cms: SiteCmsPort,
    public readonly content: SiteContentPort,
  ) {}
  public get(): Promise<CmsWorkspace> {
    return this.cms.get()
  }
  public save(
    revision: number,
    content: CmsPageContent,
  ): Promise<CmsWorkspace> {
    return this.cms.save(revision, content)
  }
  public publish(revision: number): Promise<CmsWorkspace> {
    return this.cms.publish(revision)
  }
}
