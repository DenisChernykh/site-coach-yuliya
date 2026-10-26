import { ApiProperty } from '@nestjs/swagger'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator'
import {
  MEDIA_PURPOSES,
  type MediaPurpose,
  type MediaStatus,
} from '../application/media-upload.port'

export class CreateMediaUploadDto {
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() public id!: string
  @ApiProperty({ type: String, minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  public name!: string
  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'] })
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
  public mimeType!: string
  @ApiProperty({ type: Number, minimum: 1, maximum: 31457280 })
  @IsInt()
  @Min(1)
  @Max(31457280)
  public size!: number
  @ApiProperty({ type: String, pattern: '^[a-f0-9]{64}$' })
  @Matches(/^[a-f0-9]{64}$/u)
  public sha256!: string
  @ApiProperty({ enum: MEDIA_PURPOSES })
  @IsIn(MEDIA_PURPOSES)
  public purpose!: MediaPurpose
  @ApiProperty({ type: String, maxLength: 300 })
  @IsString()
  @Length(0, 300)
  public contextKey!: string
}
export class MediaOutputDto {
  @ApiProperty({ type: String }) public url!: string
  @ApiProperty({ type: String }) public previewUrl!: string
  @ApiProperty({ type: String }) public mobileUrl!: string
  @ApiProperty({ type: String }) public mimeType!: string
  @ApiProperty({ type: Number }) public size!: number
  @ApiProperty({ type: Number }) public width!: number
  @ApiProperty({ type: Number }) public height!: number
}
export class MediaUploadDto extends CreateMediaUploadDto {
  @ApiProperty({
    enum: ['UPLOADING', 'QUEUED', 'PROCESSING', 'READY', 'FAILED'],
  })
  public status!: MediaStatus
  @ApiProperty({ type: Number }) public attempts!: number
  @ApiProperty({ type: String, nullable: true }) public error!: string | null
  @ApiProperty({ type: () => MediaOutputDto, nullable: true })
  public output!: MediaOutputDto | null
  @ApiProperty({ type: [Number], required: false })
  public receivedChunks?: number[]
}
export class ListMediaUploadsQuery {
  @ApiProperty({ type: String, maxLength: 300, required: false })
  @IsOptional()
  @IsString()
  @Length(0, 300)
  public contextKey?: string
}
