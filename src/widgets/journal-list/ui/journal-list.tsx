import { ArticleCard, useArticles, type ArticleDto } from '@/entities/article';
import { Alert, AlertDescription } from '@/shared/ui';
import { getJournalErrorMessage } from '../model/errors';

export function JournalList({
  initialArticles,
}: {
  initialArticles: ArticleDto[];
}) {
  const query = useArticles(initialArticles);
  const articles = query.data ?? initialArticles;
  return (
    <div className="journal-list">
      {query.isError ? (
        <Alert variant="destructive" className="page-container mb-6">
          <AlertDescription>
            {getJournalErrorMessage(query.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Показано материалов: {articles.length}
      </div>
      <div>
        {articles.map((article, index) => (
          <ArticleCard
            key={article.slug}
            article={article}
            variant={index === 0 ? 'feature' : 'row'}
          />
        ))}
      </div>
      {articles.length === 0 ? (
        <p className="page-container py-12 text-muted-foreground">
          В журнале пока нет статей.
        </p>
      ) : null}
    </div>
  );
}
