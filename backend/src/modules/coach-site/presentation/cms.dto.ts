import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateBy,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { validPages, type CmsPage } from '../domain/cms'
import {
  ContactDetailsDto,
  FaqItemDto,
  HomePageDto,
  SiteSettingsDto,
  SocialLinkDto,
} from './content.dto'
import { ManagedArticleDto, ManagedProgramDto } from './admin.dto'
import { SeoSettingsDto } from './seo.dto'

export class CmsBlockDto {
  @ApiProperty({ type: String, maxLength: 40 })
  @IsString()
  @MaxLength(40)
  public readonly id!: string
  @ApiProperty({ type: Boolean }) @IsBoolean() public readonly enabled!: boolean
  @ApiPropertyOptional({ type: String, maxLength: 1000 })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString()
  @MaxLength(1000)
  public readonly title?: string
  @ApiPropertyOptional({ type: String, maxLength: 10000 })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString()
  @MaxLength(10000)
  public readonly description?: string
  @ApiPropertyOptional({ type: String, maxLength: 300 })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString()
  @MaxLength(300)
  public readonly eyebrow?: string
  @ApiPropertyOptional({ type: String, maxLength: 2000 })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString()
  @MaxLength(2000)
  public readonly note?: string
}
export class CmsPageDto {
  @ApiProperty({ enum: ['home', 'about', 'coaching', 'contacts', 'journal'] })
  @IsIn(['home', 'about', 'coaching', 'contacts', 'journal'])
  public readonly key!: 'home' | 'about' | 'coaching' | 'contacts' | 'journal'
  @ApiProperty({ type: () => [CmsBlockDto], minItems: 1, maxItems: 20 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique((b: CmsBlockDto) => b.id)
  @ValidateNested({ each: true })
  @Type(() => CmsBlockDto)
  public readonly blocks!: CmsBlockDto[]
}
export class EditorialNoteDto {
  @ApiProperty({ type: String, maxLength: 100 })
  @IsString()
  @MaxLength(100)
  public readonly materialId!: string
  @ApiProperty({ type: String, maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  public readonly source!: string
}
export class CmsPageContentDto {
  @ApiPropertyOptional({ type: () => [EditorialNoteDto], maxItems: 100 })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => EditorialNoteDto)
  public readonly editorialNotes?: EditorialNoteDto[]
  @ApiProperty({ type: () => SiteSettingsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => SiteSettingsDto)
  public readonly site!: SiteSettingsDto
  @ApiProperty({ type: () => ContactDetailsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ContactDetailsDto)
  public readonly contacts!: ContactDetailsDto
  @ApiProperty({ type: () => HomePageDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => HomePageDto)
  public readonly home!: HomePageDto
  @ApiProperty({ type: () => [FaqItemDto], maxItems: 100 })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  public readonly faq!: FaqItemDto[]
  @ApiProperty({ type: () => [SocialLinkDto], maxItems: 18 })
  @IsArray()
  @ArrayMaxSize(18)
  @ArrayUnique((s: SocialLinkDto) => s.id)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  public readonly socials!: SocialLinkDto[]
  @ApiProperty({ type: () => [CmsPageDto], minItems: 5, maxItems: 5 })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CmsPageDto)
  @ValidateBy({
    name: 'cmsPageLayout',
    validator: {
      validate: (value: unknown) =>
        Array.isArray(value) &&
        value.every(
          (p: unknown) =>
            p &&
            typeof p === 'object' &&
            'blocks' in p &&
            Array.isArray(p.blocks) &&
            p.blocks.every((b: unknown) => b && typeof b === 'object'),
        ) &&
        validPages(value as CmsPage[]),
      defaultMessage: () => 'Invalid page sections.',
    },
  })
  public readonly pages!: CmsPageDto[]
}
export class CmsDocumentDto extends CmsPageContentDto {
  @ApiProperty({ type: () => SeoSettingsDto })
  public readonly seo!: SeoSettingsDto
  @ApiProperty({ type: () => [ManagedArticleDto] })
  public readonly articles!: ManagedArticleDto[]
  @ApiProperty({ type: () => [ManagedProgramDto] })
  public readonly programs!: ManagedProgramDto[]
}
export class CmsWorkspaceDto {
  @ApiProperty({ type: Number, minimum: 1 }) public readonly revision!: number
  @ApiProperty({ type: Number, minimum: 1 })
  public readonly publishedRevision!: number
  @ApiProperty({ type: () => CmsDocumentDto })
  public readonly content!: CmsDocumentDto
}
export class CmsRevisionDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @IsInt()
  @Min(1)
  public readonly revision!: number
}
export class SaveCmsDraftDto extends CmsRevisionDto {
  @ApiProperty({ type: () => CmsPageContentDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CmsPageContentDto)
  public readonly content!: CmsPageContentDto
}
