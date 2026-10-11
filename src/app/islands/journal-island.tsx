import type { ArticleDto } from '@/entities/article';
import { JournalList } from '@/widgets/journal-list';
import { QueryProvider } from '../providers/query-provider';

export function JournalIsland({ articles }: { articles: ArticleDto[] }) {
  return (
    <QueryProvider>
      <JournalList initialArticles={articles} />
    </QueryProvider>
  );
}
