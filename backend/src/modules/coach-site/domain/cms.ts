import type {
  ArticleDto,
  ContactDetailsDto,
  FaqItemDto,
  HomePageDto,
  ServiceDto,
  SiteSettingsDto,
  SeoSettingsDto,
  SocialLinkDto,
} from './content'

export const pageBlocks = {
  home: [
    'hero',
    'concerns',
    'about',
    'approach',
    'pricing',
    'process',
    'boundaries',
    'cases',
    'art',
    'products',
    'articles',
    'faq',
    'contact',
  ],
  about: ['hero', 'history', 'approach', 'boundaries', 'cta'],
  coaching: [
    'hero',
    'requests',
    'pricing',
    'process',
    'boundaries',
    'faq',
    'contact',
  ],
  contacts: ['hero', 'contact', 'details', 'faq'],
  journal: ['hero', 'articles', 'cta'],
} as const
export type CmsPageKey = keyof typeof pageBlocks
export interface CmsBlock {
  id: string
  enabled: boolean
  title?: string
  description?: string
  eyebrow?: string
  note?: string
}
export interface CmsPage {
  key: CmsPageKey
  blocks: CmsBlock[]
}
export const initialPages = (): CmsPage[] =>
  Object.entries(pageBlocks).map(([key, ids]) => ({
    key: key as CmsPageKey,
    blocks: ids.map((id) => ({ id, enabled: true })),
  }))
export function validPages(pages: CmsPage[]): boolean {
  return (
    pages.length === Object.keys(pageBlocks).length &&
    new Set(pages.map((p) => p.key)).size === pages.length &&
    pages.every((page) => {
      const allowed: readonly string[] | undefined = pageBlocks[page.key]
      return (
        allowed !== undefined &&
        page.blocks.length === allowed.length &&
        new Set(page.blocks.map((b) => b.id)).size === allowed.length &&
        page.blocks.every((b) => allowed.includes(b.id)) &&
        page.blocks[0]?.id === 'hero' &&
        page.blocks[0].enabled
      )
    })
  )
}
export interface CmsPageContent {
  site: SiteSettingsDto
  contacts: ContactDetailsDto
  home: HomePageDto
  faq: FaqItemDto[]
  socials: SocialLinkDto[]
  pages: CmsPage[]
}
export interface CmsArticle {
  id: string
  content: ArticleDto
  published: boolean
  sortOrder: number
  updatedAt: string
}
export interface CmsProgram {
  id: string
  content: ServiceDto
  published: boolean
  sortOrder: number
  updatedAt: string
}
export interface CmsDocument extends CmsPageContent {
  seo: SeoSettingsDto
  articles: CmsArticle[]
  programs: CmsProgram[]
}
export interface CmsWorkspace {
  revision: number
  publishedRevision: number
  content: CmsDocument
}
