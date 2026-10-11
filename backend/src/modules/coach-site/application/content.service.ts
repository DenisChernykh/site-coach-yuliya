import type { ArticleDto } from '../domain/content'
import type { SiteContentPort } from './content.port'
import { SiteRecordNotFoundError } from './site-errors'

export class SiteContentService {
  public constructor(public readonly content: SiteContentPort) {}

  public async getArticle(slug: string): Promise<ArticleDto> {
    const article = await this.content.findPublishedArticle(slug)
    if (article === undefined) throw new SiteRecordNotFoundError()
    return article
  }
}
