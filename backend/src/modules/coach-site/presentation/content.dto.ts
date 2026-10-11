import { socialNetworks, type SocialNetwork } from '../domain/content'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type, Transform } from 'class-transformer'
import {
  IsDefined,
  IsArray,
  ArrayMaxSize,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Length,
  MaxLength,
  IsIn,
  ValidateNested,
  ValidateIf,
  Matches,
  IsEmail,
  IsUrl,
} from 'class-validator'

export class NavigationItemDto {
  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly label!: string

  @IsString()
  @Matches(/^(?:\/(?!\/)|https:\/\/)/u)
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly href!: string
}

export class SiteSettingsDto {
  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly name!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly profession!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly description!: string

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => NavigationItemDto)
  @ApiProperty({ type: () => [NavigationItemDto] })
  public readonly navigation!: NavigationItemDto[]
}

export class HeroDto {
  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly eyebrow!: string

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  @ApiProperty({ type: () => [String] })
  public readonly headingLines!: string[]

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly description!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly meetingNote!: string
}

export class ConcernDto {
  @IsString()
  @Length(0, 100)
  @ApiProperty({ type: String })
  public readonly id!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly title!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly description!: string
}

export class AboutDto {
  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly eyebrow!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly title!: string

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  @ApiProperty({ type: () => [String] })
  public readonly paragraphs!: string[]
}

export class StepDto {
  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly title!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly description!: string
}

export class ApproachDto {
  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly eyebrow!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly title!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly description!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly quote!: string

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  @ApiProperty({ type: () => [StepDto] })
  public readonly steps!: StepDto[]
}

export class CaseStudyDto {
  @IsString()
  @Length(0, 100)
  @ApiProperty({ type: String })
  public readonly id!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly title!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly request!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly exploration!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly result!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly details!: string
}

export class ArtPracticeDto {
  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly eyebrow!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly title!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly description!: string

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  @ApiProperty({ type: () => [String] })
  public readonly details!: string[]
}

export class ProductDto {
  @IsString()
  @Length(0, 100)
  @ApiProperty({ type: String })
  public readonly id!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly eyebrow!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly title!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly description!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly actionLabel!: string
}

export class HomePageDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => HeroDto)
  @ApiProperty({ type: () => HeroDto })
  public readonly hero!: HeroDto

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ConcernDto)
  @ApiProperty({ type: () => [ConcernDto] })
  public readonly concerns!: ConcernDto[]

  @IsDefined()
  @ValidateNested()
  @Type(() => AboutDto)
  @ApiProperty({ type: () => AboutDto })
  public readonly about!: AboutDto

  @IsDefined()
  @ValidateNested()
  @Type(() => ApproachDto)
  @ApiProperty({ type: () => ApproachDto })
  public readonly approach!: ApproachDto

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  @ApiProperty({ type: () => [StepDto] })
  public readonly process!: StepDto[]

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CaseStudyDto)
  @ApiProperty({ type: () => [CaseStudyDto] })
  public readonly caseStudies!: CaseStudyDto[]

  @IsDefined()
  @ValidateNested()
  @Type(() => ArtPracticeDto)
  @ApiProperty({ type: () => ArtPracticeDto })
  public readonly artPractice!: ArtPracticeDto

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductDto)
  @ApiProperty({ type: () => [ProductDto] })
  public readonly products!: ProductDto[]
}

export class ServiceDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  @Length(1, 100)
  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 100,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  public readonly id!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly eyebrow!: string

  @IsString()
  @Length(1, 300)
  @ApiProperty({ type: String, maxLength: 300 })
  public readonly title!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly description!: string

  @IsInt()
  @Min(0)
  @Max(100000000)
  @ApiProperty({ type: Number, minimum: 0 })
  public readonly price!: number

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly priceNote!: string

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  @ApiProperty({ type: () => [String] })
  public readonly features!: string[]
}

