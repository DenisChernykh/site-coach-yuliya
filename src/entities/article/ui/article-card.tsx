import { ArrowUpRight } from 'lucide-react';
import type { ArticleDto } from '@/shared/api';
import { routes } from '@/shared/routes';
import { articleCoverUrl } from '@/shared/lib/article-cover-url';
import styles from './article-card.module.css';

export function ArticleCard({
  article,
  variant = 'preview',
}: {
  article: ArticleDto;
  variant?: 'preview' | 'feature' | 'row';
}) {
  const title =
    variant === 'preview'
      ? article.previewTitle || article.title
      : article.title;
  const description =
    variant === 'preview'
      ? article.previewDescription || article.description
      : article.listingDescription || article.description;
  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      <div
        className={`${styles.inner} ${variant === 'preview' ? '' : 'page-container'}`}
      >
        <a
          href={routes.article(article.slug)}
          className={styles.cover}
          tabIndex={-1}
          aria-hidden="true"
        >
          <img
            src={articleCoverUrl(article.coverImage)}
            alt={article.coverAlt}
            width={640}
            height={280}
            loading="lazy"
          />
        </a>
        <div className={styles.copy}>
          <p className="eyebrow">{article.topicLabel}</p>
          <h2>
            <a
              href={routes.article(article.slug)}
              className="hover:underline hover:decoration-1 hover:underline-offset-4"
            >
              {title}
            </a>
          </h2>
          <p className={styles.description}>{description}</p>
          <a
            href={routes.article(article.slug)}
            className="text-link"
            aria-label={`Читать статью: ${article.title}`}
          >
            Читать статью{' '}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
