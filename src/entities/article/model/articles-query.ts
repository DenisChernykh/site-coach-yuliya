import { isMockMode, useGetArticles, type ArticleDto } from '@/shared/api';

export function useArticles(initialData: ArticleDto[]) {
  return useGetArticles(undefined, {
    query: {
      initialData,
      enabled: !isMockMode,
      staleTime: isMockMode ? Infinity : 60_000,
    },
  });
}
