import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import {
  ApiBody,
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
import { RequirePermission } from '@/modules/identity-access'
import { SiteCmsService } from '../application/cms.service'
import { ConsultationsService } from '../application/consultations.service'
import { SiteRecordNotFoundError } from '../application/site-errors'
import {
  MANAGE_CONSULTATIONS,
  MANAGE_SITE_CONTENT,
} from '../application/site-permissions'
import {
  ContactDetailsDto,
  HomePageDto,
  FaqItemDto,
  SiteSettingsDto,
  SocialLinkDto,
} from './content.dto'
import {
  AdminConsultationDto,
  ConsultationPageDto,
  ConsultationQueryDto,
  ManagedArticleDto,
  ManagedProgramDto,
  UpdateConsultationDto,
  WriteArticleDto,
  WriteContactsDto,
  WriteProgramDto,
  WriteSocialLinksDto,
  WriteFaqDto,
} from './admin.dto'

@Controller('admin')
@ApiTags('admin content')
@RequirePermission(MANAGE_SITE_CONTENT)
@ApiCookieAuth('sessionCookie')
@ApiSecurity('csrfToken')
export class AdminContentController {
  public constructor(
    @Inject(SiteCmsService) private readonly site: SiteCmsService,
  ) {}

  @Get('site')
  @ApiOkResponse({ type: SiteSettingsDto })
  @ApiOperation({
    operationId: 'adminGetSite',
    summary: 'Настройки сайта для редактирования',
  })
  public getSettings(): Promise<SiteSettingsDto> {
    return this.site.content.getSettings()
  }

  @Put('site')
  @ApiOkResponse({ type: SiteSettingsDto })
  @ApiOperation({
    operationId: 'adminUpdateSite',
    summary: 'Сохранить настройки сайта',
  })
  @ApiBody({ type: SiteSettingsDto })
  public updateSettings(
    @Body() input: SiteSettingsDto,
  ): Promise<SiteSettingsDto> {
    return this.site.content.updateSettings(input)
  }

  @Get('contacts')
  @ApiOkResponse({ type: ContactDetailsDto })
  @ApiOperation({
    operationId: 'adminGetContacts',
    summary: 'Контактные данные для редактирования',
  })
  public getContacts(): Promise<ContactDetailsDto> {
    return this.site.content.getContacts()
  }

  @Get('home')
  @ApiOkResponse({ type: HomePageDto })
  @ApiOperation({
    operationId: 'adminGetHome',
    summary: 'Контент главной страницы',
  })
  public getHome(): Promise<HomePageDto> {
    return this.site.content.getHome()
  }

  @Put('home')
  @ApiBody({ type: HomePageDto })
  @ApiOkResponse({ type: HomePageDto })
  @ApiOperation({
    operationId: 'adminUpdateHome',
    summary: 'Сохранить главную страницу',
  })
  public updateHome(@Body() input: HomePageDto): Promise<HomePageDto> {
    return this.site.content.updateHome(input)
  }

  @Get('faq')
  @ApiOkResponse({ type: [FaqItemDto] })
  @ApiOperation({
    operationId: 'adminGetFaq',
    summary: 'Частые вопросы для редактирования',
  })
  public getFaq(): Promise<FaqItemDto[]> {
    return this.site.content.getFaq()
  }

  @Put('faq')
  @ApiBody({ type: WriteFaqDto })
  @ApiOkResponse({ type: [FaqItemDto] })
  @ApiOperation({
    operationId: 'adminUpdateFaq',
    summary: 'Сохранить частые вопросы',
  })
  public updateFaq(@Body() input: WriteFaqDto): Promise<FaqItemDto[]> {
    return this.site.content.updateFaq(input.items)
  }

  @Put('contacts')
  @ApiOkResponse({ type: ContactDetailsDto })
  @ApiOperation({
    operationId: 'adminUpdateContacts',
    summary: 'Сохранить контактные данные',
  })
  @ApiBody({ type: WriteContactsDto })
  public updateContacts(
    @Body() input: WriteContactsDto,
  ): Promise<ContactDetailsDto> {
    const { links, ...contacts } = input
    return this.site.content.updateContacts(contacts, links)
  }

  @Get('social-links')
  @ApiOkResponse({ type: [SocialLinkDto] })
  @ApiOperation({
    operationId: 'adminGetSocialLinks',
    summary: 'Ссылки социальных сетей',
  })
  public getSocials(): Promise<SocialLinkDto[]> {
    return this.site.content.getSocials()
  }

  @Put('social-links')
  @ApiOkResponse({ type: [SocialLinkDto] })
  @ApiOperation({
    operationId: 'adminUpdateSocialLinks',
    summary: 'Сохранить ссылки социальных сетей',
  })
  @ApiBody({ type: WriteSocialLinksDto })
  public updateSocials(
    @Body() input: WriteSocialLinksDto,
  ): Promise<SocialLinkDto[]> {
    return this.site.content.updateSocials(input.links)
  }

  @Get('articles')
  @ApiOkResponse({ type: [ManagedArticleDto] })
  @ApiOperation({
    operationId: 'adminListArticles',
    summary: 'Все статьи, включая черновики',
  })
  public getArticles(): Promise<ManagedArticleDto[]> {
    return this.site.content.listArticles(false)
  }

  @Post('articles')
  @ApiCreatedResponse({ type: ManagedArticleDto })
  @ApiOperation({
    operationId: 'adminCreateArticle',
    summary: 'Создать статью',
  })
  @ApiBody({ type: WriteArticleDto })
  public createArticle(
    @Body() input: WriteArticleDto,
  ): Promise<ManagedArticleDto> {
    return this.site.content.saveArticle(input)
  }

  @Put('articles/:id')
  @ApiOkResponse({ type: ManagedArticleDto })
  @ApiOperation({
    operationId: 'adminUpdateArticle',
    summary: 'Обновить статью и её публикацию',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: WriteArticleDto })
  public updateArticle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: WriteArticleDto,
  ): Promise<ManagedArticleDto> {
    return this.site.content.saveArticle(input, id)
  }

  @Delete('articles/:id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({
    operationId: 'adminDeleteArticle',
    summary: 'Удалить статью',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  public deleteArticle(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.site.content.deleteArticle(id)
  }

  @Get('programs')
  @ApiOkResponse({ type: [ManagedProgramDto] })
  @ApiOperation({
    operationId: 'adminListPrograms',
    summary: 'Все программы, включая черновики',
  })
  public getPrograms(): Promise<ManagedProgramDto[]> {
    return this.site.content.listPrograms(false)
  }

  @Post('programs')
  @ApiCreatedResponse({ type: ManagedProgramDto })
  @ApiOperation({
    operationId: 'adminCreateProgram',
    summary: 'Создать программу',
  })
  @ApiBody({ type: WriteProgramDto })
  public createProgram(
    @Body() input: WriteProgramDto,
  ): Promise<ManagedProgramDto> {
    return this.site.content.saveProgram(input)
  }

  @Put('programs/:id')
  @ApiOkResponse({ type: ManagedProgramDto })
  @ApiOperation({
    operationId: 'adminUpdateProgram',
    summary: 'Обновить программу',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: WriteProgramDto })
  public updateProgram(
    @Param('id') id: string,
    @Body() input: WriteProgramDto,
  ): Promise<ManagedProgramDto> {
    return this.site.content.saveProgram(input, id)
  }

  @Delete('programs/:id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({
    operationId: 'adminDeleteProgram',
    summary: 'Удалить программу',
  })
  @ApiParam({ name: 'id', type: String })
  public deleteProgram(@Param('id') id: string): Promise<void> {
    return this.site.content.deleteProgram(id)
  }
}

