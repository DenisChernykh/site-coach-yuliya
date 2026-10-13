import { randomUUID } from 'node:crypto'
import type {
  SiteContentPort,
  WriteArticle,
  WriteProgram,
  ManagedArticle,
  ManagedProgram,
} from '../application/content.port'
import type { SiteCmsPort } from '../application/cms.port'
import type {
  ArticleDto,
  SeoSettingsDto,
  ContactDetailsDto,
  HomePageDto,
  SiteSettingsDto,
  SocialLinkDto,
  FaqItemDto,
  ServiceDto,
} from '../domain/content'
import type { CmsDocument } from '../domain/cms'
import { articleSlug } from '../domain/content-identifiers'
import {
  SiteContentConflictError,
  SiteRecordNotFoundError,
} from '../application/site-errors'

export class DraftContentAdapter implements SiteContentPort {
  public constructor(private readonly cms: SiteCmsPort) {}
  private async document(): Promise<CmsDocument> {
    return (await this.cms.get()).content
  }
  private replace<K extends keyof CmsDocument>(
    key: K,
    value: CmsDocument[K],
  ): Promise<CmsDocument[K]> {
    return this.cms.mutate((document) => {
      document[key] = value
      return value
    })
  }
  public async getSettings(): Promise<SiteSettingsDto> {
    return (await this.document()).site
  }
  public async getSeo(): Promise<SeoSettingsDto> {
    return (await this.document()).seo
  }
  public updateSeo(value: SeoSettingsDto): Promise<SeoSettingsDto> {
    return this.replace('seo', value)
  }
  public async getContacts(): Promise<ContactDetailsDto> {
    return (await this.document()).contacts
  }
  public async getHome(): Promise<HomePageDto> {
    return (await this.document()).home
  }
  public async getFaq(): Promise<FaqItemDto[]> {
    return (await this.document()).faq
  }
  public async getSocials(): Promise<SocialLinkDto[]> {
    return (await this.document()).socials
  }
  public updateSettings(value: SiteSettingsDto): Promise<SiteSettingsDto> {
    return this.replace('site', value)
  }
  public updateHome(value: HomePageDto): Promise<HomePageDto> {
    return this.replace('home', value)
  }
  public updateFaq(value: FaqItemDto[]): Promise<FaqItemDto[]> {
    return this.replace('faq', value)
  }
  public updateSocials(value: SocialLinkDto[]): Promise<SocialLinkDto[]> {
    return this.cms.mutate((document) => {
      document.socials = value
      document.contacts = {
        ...document.contacts,
        telegramUrl: value.find((s) => s.id === 'telegram')?.url ?? null,
      }
      return value
    })
  }
  public updateContacts(
    value: ContactDetailsDto,
    links?: SocialLinkDto[],
  ): Promise<ContactDetailsDto> {
    return this.cms.mutate((document) => {
      const synchronized = links
        ? {
            ...value,
            telegramUrl: links.find((s) => s.id === 'telegram')?.url ?? null,
          }
        : value
      document.contacts = synchronized
      if (links) document.socials = links
      else
        document.socials = document.socials.map((s) =>
          s.id === 'telegram' ? { ...s, url: value.telegramUrl } : s,
        )
      return synchronized
    })
  }
  public async listArticles(
    publishedOnly: boolean,
    topic?: string,
  ): Promise<ManagedArticle[]> {
    return (await this.document()).articles
      .filter(
        (a) =>
          (!publishedOnly || a.published) &&
          (!topic || a.content.topic === topic),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => ({ ...a, updatedAt: new Date(a.updatedAt) }))
  }
  public async findPublishedArticle(
    slug: string,
  ): Promise<ArticleDto | undefined> {
    return (await this.document()).articles.find(
      (a) => a.published && a.content.slug === slug,
    )?.content
  }
  public saveArticle(
    input: WriteArticle,
    id?: string,
  ): Promise<ManagedArticle> {
    return this.cms.mutate((document) => {
      const previous = id
        ? document.articles.find((a) => a.id === id)
        : undefined
      if (id && !previous) throw new SiteRecordNotFoundError()
      if (
        previous &&
        input.content.slug !== undefined &&
        previous.content.slug !== input.content.slug
      )
        throw new SiteContentConflictError()
      let slug =
        previous?.content.slug ??
        input.content.slug ??
        articleSlug(input.content.title)
      if (!previous && input.content.slug === undefined) {
        const base = slug
        for (
          let suffix = 2;
          document.articles.some((a) => a.content.slug === slug);
          suffix++
        )
          slug = base + '-' + suffix
      }
      if (document.articles.some((a) => a.id !== id && a.content.slug === slug))
        throw new SiteContentConflictError()
      const seo = input.content.seo ?? previous?.content.seo
      const content: ArticleDto = {
        ...input.content,
        slug,
        ...(seo === undefined ? {} : { seo }),
      }
      const article = {
        id: id ?? randomUUID(),
        content,
        published: input.published,
        sortOrder: input.sortOrder,
        updatedAt: new Date().toISOString(),
      }
      const index = document.articles.findIndex((a) => a.id === article.id)
      if (index >= 0) document.articles[index] = article
      else document.articles.push(article)
      return { ...article, updatedAt: new Date(article.updatedAt) }
    })
  }
  public deleteArticle(id: string): Promise<void> {
    return this.cms.mutate((document) => {
      if (!document.articles.some((a) => a.id === id))
        throw new SiteRecordNotFoundError()
      document.articles = document.articles.filter((a) => a.id !== id)
    })
  }
  public async listPrograms(publishedOnly: boolean): Promise<ManagedProgram[]> {
    return (await this.document()).programs
      .filter((p) => !publishedOnly || p.published)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({ ...p, updatedAt: new Date(p.updatedAt) }))
  }
  public async findPublishedProgram(
    id: string,
  ): Promise<ServiceDto | undefined> {
    return (await this.document()).programs.find(
      (p) => p.published && p.id === id,
    )?.content
  }
  public saveProgram(
    input: WriteProgram,
    id?: string,
  ): Promise<ManagedProgram> {
    return this.cms.mutate((document) => {
      const programId = id ?? input.content.id ?? randomUUID()
      if (id && input.content.id !== undefined && input.content.id !== id)
        throw new SiteContentConflictError()
      if (id && !document.programs.some((p) => p.id === id))
        throw new SiteRecordNotFoundError()
      if (!id && document.programs.some((p) => p.id === programId))
        throw new SiteContentConflictError()
      const content: ServiceDto = { ...input.content, id: programId }
      const program = {
        id: programId,
        content,
        published: input.published,
        sortOrder: input.sortOrder,
        updatedAt: new Date().toISOString(),
      }
      const index = document.programs.findIndex((p) => p.id === programId)
      if (index >= 0) document.programs[index] = program
      else document.programs.push(program)
      return { ...program, updatedAt: new Date(program.updatedAt) }
    })
  }
  public deleteProgram(id: string): Promise<void> {
    return this.cms.mutate((document) => {
      if (!document.programs.some((p) => p.id === id))
        throw new SiteRecordNotFoundError()
      document.programs = document.programs.filter((p) => p.id !== id)
    })
  }
}
