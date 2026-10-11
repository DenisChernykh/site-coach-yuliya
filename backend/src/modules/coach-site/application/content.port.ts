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

export interface WriteArticle {
  readonly content: Omit<ArticleDto, 'slug'> & { readonly slug?: string }
  readonly published: boolean
  readonly sortOrder: number
}
export interface WriteProgram {
  readonly content: Omit<ServiceDto, 'id'> & { readonly id?: string }
  readonly published: boolean
  readonly sortOrder: number
}

export interface SiteContentPort {
  getSettings(): Promise<SiteSettingsDto>
  updateSettings(settings: SiteSettingsDto): Promise<SiteSettingsDto>
  getContacts(): Promise<ContactDetailsDto>
  updateContacts(
    contacts: ContactDetailsDto,
    links?: SocialLinkDto[],
  ): Promise<ContactDetailsDto>
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
