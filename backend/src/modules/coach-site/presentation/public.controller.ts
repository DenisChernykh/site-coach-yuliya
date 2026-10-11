import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import type { Request } from 'express'
import { PublicEndpoint } from '@/platform/http/policy/public-endpoint.decorator'
import { CsrfTokenExempt } from '@/platform/http/policy/csrf-token-exempt.decorator'
import { ApiProblemResponses } from '@/platform/http/docs/api-problem-responses.decorator'
import { SiteContentService } from '../application/content.service'
import { ConsultationsService } from '../application/consultations.service'
import {
  ArticleDto,
  ContactDetailsDto,
  ConsultationRequestDto,
  ConsultationResultDto,
  FaqItemDto,
  HomePageDto,
  ServiceDto,
  SiteSettingsDto,
  SocialLinkDto,
} from './content.dto'
import { ArticleQueryDto } from './admin.dto'
import { INVALID_PROGRAM_PROBLEM } from './site-problem.definitions'

@Controller()
@PublicEndpoint()
export class PublicSiteController {
  public constructor(
    @Inject(SiteContentService) private readonly site: SiteContentService,
    @Inject(ConsultationsService)
    private readonly consultations: ConsultationsService,
  ) {}

  @Get('site')
  @ApiTags('site')
  @ApiOperation({
    operationId: 'getSiteSettings',
    summary: 'Настройки сайта',
    security: [],
  })
  @ApiOkResponse({ type: SiteSettingsDto })
  public getSettings(): Promise<SiteSettingsDto> {
    return this.site.content.getSettings()
  }

  @Get('contacts')
  @ApiTags('contacts')
  @ApiOperation({
    operationId: 'getContacts',
    summary: 'Контактные данные',
    security: [],
  })
  @ApiOkResponse({ type: ContactDetailsDto })
  public getContacts(): Promise<ContactDetailsDto> {
    return this.site.content.getContacts()
  }

  @Get('home')
  @ApiTags('home')
  @ApiOperation({
    operationId: 'getHomePage',
    summary: 'Контент главной',
    security: [],
  })
  @ApiOkResponse({ type: HomePageDto })
  public getHome(): Promise<HomePageDto> {
    return this.site.content.getHome()
  }

  @Get('faq')
  @ApiTags('faq')
  @ApiOperation({
    operationId: 'getFaq',
    summary: 'Частые вопросы',
    security: [],
  })
  @ApiOkResponse({ type: [FaqItemDto] })
  public getFaq(): Promise<FaqItemDto[]> {
    return this.site.content.getFaq()
  }

  @Get('social-links')
  @ApiTags('social-links')
  @ApiOperation({
    operationId: 'getSocialLinks',
    summary: 'Социальные сети',
    security: [],
  })
  @ApiOkResponse({ type: [SocialLinkDto] })
  public getSocials(): Promise<SocialLinkDto[]> {
    return this.site.content.getSocials()
  }

  @Get('articles')
  @ApiTags('articles')
  @ApiQuery({
    name: 'topic',
    enum: ['finding-work', 'showing-up'],
    required: false,
  })
  @ApiOperation({
    operationId: 'getArticles',
    summary: 'Опубликованные статьи',
    security: [],
  })
  @ApiOkResponse({ type: [ArticleDto] })
  public async getArticles(
    @Query() query: ArticleQueryDto,
  ): Promise<ArticleDto[]> {
    return (await this.site.content.listArticles(true, query.topic)).map(
      (article) => article.content,
    )
  }

  @Get('articles/:slug')
  @ApiTags('articles')
  @ApiParam({ name: 'slug', type: String })
  @ApiOperation({
    operationId: 'getArticle',
    summary: 'Опубликованная статья',
    security: [],
  })
  @ApiOkResponse({ type: ArticleDto })
  @ApiProblemResponses('NOT_FOUND')
  public getArticle(@Param('slug') slug: string): Promise<ArticleDto> {
    return this.site.getArticle(slug)
  }

  @Get('services')
  @ApiTags('services')
  @ApiOperation({
    operationId: 'getServices',
    summary: 'Опубликованные программы',
    security: [],
  })
  @ApiOkResponse({ type: [ServiceDto] })
  public async getPrograms(): Promise<ServiceDto[]> {
    return (await this.site.content.listPrograms(true)).map(
      (program) => program.content,
    )
  }

  @Post('consultations')
  @ApiTags('consultations')
  @CsrfTokenExempt()
  @ApiBody({ type: ConsultationRequestDto })
  @ApiOperation({
    operationId: 'createConsultation',
    summary: 'Сохранить заявку на знакомство',
    security: [],
  })
  @ApiCreatedResponse({ type: ConsultationResultDto })
  @ApiProblemResponses(
    'MALFORMED_REQUEST',
    'VALIDATION_FAILED',
    'RATE_LIMIT_EXCEEDED',
    'DEPENDENCY_UNAVAILABLE',
    INVALID_PROGRAM_PROBLEM,
  )
  public submit(
    @Body() body: ConsultationRequestDto,
    @Req() request: Request,
  ): Promise<ConsultationResultDto> {
    return this.consultations.submit(
      body,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    )
  }
}
