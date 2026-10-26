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
    'stories',
    'concerns',
    'about',
    'approach',
    'pricing',
    'products',
    'process',
    'boundaries',
    'cases',
    'art',
    'articles',
    'faq',
    'contact',
  ],
  about: ['hero', 'history', 'education', 'approach', 'boundaries', 'cta'],
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
export function withStoriesBlock(pages: CmsPage[]): CmsPage[] {
  return pages.map((page) =>
    page.key === 'home' && !page.blocks.some((block) => block.id === 'stories')
      ? {
          ...page,
          blocks: [
            page.blocks[0]!,
            { id: 'stories', enabled: true },
            ...page.blocks.slice(1),
          ],
        }
      : page,
  )
}
export function withEducationBlock(pages: CmsPage[]): CmsPage[] {
  return pages.map((page) => {
    if (
      page.key !== 'about' ||
      page.blocks.some((block) => block.id === 'education')
    )
      return page
    const index = page.blocks.findIndex((block) => block.id === 'history')
    const after = index < 0 ? 1 : index + 1
    return {
      ...page,
      blocks: [
        ...page.blocks.slice(0, after),
        { id: 'education', enabled: true },
        ...page.blocks.slice(after),
      ],
    }
  })
}
export interface EditorialNote {
  materialId: string
  source: string
}
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
  editorialNotes?: EditorialNote[]
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
