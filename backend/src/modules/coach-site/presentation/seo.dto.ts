import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsDefined,
  IsString,
  Length,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

const imagePattern = '^(?:https://[^\\s]+|/(?!/)[^\\s]*)?$'

export class PageSeoDto {
  @IsString()
  @Length(0, 120)
  @ApiProperty({ type: String, maxLength: 120 })
  public readonly title!: string

  @IsString()
  @Length(0, 320)
  @ApiProperty({ type: String, maxLength: 320 })
  public readonly description!: string

  @IsString()
  @Length(0, 120)
  @ApiProperty({ type: String, maxLength: 120 })
  public readonly ogTitle!: string

  @IsString()
  @Length(0, 320)
  @ApiProperty({ type: String, maxLength: 320 })
  public readonly ogDescription!: string

  @IsString()
  @Length(0, 1000)
  @Matches(new RegExp(imagePattern, 'u'))
  @ApiProperty({ type: String, maxLength: 1000, pattern: imagePattern })
  public readonly ogImage!: string

  @IsString()
  @Length(0, 300)
  @ApiProperty({ type: String, maxLength: 300 })
  public readonly ogImageAlt!: string

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  public readonly noIndex!: boolean
}

export class SeoPagesDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => PageSeoDto)
  @ApiProperty({ type: () => PageSeoDto })
  public readonly home!: PageSeoDto

  @IsDefined()
  @ValidateNested()
  @Type(() => PageSeoDto)
  @ApiProperty({ type: () => PageSeoDto })
  public readonly about!: PageSeoDto

  @IsDefined()
  @ValidateNested()
  @Type(() => PageSeoDto)
  @ApiProperty({ type: () => PageSeoDto })
  public readonly coaching!: PageSeoDto

  @IsDefined()
  @ValidateNested()
  @Type(() => PageSeoDto)
  @ApiProperty({ type: () => PageSeoDto })
  public readonly contacts!: PageSeoDto

  @IsDefined()
  @ValidateNested()
  @Type(() => PageSeoDto)
  @ApiProperty({ type: () => PageSeoDto })
  public readonly journal!: PageSeoDto

  @IsDefined()
  @ValidateNested()
  @Type(() => PageSeoDto)
  @ApiProperty({ type: () => PageSeoDto })
  public readonly privacy!: PageSeoDto
}

export class SeoSettingsDto {
  @IsString()
  @Length(1, 120)
  @ApiProperty({ type: String, minLength: 1, maxLength: 120 })
  public readonly siteName!: string

  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @Length(1, 500)
  @Matches(/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d{1,5})?\/?$/iu)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\/$/u, '') : value,
  )
  @ApiProperty({
    type: String,
    nullable: true,
    maxLength: 500,
    pattern:
      '^https://[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?::[0-9]{1,5})?/?$',
  })
  public readonly siteUrl!: string | null

  @IsString()
  @Length(1, 1000)
  @Matches(new RegExp(imagePattern, 'u'))
  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 1000,
    pattern: imagePattern,
  })
  public readonly defaultImage!: string

  @IsString()
  @Length(1, 300)
  @ApiProperty({ type: String, minLength: 1, maxLength: 300 })
  public readonly defaultImageAlt!: string

  @IsBoolean()
  @ApiProperty({ type: Boolean })
  public readonly allowIndexing!: boolean

  @IsDefined()
  @ValidateNested()
  @Type(() => SeoPagesDto)
  @ApiProperty({ type: () => SeoPagesDto })
  public readonly pages!: SeoPagesDto
}
