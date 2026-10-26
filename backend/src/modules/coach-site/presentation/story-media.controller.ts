import { InvalidStoryMediaError } from '../application/site-errors'
import { createHash, randomUUID } from 'node:crypto'
import { MediaUploadService } from '../application/media-upload.service'
import { MEDIA_CHUNK_BYTES } from '../application/media-upload.port'
import {
  Body,
  Controller,
  Get,
  Headers,
  Query,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common'
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiProduces,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { RequirePermission } from '@/modules/identity-access'
import { PublicEndpoint } from '@/platform/http/policy/public-endpoint.decorator'
import { ApiProblemResponses } from '@/platform/http/docs/api-problem-responses.decorator'
import { MANAGE_SITE_CONTENT } from '../application/site-permissions'
import { StoryMediaService } from '../application/story-media.service'
import { mediaRange } from '../domain/media-range'
import { StoryMediaDto, UploadStoryMediaDto } from './stories.dto'

@Controller('admin/story-media')
@RequirePermission(MANAGE_SITE_CONTENT)
@ApiCookieAuth('sessionCookie')
@ApiSecurity('csrfToken')
@ApiTags('story-media')
export class AdminStoryMediaController {
  public constructor(
    @Inject(MediaUploadService) private readonly uploads: MediaUploadService,
  ) {}
  @Post()
  @ApiOperation({
    operationId: 'adminUploadStoryMedia',
    summary: 'Загрузить файл в общую очередь (устаревший JSON transport)',
    deprecated: true,
  })
  @ApiBody({ type: UploadStoryMediaDto })
  @ApiCreatedResponse({ type: StoryMediaDto })
  @ApiProblemResponses(
    'MALFORMED_REQUEST',
    'VALIDATION_FAILED',
    'PAYLOAD_TOO_LARGE',
    'AUTHENTICATION_REQUIRED',
    'AUTHORIZATION_DENIED',
    'UNSUPPORTED_MEDIA_TYPE',
    'RATE_LIMIT_EXCEEDED',
    'DEPENDENCY_UNAVAILABLE',
  )
  public async upload(
    @Body() input: UploadStoryMediaDto,
  ): Promise<StoryMediaDto> {
    const data = Buffer.from(input.base64, 'base64')
    if (data.toString('base64') !== input.base64)
      throw new InvalidStoryMediaError()
    const id = randomUUID()
    await this.uploads.create({
      id,
      name: input.name,
      mimeType: input.mimeType,
      size: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
      purpose:
        input.purpose ??
        (input.mimeType.startsWith('video/') ? 'story' : 'photo'),
      contextKey: 'legacy-upload',
    })
    for (let index = 0; index * MEDIA_CHUNK_BYTES < data.length; index++)
      await this.uploads.chunk(
        id,
        index,
        data.subarray(
          index * MEDIA_CHUNK_BYTES,
          (index + 1) * MEDIA_CHUNK_BYTES,
        ),
      )
    await this.uploads.finish(id)
    return {
      id,
      mimeType: input.mimeType,
      type: input.mimeType.startsWith('image/') ? 'image' : 'video',
      size: data.length,
      status: 'QUEUED',
    }
  }
}

@Controller('story-media')
@PublicEndpoint()
@ApiTags('story-media')
export class PublicStoryMediaController {
  public constructor(
    @Inject(StoryMediaService) private readonly media: StoryMediaService,
  ) {}
  @Get(':id')
  @ApiQuery({
    name: 'variant',
    enum: ['preview', 'mobile', 'optimized'],
    required: false,
  })
  @ApiProduces(
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
  )
  @ApiHeader({
    name: 'Range',
    required: false,
    description: 'Single byte range, for example bytes=0-1023 or bytes=-1024',
  })
  @ApiOperation({
    operationId: 'getStoryMedia',
    summary: 'Фото или видео сторис с поддержкой Range',
    security: [],
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({
    schema: { type: 'string', format: 'binary' },
    description: 'Media bytes',
  })
  @ApiResponse({
    status: 206,
    description: 'Partial media bytes',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiResponse({ status: 416, description: 'Requested range not satisfiable' })
  @ApiProblemResponses('NOT_FOUND')
  public async get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('variant') variant: string | undefined,
    @Headers('range') range: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const media = await this.media.get(id)
    if (media.path) {
      const variants = media.variants as
        { previewUrl?: string; mobileUrl?: string; url?: string } | undefined
      const path =
        variant === 'preview'
          ? variants?.previewUrl
          : variant === 'mobile'
            ? variants?.mobileUrl
            : variant === 'optimized'
              ? variants?.url
              : media.path
      response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      response.setHeader(
        'Cache-Control',
        variant && !path ? 'no-store' : 'public, max-age=31536000, immutable',
      )
      response.redirect(302, path || media.path)
      return undefined
    }
    const segment = mediaRange(range, media.size)
    response.setHeader('Accept-Ranges', 'bytes')
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    if (segment === 'invalid') {
      response.setHeader('Cache-Control', 'no-store')
      response.status(416).setHeader('Content-Range', `bytes */${media.size}`)
      return undefined
    }
    response.setHeader(
      'Cache-Control',
      variant ? 'no-store' : 'public, max-age=31536000, immutable',
    )
    const start = segment?.start ?? 0
    const end = segment?.end ?? media.size - 1
    if (segment) {
      response
        .status(206)
        .setHeader('Content-Range', `bytes ${start}-${end}/${media.size}`)
    }
    return new StreamableFile(
      await this.media.read(id, start, end - start + 1),
      { type: media.mimeType, length: end - start + 1 },
    )
  }
}
