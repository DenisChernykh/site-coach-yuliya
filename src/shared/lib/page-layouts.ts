import type { CmsPageDto } from '../api/generated/model';

const blocks = {
  home: [
    'hero',
    'stories',
    'concerns',
    'about',
    'pricing',
    'group',
    'practices',
    'process',
    'cases',
    'art',
    'articles',
    'faq',
    'contact',
  ],
  about: ['hero', 'history', 'education', 'cta'],
  coaching: [
    'hero',
    'requests',
    'pricing',
    'process',
    'boundaries',
    'faq',
    'contact',
  ],
  contacts: ['hero', 'contact', 'details', 'faq'],
  journal: ['hero', 'articles', 'cta'],
} as const;
export type CmsPageKey = keyof typeof blocks;
export const defaultPageLayouts = (): CmsPageDto[] =>
  Object.entries(blocks).map(([key, ids]) => ({
    key: key as CmsPageKey,
    blocks: ids.map((id) => ({ id, enabled: true })),
  }));

export function currentPageLayouts(pages: CmsPageDto[]): CmsPageDto[] {
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.flatMap((block) => {
      if (
        ['home', 'about'].includes(page.key) &&
        ['approach', 'boundaries'].includes(block.id)
      )
        return [];
      if (page.key === 'home' && block.id === 'products') {
        return ['group', 'practices']
          .filter((id) => !page.blocks.some((item) => item.id === id))
          .map((id) => ({ id, enabled: block.enabled }));
      }
      return [block];
    }),
  }));
}
