import { plainToInstance, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsDefined,
  IsArray,
  ValidateNested,
  validateOrReject,
} from 'class-validator'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type { TransactionPort } from '@/shared/application/transaction.port'
import { PrismaContentSeed } from '../infrastructure/prisma-content-seed'
import { SeoSettingsDto } from '../presentation/seo.dto'
import {
  ArticleDto,
  ContactDetailsDto,
  FaqItemDto,
  HomePageDto,
  ServiceDto,
  SiteSettingsDto,
  SocialLinkDto,
} from '../presentation/content.dto'

export class InitialContentDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => SeoSettingsDto)
  public seo!: SeoSettingsDto
  @IsDefined()
  @ValidateNested()
  @Type(() => SiteSettingsDto)
  public settings!: SiteSettingsDto
  @IsDefined()
  @ValidateNested()
  @Type(() => ContactDetailsDto)
  public contacts!: ContactDetailsDto
  @IsDefined()
  @ValidateNested()
  @Type(() => HomePageDto)
  public home!: HomePageDto
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  public faq!: FaqItemDto[]
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  public socials!: SocialLinkDto[]
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  public programs!: ServiceDto[]
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ArticleDto)
  public articles!: ArticleDto[]
}

export function createContentSeedCommand(
  provider: PrismaClientProvider,
  transaction: TransactionPort,
): { execute: (input: unknown) => Promise<void> } {
  const seed = new PrismaContentSeed(provider, transaction)
  return {
    execute: async (input: unknown): Promise<void> => {
      const content = plainToInstance(InitialContentDto, input)
      await validateOrReject(content, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      })
      await seed.execute(content)
    },
  }
}
