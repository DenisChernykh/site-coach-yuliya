import type { ComponentProps } from 'react';
import { StoriesFeed } from '@/widgets/stories';
import { QueryProvider } from '../providers/query-provider';

export function StoriesIsland(props: ComponentProps<typeof StoriesFeed>) {
  return (
    <QueryProvider>
      <StoriesFeed {...props} />
    </QueryProvider>
  );
}
