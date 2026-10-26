export function withBase(
  path: string,
  base = import.meta.env?.BASE_URL ?? '/',
): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const prefix = base.replace(/\/$/u, '');
  if (!prefix || path === prefix || path.startsWith(`${prefix}/`)) return path;
  return `${prefix}${path}`;
}

export const routes = {
  home: withBase('/'),
  about: withBase('/about/'),
  contacts: withBase('/contacts/'),
  coaching: withBase('/coaching/'),
  journal: withBase('/journal/'),
  contact: withBase('/contacts/#contact'),
  privacy: withBase('/privacy/'),
  consent: withBase('/consent/'),
  terms: withBase('/terms/'),
  article: (slug: string) => withBase(`/journal/${encodeURIComponent(slug)}/`),
} as const;