@Controller('admin/consultations')
@ApiTags('admin consultations')
@RequirePermission(MANAGE_CONSULTATIONS)
@ApiCookieAuth('sessionCookie')
@ApiSecurity('csrfToken')
export class AdminConsultationsController {
  public constructor(
    @Inject(ConsultationsService)
    private readonly consultations: ConsultationsService,
  ) {}

  @Get()
  @ApiOkResponse({ type: ConsultationPageDto })
  @ApiOperation({
    operationId: 'adminListConsultations',
    summary: 'Список заявок с фильтрами',
  })
  @ApiQuery({ name: 'page', type: Number, required: false, minimum: 1 })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @ApiQuery({
    name: 'status',
    enum: ['NEW', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'],
    required: false,
  })
  @ApiQuery({ name: 'search', type: String, required: false })
  public list(
    @Query() filters: ConsultationQueryDto,
  ): Promise<ConsultationPageDto> {
    return this.consultations.requests.list(filters)
  }

  @Get(':id')
  @ApiOkResponse({ type: AdminConsultationDto })
  @ApiOperation({
    operationId: 'adminGetConsultation',
    summary: 'Просмотреть заявку',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  public async get(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AdminConsultationDto> {
    const request = await this.consultations.requests.find(id)
    if (request === undefined) throw new SiteRecordNotFoundError()
    return request
  }

  @Patch(':id')
  @ApiOkResponse({ type: AdminConsultationDto })
  @ApiOperation({
    operationId: 'adminUpdateConsultation',
    summary: 'Изменить статус или заметку заявки',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateConsultationDto })
  public update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateConsultationDto,
  ): Promise<AdminConsultationDto> {
    return this.consultations.requests.update(id, input)
  }

  @Post(':id/telegram/retry')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiOperation({
    operationId: 'adminRetryTelegram',
    summary: 'Повторить неудачную отправку в Telegram',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  public retry(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.consultations.requests.retryDelivery(id)
  }
}
