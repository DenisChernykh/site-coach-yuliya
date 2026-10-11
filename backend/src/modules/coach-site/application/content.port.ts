import type {
  ArticleDto,
  ContactDetailsDto,
  FaqItemDto,
  HomePageDto,
  ServiceDto,
  SiteSettingsDto,
  SocialLinkDto,
} from '../domain/content'

export interface ManagedArticle {
  readonly id: string
  readonly content: ArticleDto
  readonly published: boolean
  readonly sortOrder: number
  readonly updatedAt: Date
}

export interface ManagedProgram {
  readonly id: string
  readonly content: ServiceDto
  readonly published: boolean
  readonly sortOrder: number
  readonly updatedAt: Date
}

export type WriteArticle = Pick<
  ManagedArticle,
  'content' | 'published' | 'sortOrder'
>
export type WriteProgram = Pick<
  ManagedProgram,
  'content' | 'published' | 'sortOrder'
>

export interface SiteContentPort {
  getSettings(): Promise<SiteSettingsDto>
  updateSettings(settings: SiteSettingsDto): Promise<SiteSettingsDto>
  getContacts(): Promise<ContactDetailsDto>
  updateContacts(contacts: ContactDetailsDto): Promise<ContactDetailsDto>
  getHome(): Promise<HomePageDto>
  updateHome(home: HomePageDto): Promise<HomePageDto>
  getFaq(): Promise<FaqItemDto[]>
  updateFaq(faq: FaqItemDto[]): Promise<FaqItemDto[]>
  getSocials(): Promise<SocialLinkDto[]>
  updateSocials(socials: SocialLinkDto[]): Promise<SocialLinkDto[]>
  listArticles(
    publishedOnly: boolean,
    topic?: string,
  ): Promise<ManagedArticle[]>
  findPublishedArticle(slug: string): Promise<ArticleDto | undefined>
  saveArticle(input: WriteArticle, id?: string): Promise<ManagedArticle>
  deleteArticle(id: string): Promise<void>
  listPrograms(publishedOnly: boolean): Promise<ManagedProgram[]>
  findPublishedProgram(id: string): Promise<ServiceDto | undefined>
  saveProgram(input: WriteProgram, id?: string): Promise<ManagedProgram>
  deleteProgram(id: string): Promise<void>
}
