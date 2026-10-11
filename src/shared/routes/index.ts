export const routes = {
  home: '/',
  coaching: '/coaching/',
  journal: '/journal/',
  contact: '/#contact',
  privacy: '/privacy/',
  article: (slug: string) => `/journal/${encodeURIComponent(slug)}/`,
} as const;
