import type { Prisma, SiteCmsDraft } from '@/generated/prisma/client'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type { TransactionPort } from '@/shared/application/transaction.port'
import type { SiteCmsPort } from '../application/cms.port'
import type { SiteContentPort } from '../application/content.port'
import {
  SiteContentConflictError,
  SiteRecordNotFoundError,
} from '../application/site-errors'
import {
  initialPages,
  validPages,
  currentPageLayouts,
  currentSiteSettings,
  type CmsDocument,
  type CmsPage,
  type CmsPageContent,
  type CmsWorkspace,
} from '../domain/cms'

const json = <T>(value: unknown): T => JSON.parse(JSON.stringify(value)) as T
const input = (value: unknown): Prisma.InputJsonValue =>
  json<Prisma.InputJsonValue>(value)
const currentDocument = (value: unknown): CmsDocument => {
  const document = json<CmsDocument>(value)
  return {
    ...document,
    pages: currentPageLayouts(document.pages),
    site: currentSiteSettings(document.site),
  }
}
type Client = Prisma.TransactionClient

export class PrismaCmsAdapter implements SiteCmsPort {
  public constructor(
    private readonly database: PrismaClientProvider,
    private readonly transaction: TransactionPort,
    private readonly legacy: SiteContentPort,
  ) {}

  private async lock(client: Client): Promise<SiteCmsDraft> {
    await client.sitePublication.upsert({
      where: { id: 'site' },
      create: { id: 'site' },
      update: { updatedAt: new Date() },
    })
    const existing = await client.siteCmsDraft.findUnique({
      where: { id: 'site' },
    })
    if (existing) {
      const document = json<CmsDocument>(existing.content)
      if (document.seo) return existing
      return client.siteCmsDraft.update({
        where: { id: 'site' },
        data: {
          content: input({ ...document, seo: await this.legacy.getSeo() }),
        },
      })
    }
    const site = await client.siteContent.findUnique({ where: { id: 'site' } })
    if (!site) throw new SiteRecordNotFoundError()
    const [articles, programs] = await Promise.all([
      client.article.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      client.program.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ])
    const document: CmsDocument = {
      seo: await this.legacy.getSeo(),
      site: json(site.settings),
      home: json(site.home),
      contacts: json(site.contacts),
      faq: json(site.faq),
      socials: json(site.socials),
      pages: site.pageLayout ? json(site.pageLayout) : initialPages(),
      articles: articles.map((a) => ({
        id: a.id,
        content: json(a.content),
        published: a.published,
        sortOrder: a.sortOrder,
        updatedAt: a.updatedAt.toISOString(),
      })),
      programs: programs.map((p) => ({
        id: p.id,
        content: json(p.content),
        published: p.published,
        sortOrder: p.sortOrder,
        updatedAt: p.updatedAt.toISOString(),
      })),
    }
    return client.siteCmsDraft.create({
      data: { id: 'site', content: input(document) },
    })
  }
  private workspace(row: {
    revision: number
    publishedRevision: number
    content: unknown
  }): CmsWorkspace {
    const document = currentDocument(row.content)
    return {
      revision: row.revision,
      publishedRevision: row.publishedRevision,
      content: {
        ...document,
        ...(document.editorialNotes === undefined
          ? {}
          : {
              editorialNotes: document.editorialNotes.map(
                ({ materialId, source }) => ({ materialId, source }),
              ),
            }),
        pages: currentPageLayouts(document.pages),
      },
    }
  }
  public get(): Promise<CmsWorkspace> {
    return this.transaction.run(() =>
      this.database.withClient(async (client) =>
        this.workspace(await this.lock(client)),
      ),
    )
  }
  public async publishedPages(): Promise<CmsPage[]> {
    const site = await this.database.withClient((client) =>
      client.siteContent.findUnique({
        where: { id: 'site' },
        select: { pageLayout: true },
      }),
    )
    if (!site) throw new SiteRecordNotFoundError()
    return site.pageLayout
      ? currentPageLayouts(json<CmsPage[]>(site.pageLayout))
      : initialPages()
  }
  public mutate<T>(change: (document: CmsDocument) => T): Promise<T> {
    return this.transaction.run(() =>
      this.database.withClient(async (client) => {
        const row = await this.lock(client)
        const document = currentDocument(row.content)
        const result = change(document)
        await client.siteCmsDraft.update({
          where: { id: 'site' },
          data: { content: input(document), revision: { increment: 1 } },
        })
        return result
      }),
    )
  }
  public save(
    revision: number,
    content: CmsPageContent,
  ): Promise<CmsWorkspace> {
    return this.transaction.run(() =>
      this.database.withClient(async (client) => {
        const row = await this.lock(client)
        const updated = {
          ...content,
          pages: currentPageLayouts(content.pages),
          site: currentSiteSettings(content.site),
        }
        if (row.revision !== revision || !validPages(updated.pages))
          throw new SiteContentConflictError()
        const document = {
          ...currentDocument(row.content),
          ...updated,
        }
        return this.workspace(
          await client.siteCmsDraft.update({
            where: { id: 'site' },
            data: { content: input(document), revision: { increment: 1 } },
          }),
        )
      }),
    )
  }
  public publish(revision: number): Promise<CmsWorkspace> {
    return this.transaction.run(() =>
      this.database.withClient(async (client) => {
        const row = await this.lock(client)
        if (row.revision !== revision) throw new SiteContentConflictError()
        if (row.publishedRevision === revision) return this.workspace(row)
        const document = currentDocument(row.content)
        await client.siteContent.update({
          where: { id: 'site' },
          data: {
            settings: input(document.site),
            seo: input(document.seo),
            contacts: input(document.contacts),
            home: input(document.home),
            faq: input(document.faq),
            socials: input(document.socials),
            pageLayout: input(document.pages),
          },
        })
        await client.article.deleteMany({
          where: { id: { notIn: document.articles.map((a) => a.id) } },
        })
        for (const a of document.articles) {
          const data = {
            slug: a.content.slug,
            topic: a.content.topic,
            content: input(a.content),
            published: a.published,
            sortOrder: a.sortOrder,
          }
          await client.article.upsert({
            where: { id: a.id },
            create: { ...data, id: a.id },
            update: data,
          })
        }
        await client.program.deleteMany({
          where: { id: { notIn: document.programs.map((p) => p.id) } },
        })
        for (const p of document.programs) {
          const data = {
            content: input(p.content),
            published: p.published,
            sortOrder: p.sortOrder,
          }
          await client.program.upsert({
            where: { id: p.id },
            create: { ...data, id: p.id },
            update: data,
          })
        }
        const state = await client.sitePublication.findUniqueOrThrow({
          where: { id: 'site' },
        })
        const now = new Date()
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
        return this.workspace(
          await client.siteCmsDraft.update({
            where: { id: 'site' },
            data: { publishedRevision: revision },
          }),
        )
      }),
    )
  }
}
