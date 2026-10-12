export const routes = {
  home: '/',
  about: '/about/',
  contacts: '/contacts/',
  coaching: '/coaching/',
  journal: '/journal/',
  contact: '/contacts/#contact',
  privacy: '/privacy/',
  article: (slug: string) => `/journal/${encodeURIComponent(slug)}/`,
} as const;
