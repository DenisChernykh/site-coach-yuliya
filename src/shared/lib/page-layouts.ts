import type { CmsPageDto } from '../api/generated/model';

const blocks = {
  home: [
    'hero',
    'stories',
    'concerns',
    'about',
    'approach',
    'pricing',
    'process',
    'boundaries',
    'cases',
    'art',
    'products',
    'articles',
    'faq',
    'contact',
  ],
  about: ['hero', 'history', 'education', 'approach', 'boundaries', 'cta'],
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
