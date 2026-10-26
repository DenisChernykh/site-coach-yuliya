import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnsupportedMediaTypeException,
} from '@nestjs/common'
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger'
import type { Request } from 'express'
import { BinaryBody } from '@/platform/http/policy/binary-body.decorator'
import { RequirePermission } from '@/modules/identity-access'
import { ApiProblemResponses } from '@/platform/http/docs/api-problem-responses.decorator'
import { MANAGE_SITE_CONTENT } from '../application/site-permissions'
import { MediaUploadService } from '../application/media-upload.service'
import {
  CreateMediaUploadDto,
  ListMediaUploadsQuery,
  MediaUploadDto,
} from './media-upload.dto'

@Controller('admin/media-uploads')
@RequirePermission(MANAGE_SITE_CONTENT)
@ApiCookieAuth('sessionCookie')
@ApiSecurity('csrfToken')
@ApiTags('media-uploads')
@ApiProblemResponses(
  'VALIDATION_FAILED',
  'AUTHENTICATION_REQUIRED',
  'AUTHORIZATION_DENIED',
  'NOT_FOUND',
  'DEPENDENCY_UNAVAILABLE',
)
export class MediaUploadController {
  public constructor(
    @Inject(MediaUploadService) private readonly uploads: MediaUploadService,
  ) {}
  @Post()
  @ApiBody({ type: CreateMediaUploadDto })
  @ApiOperation({
    operationId: 'adminCreateMediaUpload',
    summary: 'Создать или восстановить загрузку медиа',
  })
  @ApiCreatedResponse({ type: MediaUploadDto })
  public create(@Body() input: CreateMediaUploadDto): Promise<MediaUploadDto> {
    return this.uploads.create(input)
  }
  @Get()
  @ApiQuery({ name: 'contextKey', type: String, required: false })
  @ApiOperation({
    operationId: 'adminListMediaUploads',
    summary: 'Загрузки и результаты обработки',
  })
  @ApiOkResponse({ type: [MediaUploadDto] })
  public list(
    @Query() query: ListMediaUploadsQuery,
  ): Promise<MediaUploadDto[]> {
    return this.uploads.list(query.contextKey)
  }
  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    operationId: 'adminGetMediaUpload',
    summary: 'Статус и принятые части файла',
  })
  @ApiOkResponse({ type: MediaUploadDto })
  public get(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MediaUploadDto> {
    return this.uploads.get(id)
  }
  @Post(':id/chunks/:index')
  @BinaryBody()
  @HttpCode(204)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'index', type: Number })
  @ApiOperation({
    operationId: 'adminUploadMediaChunk',
    summary: 'Передать часть файла, до 1 МиБ',
  })
  @ApiConsumes('application/octet-stream')
  @ApiBody({ schema: { type: 'string', format: 'binary' } })
  @ApiNoContentResponse()
  @ApiProblemResponses(
    'PAYLOAD_TOO_LARGE',
    'UNSUPPORTED_MEDIA_TYPE',
    'RATE_LIMIT_EXCEEDED',
  )
  public async chunk(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('index', new ParseIntPipe()) index: number,
    @Req() request: Request,
  ): Promise<void> {
    if (
      !Buffer.isBuffer(request.body) ||
      !request.is('application/octet-stream')
    )
      throw new UnsupportedMediaTypeException()
    await this.uploads.chunk(id, index, request.body)
  }
  @Post(':id/complete')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    operationId: 'adminCompleteMediaUpload',
    summary: 'Проверить файл и поставить обработку в очередь',
  })
  @ApiOkResponse({ type: MediaUploadDto })
  public complete(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MediaUploadDto> {
    return this.uploads.finish(id)
  }
  @Post(':id/retry')
  @HttpCode(200)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    operationId: 'adminRetryMediaUpload',
    summary: 'Повторить обработку файла',
  })
  @ApiOkResponse({ type: MediaUploadDto })
  public retry(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MediaUploadDto> {
    return this.uploads.retry(id)
  }
}
