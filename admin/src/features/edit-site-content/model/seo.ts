import type { ArticleDto, CmsDocumentDto, PageSeoDto } from '@/shared/api'

export const emptyPageSeo: PageSeoDto = {
  title: '',
  description: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogImageAlt: '',
  noIndex: false,
}

export function firstSeoText(...values: (string | undefined)[]): string {
  for (const value of values) {
    const text = value?.replace(/\s+/gu, ' ').trim()
    if (text) return text
  }
  return ''
}

export function articleSeoFallbacks(
  article: Pick<
    ArticleDto,
    'title' | 'description' | 'coverImage' | 'coverAlt'
  >,
  workspace?: Pick<CmsDocumentDto, 'site' | 'seo'>,
): Partial<PageSeoDto> {
  const title = firstSeoText(article.title)
  const author = firstSeoText(workspace?.site.name, workspace?.seo.siteName)
  const cover = firstSeoText(article.coverImage)
  return {
    title: title
      ? [title, author].filter(Boolean).join(' — ')
      : firstSeoText(workspace?.seo.siteName, workspace?.site.name),
    description: firstSeoText(
      article.description,
      workspace?.site.description,
      workspace?.seo.pages.home.description,
    ),
    ogImage: ['art', 'landscape'].includes(cover)
      ? undefined
      : firstSeoText(cover, workspace?.seo.defaultImage),
    ogImageAlt: firstSeoText(article.coverAlt, workspace?.seo.defaultImageAlt),
  }
}
