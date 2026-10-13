import type { ArticleDto, PageSeoDto } from './content'

function text(value: string, limit: number): string {
  return value.replace(/\s+/gu, ' ').trim().slice(0, limit)
}

export function initialArticleSeo(
  article: ArticleDto,
  author: string,
): PageSeoDto {
  const title = text(`${article.title} — ${author}`, 120)
  const description = text(article.description, 320)
  return {
    title,
    description,
    ogTitle: text(article.title, 120),
    ogDescription: description,
    ogImage: ['art', 'landscape'].includes(article.coverImage)
      ? ''
      : article.coverImage,
    ogImageAlt: text(article.coverAlt, 300),
    noIndex: false,
  }
}
