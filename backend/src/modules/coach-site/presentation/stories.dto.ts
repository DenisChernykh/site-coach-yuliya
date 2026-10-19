import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class StorySlideDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  public readonly id!: string

  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  public readonly mediaId!: string

  @ApiProperty({ enum: ['image', 'video'] })
  @IsIn(['image', 'video'])
  public readonly type!: 'image' | 'video'

  @ApiProperty({ type: String, maxLength: 1000 })
  @IsString()
  @Length(0, 1000)
  public readonly caption!: string

  @ApiProperty({ type: Number, minimum: 2, maximum: 30 })
  @IsInt()
  @Min(2)
  @Max(30)
  public readonly durationSeconds!: number

  @ApiProperty({ type: String, maxLength: 80 })
  @IsString()
  @Length(0, 80)
  public readonly linkLabel!: string

  @ApiProperty({
    type: String,
    maxLength: 2000,
    pattern: '^(?:$|https://[^\\s]+|/(?!/)[^\\s]*)$',
  })
  @IsString()
  @Length(0, 2000)
  @Matches(/^(?:$|https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/u)
  public readonly linkUrl!: string

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  public readonly enabled!: boolean
}

export class StoryGroupDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  public readonly id!: string

  @ApiProperty({ type: String, minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  public readonly title!: string

  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  public readonly coverMediaId!: string

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  public readonly enabled!: boolean

  @ApiProperty({ type: () => [StorySlideDto], maxItems: 30, uniqueItems: true })
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique((slide: StorySlideDto) => slide.id)
  @ValidateNested({ each: true })
  @Type(() => StorySlideDto)
  public readonly slides!: StorySlideDto[]
}

export class UploadStoryMediaDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  public readonly name!: string

  @ApiProperty({
    enum: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
  })
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
  public readonly mimeType!: string

  @ApiProperty({
    type: String,
    format: 'byte',
    minLength: 4,
    maxLength: 41943040,
  })
  @IsString()
  @Length(4, 41943040)
  public readonly base64!: string
}

export class StoryMediaDto {
  @ApiProperty({ type: String, format: 'uuid' })
  public readonly id!: string
  @ApiProperty({ type: String })
  public readonly mimeType!: string
  @ApiProperty({ enum: ['image', 'video'] })
  public readonly type!: 'image' | 'video'
  @ApiProperty({ type: Number })
  public readonly size!: number
}
