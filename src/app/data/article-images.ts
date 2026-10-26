import { getImage } from 'astro:assets';
import { art, landscape } from '@/shared/assets';
import type { ArticleDto } from '@/entities/article';
import { articleCoverUrl } from '@/shared/lib/article-cover-url';

export async function resolveArticleImages(
  articles: ArticleDto[],
  width = 1280,
): Promise<ArticleDto[]> {
  return Promise.all(
    articles.map(async (article) => {
      const source =
        article.coverImage === 'landscape'
          ? landscape
          : article.coverImage === 'art'
            ? art
            : undefined;
      if (!source)
        return { ...article, coverImage: articleCoverUrl(article.coverImage) };
      const image = await getImage({
        src: source,
        width,
        format: 'webp',
        quality: 85,
      });
      return { ...article, coverImage: image.src };
    }),
  );
}
