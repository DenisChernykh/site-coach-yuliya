import { randomUUID } from 'node:crypto'
import { articleSlug } from '../domain/content-identifiers'
import { visibleStories } from '../domain/stories'
import { currentSiteSettings } from '../domain/cms'
import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import type { TransactionPort } from '@/shared/application/transaction.port'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type {
  SiteContentPort,
  ManagedArticle,
  ManagedProgram,
  WriteArticle,
  WriteProgram,
} from '../application/content.port'
import type {
  ArticleDto,
  ContactDetailsDto,
  FaqItemDto,
  HomePageDto,
  ServiceDto,
  SiteSettingsDto,
  SeoSettingsDto,
  SocialLinkDto,
} from '../domain/content'
import {
  SiteContentConflictError,
  SiteRecordNotFoundError,
} from '../application/site-errors'

function json<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T
}
function programContent(value: unknown): ServiceDto {
  const content = json<ServiceDto & { featured?: boolean }>(value)
  delete content.featured
  return content
}
function inputJson(value: unknown): Prisma.InputJsonValue {
  return json<Prisma.InputJsonValue>(value)
}

export class PrismaSiteContentAdapter implements SiteContentPort {
  public constructor(
    private readonly database: PrismaClientProvider,
    private readonly transaction: TransactionPort,
  ) {}

