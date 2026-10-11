import { Prisma } from '@/generated/prisma/client'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type { TransactionPort } from '@/shared/application/transaction.port'
import type {
  ArticleDto,
  ContactDetailsDto,
  FaqItemDto,
  HomePageDto,
  ServiceDto,
  SiteSettingsDto,
  SocialLinkDto,
} from '../domain/content'

export interface InitialSiteContent {
  readonly settings: SiteSettingsDto
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
        if (
          (await client.siteContent.findUnique({ where: { id: 'site' } })) !==
          null
        )
          return
        await client.siteContent.upsert({
          where: { id: 'site' },
          update: {},
          create: {
            id: 'site',
            settings: json(input.settings),
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
