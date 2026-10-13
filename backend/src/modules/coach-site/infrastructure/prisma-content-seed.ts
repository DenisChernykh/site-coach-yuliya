import { Prisma } from '@/generated/prisma/client'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type { TransactionPort } from '@/shared/application/transaction.port'
import { initialArticleSeo } from '../domain/seo'
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

export interface InitialSiteContent {
  readonly settings: SiteSettingsDto
  readonly seo: SeoSettingsDto
  readonly contacts: ContactDetailsDto
  readonly home: HomePageDto
  readonly faq: FaqItemDto[]
  readonly socials: SocialLinkDto[]
  readonly programs: ServiceDto[]
  readonly articles: ArticleDto[]
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export class PrismaContentSeed {
  public constructor(
    private readonly provider: PrismaClientProvider,
    private readonly transaction: TransactionPort,
  ) {}

  public async execute(input: InitialSiteContent): Promise<void> {
    await this.transaction.run(async () => {
      await this.provider.withClient(async (client) => {
        await client.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(728519460)`,
        )
        const existing = await client.siteContent.findUnique({
          where: { id: 'site' },
        })
        if (existing !== null) {
          if (Object.keys(existing.seo as object).length === 0) {
            await client.siteContent.update({
              where: { id: 'site' },
              data: { seo: json(input.seo) },
            })
          }
          const articles = await client.article.findMany()
          for (const row of articles) {
            const article = row.content as unknown as ArticleDto
            if (article.seo !== undefined) continue
            const seo =
              input.articles.find(
                (item) =>
                  item.slug === article.slug &&
                  item.title === article.title &&
                  item.description === article.description,
              )?.seo ??
              initialArticleSeo(
                article,
                (existing.settings as unknown as SiteSettingsDto).name,
              )
            await client.article.update({
              where: { id: row.id },
              data: { content: json({ ...article, seo }) },
            })
          }
          return
        }
        await client.siteContent.upsert({
          where: { id: 'site' },
          update: {},
          create: {
            id: 'site',
            settings: json(input.settings),
            seo: json(input.seo),
            contacts: json(input.contacts),
            home: json(input.home),
            faq: json(input.faq),
            socials: json(input.socials),
          },
        })
        for (const [sortOrder, content] of input.programs.entries()) {
          await client.program.upsert({
            where: { id: content.id },
            update: {},
            create: {
              id: content.id,
              content: json(content),
              published: true,
              sortOrder,
            },
          })
        }
        for (const [sortOrder, content] of input.articles.entries()) {
          await client.article.upsert({
            where: { slug: content.slug },
            update: {},
            create: {
              slug: content.slug,
              topic: content.topic,
              content: json(content),
              published: true,
              sortOrder,
            },
          })
        }
      })
    })
  }
}