  private edit<T>(
    operation: (client: PrismaClient | Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.transaction.run(() =>
      this.database.withClient(async (client) => {
        const now = new Date()
        const state = await client.sitePublication.upsert({
          where: { id: 'site' },
          create: { id: 'site' },
          update: { updatedAt: now },
        })
        const result = await operation(client)
        await client.sitePublication.update({
          where: { id: 'site' },
          data: {
            requestedRevision: { increment: 1 },
            requestedAt: now,
            ...(['IDLE', 'PENDING', 'FAILED'].includes(state.status)
              ? {
                  status: 'PENDING',
                  attempts: 0,
                  nextAttemptAt: new Date(now.getTime() + 30_000),
                  lastErrorCode: null,
                }
              : {}),
          },
        })
        return result
      }),
    )
  }

  private async site(): Promise<{
    settings: Prisma.JsonValue
    seo: Prisma.JsonValue
    contacts: Prisma.JsonValue
    home: Prisma.JsonValue
    faq: Prisma.JsonValue
    socials: Prisma.JsonValue
  }> {
    const row = await this.database.withClient((client) =>
      client.siteContent.findUnique({ where: { id: 'site' } }),
    )
    if (row === null) throw new SiteRecordNotFoundError()
    return row
  }

  public async getSettings(): Promise<SiteSettingsDto> {
    return currentSiteSettings(
      json<SiteSettingsDto>((await this.site()).settings),
    )
  }
  public async getSeo(): Promise<SeoSettingsDto> {
    return json<SeoSettingsDto>((await this.site()).seo)
  }

  public async updateSeo(seo: SeoSettingsDto): Promise<SeoSettingsDto> {
    await this.edit((client) =>
      client.siteContent.update({
        where: { id: 'site' },
        data: { seo: inputJson(seo) },
      }),
    )
    return seo
  }
  public async getContacts(): Promise<ContactDetailsDto> {
    return json<ContactDetailsDto>((await this.site()).contacts)
  }
  public async getHome(): Promise<HomePageDto> {
    const home = json<HomePageDto>((await this.site()).home)
    return {
      ...home,
      education: (home.education ?? []).filter((item) => item.enabled),
      caseStudies: home.caseStudies.filter((item) => item.enabled !== false),
      stories: visibleStories(home.stories ?? []),
    }
  }
  public async getFaq(): Promise<FaqItemDto[]> {
    return json<FaqItemDto[]>((await this.site()).faq)
  }
  public async getSocials(): Promise<SocialLinkDto[]> {
    return json<SocialLinkDto[]>((await this.site()).socials)
  }

  public async updateSettings(
    settings: SiteSettingsDto,
  ): Promise<SiteSettingsDto> {
    await this.edit((client) =>
      client.siteContent.update({
        where: { id: 'site' },
        data: { settings: inputJson(settings) },
      }),
    )
    return settings
  }

  public async updateContacts(
    contacts: ContactDetailsDto,
    links?: SocialLinkDto[],
  ): Promise<ContactDetailsDto> {
    await this.edit((client) =>
      client.siteContent.update({
        where: { id: 'site' },
        data: {
          contacts: inputJson(contacts),
          ...(links === undefined ? {} : { socials: inputJson(links) }),
        },
      }),
    )
    return contacts
  }

  public async updateHome(home: HomePageDto): Promise<HomePageDto> {
    await this.edit((client) =>
      client.siteContent.update({
        where: { id: 'site' },
        data: { home: inputJson(home) },
      }),
    )
    return home
  }

  public async updateFaq(faq: FaqItemDto[]): Promise<FaqItemDto[]> {
    await this.edit((client) =>
      client.siteContent.update({
        where: { id: 'site' },
        data: { faq: inputJson(faq) },
      }),
    )
    return faq
  }

  public async updateSocials(
    socials: SocialLinkDto[],
  ): Promise<SocialLinkDto[]> {
    await this.edit((client) =>
      client.siteContent.update({
        where: { id: 'site' },
        data: { socials: inputJson(socials) },
      }),
    )
    return socials
  }

  public async listArticles(
    publishedOnly: boolean,
    topic?: string,
  ): Promise<ManagedArticle[]> {
    const rows = await this.database.withClient((client) =>
      client.article.findMany({
        where: {
          ...(publishedOnly ? { published: true } : {}),
          ...(topic === undefined ? {} : { topic }),
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    )
    return rows.map((row) => ({
      ...row,
      content: json<ArticleDto>(row.content),
    }))
  }

  public async findPublishedArticle(
    slug: string,
  ): Promise<ArticleDto | undefined> {
    const row = await this.database.withClient((client) =>
      client.article.findFirst({ where: { slug, published: true } }),
    )
    return row === null ? undefined : json<ArticleDto>(row.content)
  }

  public async saveArticle(
    input: WriteArticle,
    id?: string,
  ): Promise<ManagedArticle> {
    try {
      const row = await this.edit(async (client) => {
        let slug: string
        let previousSeo: ArticleDto['seo']
        if (id !== undefined) {
          const existing = await client.article.findUnique({ where: { id } })
          if (existing === null) throw new SiteRecordNotFoundError()
          slug = existing.slug
          previousSeo = json<ArticleDto>(existing.content).seo
        } else {
          slug = input.content.slug ?? articleSlug(input.content.title)
          if (input.content.slug === undefined) {
            const base = slug
            let suffix = 2
            while (await client.article.findUnique({ where: { slug } })) {
              slug = `${base}-${suffix++}`
            }
          }
        }
        const seo = input.content.seo ?? previousSeo
        const content: ArticleDto = {
          ...input.content,
          slug,
          ...(seo === undefined ? {} : { seo }),
        }
        const data = {
          content: inputJson(content),
          slug,
          topic: content.topic,
          published: input.published,
          sortOrder: input.sortOrder,
        }
        return id === undefined
          ? client.article.create({ data })
          : client.article.update({ where: { id }, data })
      })
      return { ...row, content: json<ArticleDto>(row.content) }
    } catch (error: unknown) {
      throw contentError(error)
    }
  }

  public async deleteArticle(id: string): Promise<void> {
    const result = await this.edit((client) =>
      client.article.deleteMany({ where: { id } }),
    )
    if (result.count === 0) throw new SiteRecordNotFoundError()
  }

  public async listPrograms(publishedOnly: boolean): Promise<ManagedProgram[]> {
    const rows = await this.database.withClient((client) =>
      client.program.findMany({
        where: publishedOnly ? { published: true } : {},
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    )
    return rows.map((row) => ({
      ...row,
      content: programContent(row.content),
    }))
  }

  public async findPublishedProgram(
    id: string,
  ): Promise<ServiceDto | undefined> {
    const row = await this.database.withClient((client) =>
      client.program.findFirst({ where: { id, published: true } }),
    )
    return row === null ? undefined : programContent(row.content)
  }

  public async saveProgram(
    input: WriteProgram,
    id?: string,
  ): Promise<ManagedProgram> {
    if (
      id !== undefined &&
      input.content.id !== undefined &&
      id !== input.content.id
    )
      throw new SiteContentConflictError()
    try {
      const programId = id ?? input.content.id ?? randomUUID()
      const content: ServiceDto = { ...input.content, id: programId }
      const data = {
        content: inputJson(content),
        published: input.published,
        sortOrder: input.sortOrder,
      }
      const row = await this.edit((client) =>
        id === undefined
          ? client.program.create({ data: { ...data, id: programId } })
          : client.program.update({ where: { id }, data }),
      )
      return { ...row, content: programContent(row.content) }
    } catch (error: unknown) {
      throw contentError(error)
    }
  }

  public async deleteProgram(id: string): Promise<void> {
    const result = await this.edit((client) =>
      client.program.deleteMany({ where: { id } }),
    )
    if (result.count === 0) throw new SiteRecordNotFoundError()
  }
}

function contentError(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return new SiteContentConflictError()
    if (error.code === 'P2025') return new SiteRecordNotFoundError()
  }
  return error
}