export class ArticleSectionDto {
  @IsString()
  @Length(0, 100)
  @ApiProperty({ type: String })
  public readonly id!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly title!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly summary!: string

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  @ApiProperty({ type: () => [String] })
  public readonly paragraphs!: string[]
}

export class ArticleDto {
  @ApiPropertyOptional({ type: String, maxLength: 50000 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(0, 50000)
  public readonly bodyMarkdown?: string

  @ApiProperty({ type: String, required: false, maxLength: 300 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(0, 300)
  public readonly previewTitle?: string

  @ApiProperty({ type: String, required: false, maxLength: 2000 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(0, 2000)
  public readonly previewDescription?: string

  @ApiProperty({ type: String, required: false, maxLength: 2000 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(0, 2000)
  public readonly listingDescription?: string

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  @Length(0, 100)
  @ApiProperty({ type: String })
  public readonly slug!: string

  @IsString()
  @Length(0, 10000)
  @IsIn(['finding-work', 'showing-up'])
  @ApiProperty({ type: String, enum: ['finding-work', 'showing-up'] })
  public readonly topic!: 'finding-work' | 'showing-up'

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly topicLabel!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly title!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly description!: string

  @IsString()
  @Matches(/^(?:art|landscape|https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/u)
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly coverImage!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly coverAlt!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly intro!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly storyTitle!: string

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  @ApiProperty({ type: () => [String] })
  public readonly story!: string[]

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly quote!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly quoteNote!: string

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ArticleSectionDto)
  @ApiProperty({ type: () => [ArticleSectionDto] })
  public readonly sections!: ArticleSectionDto[]

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly practiceTitle!: string

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  @ApiProperty({ type: () => [String] })
  public readonly practiceQuestions!: string[]

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly ctaTitle!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly ctaDescription!: string
}

export class FaqItemDto {
  @IsString()
  @Length(0, 100)
  @ApiProperty({ type: String })
  public readonly id!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly question!: string

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly answer!: string
}

export class SocialLinkDto {
  @IsString()
  @Length(0, 100)
  @IsIn(socialNetworks)
  @ApiProperty({ type: String, enum: socialNetworks })
  public readonly id!: SocialNetwork

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly label!: string

  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Length(0, 10000)
  @ApiProperty({ type: String, nullable: true, format: 'uri' })
  public readonly url!: string | null
}

export class ConsultationRequestDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(2, 80)
  @ApiProperty({ type: String, minLength: 2, maxLength: 80 })
  public readonly name!: string

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(5, 120)
  @ApiProperty({ type: String, minLength: 5, maxLength: 120 })
  public readonly contact!: string

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(0, 2000)
  @ApiPropertyOptional({ type: String, maxLength: 2000 })
  public readonly message?: string

  @IsBoolean()
  @IsIn([true])
  @ApiProperty({ type: Boolean, enum: [true] })
  public readonly consent!: true

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(0, 100)
  @ApiPropertyOptional({ type: String, maxLength: 100 })
  public readonly serviceId?: string
}

export class ConsultationResultDto {
  @IsString()
  @Length(0, 10000)
  @IsIn(['preview', 'accepted'])
  @ApiProperty({ type: String, enum: ['preview', 'accepted'] })
  public readonly status!: 'preview' | 'accepted'

  @IsString()
  @Length(0, 10000)
  @ApiProperty({ type: String })
  public readonly message!: string
}

export class ContactDetailsDto {
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @IsEmail()
  @Length(0, 254)
  @ApiProperty({ type: String, nullable: true, maxLength: 254 })
  public readonly email!: string | null

  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @Length(0, 80)
  @ApiProperty({ type: String, nullable: true, maxLength: 80 })
  public readonly phone!: string | null

  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Length(0, 500)
  @ApiProperty({ type: String, nullable: true, maxLength: 500 })
  public readonly telegramUrl!: string | null

  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @Length(0, 500)
  @ApiProperty({ type: String, nullable: true, maxLength: 500 })
  public readonly address!: string | null
}
