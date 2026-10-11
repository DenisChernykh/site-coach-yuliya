import { useState } from 'react';
import {
  ArticleCard,
  useArticles,
  type ArticleDto,
  type ArticleDtoTopic,
} from '@/entities/article';
import { Button, Alert, AlertDescription } from '@/shared/ui';

const topics = [
  { value: 'all', label: 'Все материалы' },
  { value: 'finding-work', label: 'Поиск своего дела' },
  { value: 'showing-up', label: 'Проявленность' },
] as const;

export function JournalList({
  initialArticles,
}: {
  initialArticles: ArticleDto[];
}) {
  const [topic, setTopic] = useState<ArticleDtoTopic | 'all'>('all');
  const query = useArticles(initialArticles);
  const articles = (query.data ?? initialArticles).filter(
    (article) => topic === 'all' || article.topic === topic,
  );
  return (
    <div className="journal-list">
      <div className="page-container pb-12 pt-6 max-md:pb-9">
        <div
          className="flex gap-3 max-md:flex-col max-md:items-start max-md:gap-4"
          role="group"
          aria-label="Темы журнала"
        >
          {topics.map((item) => (
            <Button
              key={item.value}
              onClick={() => setTopic(item.value)}
              variant={topic === item.value ? 'default' : 'outline'}
              aria-pressed={topic === item.value}
              className="h-11 px-5 text-[13px] font-normal leading-[1.5]"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      {query.isError ? (
        <Alert variant="destructive" className="page-container mb-6">
          <AlertDescription>
            Не удалось обновить журнал. Попробуй открыть страницу ещё раз.
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
          В этой теме пока нет материалов.
        </p>
      ) : null}
    </div>
  );
}
