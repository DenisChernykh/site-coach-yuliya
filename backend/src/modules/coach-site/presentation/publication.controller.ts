import { Controller, Get, HttpCode, Inject, Post } from '@nestjs/common'
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger'
import { RequirePermission } from '@/modules/identity-access'
import { PublicEndpoint } from '@/platform/http/policy/public-endpoint.decorator'
import { PublishSiteContent } from '../application/publication.service'
import { MANAGE_SITE_CONTENT } from '../application/site-permissions'
import { ContentVersionDto, PublicationStatusDto } from './publication.dto'

export const PUBLICATION_PRESENTATION_CONFIG = Symbol(
  'publication:presentation',
)

@Controller()
@ApiTags('publication')
export class PublicationController {
  public constructor(
    @Inject(PublishSiteContent) private readonly publisher: PublishSiteContent,
    @Inject(PUBLICATION_PRESENTATION_CONFIG)
    private readonly settings: {
      readonly enabled: boolean
      readonly repository: string
    },
  ) {}

  @Get('content-version')
  @PublicEndpoint()
  @ApiOperation({
    operationId: 'getContentVersion',
    summary: 'Версия контента для статической сборки',
    security: [],
  })
  @ApiOkResponse({ type: ContentVersionDto })
  public async version(): Promise<ContentVersionDto> {
    return {
      revision: (await this.publisher.publications.get()).requestedRevision,
    }
  }

  @Get('admin/publication')
  @RequirePermission(MANAGE_SITE_CONTENT)
  @ApiCookieAuth('sessionCookie')
  @ApiOperation({
    operationId: 'adminGetPublication',
    summary: 'Статус пересборки и публикации сайта',
  })
  @ApiOkResponse({ type: PublicationStatusDto })
  public async status(): Promise<PublicationStatusDto> {
    const publication = await this.publisher.publications.get()
    return {
      ...publication,
      automaticPublicationEnabled: this.settings.enabled,
      workflowUrl:
        publication.workflowRunId === null
          ? null
          : `https://github.com/${this.settings.repository}/actions/runs/${publication.workflowRunId}`,
    }
  }

  @Post('admin/publication/retry')
  @RequirePermission(MANAGE_SITE_CONTENT)
  @ApiCookieAuth('sessionCookie')
  @ApiSecurity('csrfToken')
  @HttpCode(204)
  @ApiOperation({
    operationId: 'adminRetryPublication',
    summary: 'Повторить неудачную публикацию',
  })
  @ApiNoContentResponse()
  public retry(): Promise<void> {
    return this.publisher.publications.retry()
  }
}
