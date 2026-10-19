import type { ConsultationSource } from './consultation'
import type { StoryGroup } from './stories'

export interface NavigationItemDto {
  readonly label: string
  readonly href: string
}

export interface SiteSettingsDto {
  readonly name: string
  readonly profession: string
  readonly description: string
  readonly navigation: NavigationItemDto[]
}

export interface PageSeoDto {
  readonly title: string
  readonly description: string
  readonly ogTitle: string
  readonly ogDescription: string
  readonly ogImage: string
  readonly ogImageAlt: string
  readonly noIndex: boolean
}

export interface SeoPagesDto {
  readonly home: PageSeoDto
  readonly about: PageSeoDto
  readonly coaching: PageSeoDto
  readonly contacts: PageSeoDto
  readonly journal: PageSeoDto
  readonly privacy: PageSeoDto
}

export interface SeoSettingsDto {
  readonly siteName: string
  readonly siteUrl: string | null
  readonly defaultImage: string
  readonly defaultImageAlt: string
  readonly allowIndexing: boolean
  readonly pages: SeoPagesDto
}

export interface HeroDto {
  readonly eyebrow: string
  readonly headingLines: string[]
  readonly description: string
  readonly meetingNote: string
}

export interface ConcernDto {
  readonly id: string
  readonly title: string
  readonly description: string
}

export interface AboutDto {
  readonly eyebrow: string
  readonly title: string
  readonly paragraphs: string[]
}

export interface StepDto {
  readonly title: string
  readonly description: string
}

export interface ApproachDto {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly quote: string
  readonly steps: StepDto[]
}

export interface CaseStudyDto {
  readonly id: string
  readonly title: string
  readonly request: string
  readonly exploration: string
  readonly result: string
  readonly details: string
}

export interface ArtPracticeDto {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly details: string[]
}

export interface ProductDto {
  readonly id: string
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly actionLabel: string
}

export interface HomePageDto {
  readonly stories?: StoryGroup[]
  readonly hero: HeroDto
  readonly concerns: ConcernDto[]
  readonly about: AboutDto
  readonly approach: ApproachDto
  readonly process: StepDto[]
  readonly caseStudies: CaseStudyDto[]
  readonly artPractice: ArtPracticeDto
  readonly products: ProductDto[]
}

export interface ServiceDto {
  readonly id: string
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly price: number
  readonly priceNote: string
  readonly features: string[]
}

export interface ArticleSectionDto {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly paragraphs: string[]
}

export interface ArticleDto {
  readonly seo?: PageSeoDto
  readonly bodyMarkdown?: string
  readonly previewTitle?: string
  readonly previewDescription?: string
  readonly listingDescription?: string
  readonly slug: string
  readonly topic: 'finding-work' | 'showing-up'
  readonly topicLabel: string
  readonly title: string
  readonly description: string
  readonly coverImage: string
  readonly coverAlt: string
  readonly intro: string
  readonly storyTitle: string
  readonly story: string[]
  readonly quote: string
  readonly quoteNote: string
  readonly sections: ArticleSectionDto[]
  readonly practiceTitle: string
  readonly practiceQuestions: string[]
  readonly ctaTitle: string
  readonly ctaDescription: string
}

export interface FaqItemDto {
  readonly id: string
  readonly question: string
  readonly answer: string
}

export interface SocialLinkDto {
  readonly id: SocialNetwork
  readonly label: string
  readonly url: string | null
}

export interface ConsultationRequestDto {
  readonly website?: string
  readonly name: string
  readonly contact: string
  readonly message?: string
  readonly consent: true
  readonly serviceId?: string
  readonly source?: ConsultationSource
}

export interface ConsultationResultDto {
  readonly status: 'preview' | 'accepted'
  readonly message: string
}

export interface ContactDetailsDto {
  readonly email: string | null
  readonly phone: string | null
  readonly telegramUrl: string | null
  readonly address: string | null
}

export const socialNetworks = [
  'telegram',
  'whatsapp',
  'max',
  'vk',
  'ok',
  'instagram',
  'facebook',
  'threads',
  'x',
  'youtube',
  'rutube',
  'tiktok',
  'dzen',
  'linkedin',
  'pinterest',
  'viber',
  'discord',
  'twitch',
] as const
export type SocialNetwork = (typeof socialNetworks)[number]
