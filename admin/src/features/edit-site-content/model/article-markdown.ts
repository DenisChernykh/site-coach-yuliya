import type { ArticleDto } from '@/shared/api'
export function articleMarkdown(article: ArticleDto): string {
  if (article.bodyMarkdown !== undefined) return article.bodyMarkdown
  return [
    article.intro,
    article.storyTitle && `## ${article.storyTitle}`,
    ...article.story,
    article.quote && `> ${article.quote}`,
    article.quoteNote && `_${article.quoteNote}_`,
    ...article.sections.flatMap((section) => [
      `## ${section.title}`,
      ...section.paragraphs,
    ]),
  ]
    .filter(Boolean)
    .join('\n\n')
}
