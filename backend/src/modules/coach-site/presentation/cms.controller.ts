import type { CmsWorkspace, CmsPage } from '../domain/cms'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Put,
} from '@nestjs/common'
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger'
import { RequirePermission } from '@/modules/identity-access'
import { PublicEndpoint } from '@/platform/http/policy/public-endpoint.decorator'
import { SiteCmsService } from '../application/cms.service'
import { MANAGE_SITE_CONTENT } from '../application/site-permissions'
import {
  CmsPageDto,
  CmsRevisionDto,
  CmsWorkspaceDto,
  SaveCmsDraftDto,
} from './cms.dto'

@Controller('admin/cms')
@RequirePermission(MANAGE_SITE_CONTENT)
@ApiCookieAuth('sessionCookie')
@ApiSecurity('csrfToken')
@ApiTags('cms')
export class CmsController {
  public constructor(
    @Inject(SiteCmsService) private readonly site: SiteCmsService,
  ) {}
  @Get()
  @ApiOperation({
    operationId: 'adminGetCms',
    summary: 'Черновик сайта и его версия',
  })
  @ApiOkResponse({ type: CmsWorkspaceDto })
  public get(): Promise<CmsWorkspace> {
    return this.site.get()
  }
  @Put('draft')
  @ApiOperation({
    operationId: 'adminSaveCmsDraft',
    summary: 'Сохранить черновик без публикации',
  })
  @ApiBody({ type: SaveCmsDraftDto })
  @ApiOkResponse({ type: CmsWorkspaceDto })
  public save(@Body() input: SaveCmsDraftDto): Promise<CmsWorkspace> {
    return this.site.save(input.revision, input.content)
  }
  @Post('publish')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'adminPublishCms',
    summary: 'Поставить сохранённый черновик в очередь публикации',
  })
  @ApiBody({ type: CmsRevisionDto })
  @ApiOkResponse({ type: CmsWorkspaceDto })
  public publish(@Body() input: CmsRevisionDto): Promise<CmsWorkspace> {
    return this.site.publish(input.revision)
  }
}
@Controller('page-layouts')
@PublicEndpoint()
@ApiTags('page-layouts')
export class PublicCmsController {
  public constructor(
    @Inject(SiteCmsService) private readonly site: SiteCmsService,
  ) {}
  @Get()
  @ApiOperation({
    operationId: 'getPageLayouts',
    summary: 'Опубликованный порядок и видимость секций',
    security: [],
  })
  @ApiOkResponse({ type: [CmsPageDto] })
  public layouts(): Promise<CmsPage[]> {
    return this.site.cms.publishedPages()
  }
}
