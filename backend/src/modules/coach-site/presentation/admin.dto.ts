import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsDefined,
  Matches,
  ArrayUnique,
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import {
  consultationStatuses,
  type ConsultationStatus,
} from '../domain/consultation'
import {
  ArticleDto,
  ContactDetailsDto,
  FaqItemDto,
  ServiceDto,
  SocialLinkDto,
} from './content.dto'

export class WriteArticleContentDto extends OmitType(ArticleDto, [
  'slug',
] as const) {
  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  @Length(1, 100)
  public readonly slug?: string
}

export class WriteProgramContentDto extends OmitType(ServiceDto, [
  'id',
] as const) {
  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  @Length(1, 100)
  public readonly id?: string
}

export class WriteContactsDto extends ContactDetailsDto {
  @ApiPropertyOptional({ type: () => [SocialLinkDto], maxItems: 18 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(18)
  @ArrayUnique((link: SocialLinkDto) => link.id)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  public readonly links?: SocialLinkDto[]
}

export class WriteArticleDto {
  @ApiProperty({ type: () => WriteArticleContentDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => WriteArticleContentDto)
  public readonly content!: WriteArticleContentDto

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  public readonly published!: boolean

  @ApiProperty({ type: Number, minimum: 0, maximum: 10000 })
  @IsInt()
  @Min(0)
  @Max(10000)
  public readonly sortOrder!: number
}

export class ManagedArticleDto extends OmitType(WriteArticleDto, [
  'content',
] as const) {
  @ApiProperty({ type: () => ArticleDto })
  public readonly content!: ArticleDto
  @ApiProperty({ type: String, format: 'uuid' }) public readonly id!: string
  @ApiProperty({ type: String, format: 'date-time' })
  public readonly updatedAt!: Date
}

export class WriteProgramDto {
  @ApiProperty({ type: () => WriteProgramContentDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => WriteProgramContentDto)
  public readonly content!: WriteProgramContentDto

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  public readonly published!: boolean

  @ApiProperty({ type: Number, minimum: 0, maximum: 10000 })
  @IsInt()
  @Min(0)
  @Max(10000)
  public readonly sortOrder!: number
}

export class ManagedProgramDto extends OmitType(WriteProgramDto, [
  'content',
] as const) {
  @ApiProperty({ type: () => ServiceDto })
  public readonly content!: ServiceDto
  @ApiProperty({ type: String }) public readonly id!: string
  @ApiProperty({ type: String, format: 'date-time' })
  public readonly updatedAt!: Date
}

export class WriteSocialLinksDto {
  @ApiProperty({ type: () => [SocialLinkDto] })
  @IsArray()
  @ArrayMaxSize(18)
  @ArrayUnique((link: SocialLinkDto) => link.id)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  public readonly links!: SocialLinkDto[]
}

export class WriteFaqDto {
  @ApiProperty({ type: () => [FaqItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  public readonly items!: FaqItemDto[]
}

export class ArticleQueryDto {
  @ApiPropertyOptional({ enum: ['finding-work', 'showing-up'] })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['finding-work', 'showing-up'])
  public readonly topic?: 'finding-work' | 'showing-up'
}

export class ConsultationQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1, maximum: 10000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^\d+$/u.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(10000)
  public readonly page: number = 1

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^\d+$/u.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  public readonly limit: number = 20

  @ApiPropertyOptional({ enum: consultationStatuses })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(consultationStatuses)
  public readonly status?: ConsultationStatus

  @ApiPropertyOptional({ type: String, maxLength: 120 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 120)
  public readonly search?: string
}

export class UpdateConsultationDto {
  @ApiPropertyOptional({ enum: consultationStatuses })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(consultationStatuses)
  public readonly status?: ConsultationStatus

  @ApiPropertyOptional({ type: String, maxLength: 4000 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(0, 4000)
  public readonly adminNote?: string
}

export class TelegramDeliveryDto {
  @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED'] })
  public readonly status!: string
  @ApiProperty({ type: Number }) public readonly attempts!: number
  @ApiProperty({ type: String, format: 'date-time' })
  public readonly nextAttemptAt!: Date
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  public readonly sentAt!: Date | null
  @ApiProperty({ type: String, nullable: true })
  public readonly lastErrorCode!: string | null
}

export class AdminConsultationDto {
  @ApiProperty({ type: String, format: 'uuid' }) public readonly id!: string
  @ApiProperty({ type: String }) public readonly name!: string
  @ApiProperty({ type: String }) public readonly contact!: string
  @ApiProperty({ type: String }) public readonly message!: string
  @ApiProperty({ type: String, nullable: true }) public readonly serviceId!:
    string | null
  @ApiProperty({ type: String, nullable: true }) public readonly serviceTitle!:
    string | null
  @ApiProperty({ type: String, format: 'date-time' })
  public readonly consentAt!: Date
  @ApiProperty({ type: String }) public readonly consentVersion!: string
  @ApiProperty({ enum: consultationStatuses })
  public readonly status!: ConsultationStatus
  @ApiProperty({ type: String }) public readonly adminNote!: string
  @ApiProperty({ type: String, format: 'date-time' })
  public readonly createdAt!: Date
  @ApiProperty({ type: String, format: 'date-time' })
  public readonly updatedAt!: Date
  @ApiProperty({ type: () => TelegramDeliveryDto, nullable: true })
  public readonly delivery!: TelegramDeliveryDto | null
}

export class ConsultationPageDto {
  @ApiProperty({ type: () => [AdminConsultationDto] })
  public readonly items!: AdminConsultationDto[]
  @ApiProperty({ type: Number }) public readonly total!: number
  @ApiProperty({ type: Number }) public readonly page!: number
  @ApiProperty({ type: Number }) public readonly limit!: number
}
