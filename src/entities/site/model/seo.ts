import type {
  ArticleDto,
  PageSeoDto,
  SeoPagesDto,
  SeoSettingsDto,
  SiteSettingsDto,
} from '@/shared/api';

export const seoPagePaths: Record<keyof SeoPagesDto, string> = {
  home: '/',
  about: '/about/',
  coaching: '/coaching/',
  contacts: '/contacts/',
  journal: '/journal/',
  privacy: '/privacy/',
};

function clean(...values: (string | undefined)[]): string {
  for (const value of values) {
    const text = value?.replace(/\s+/gu, ' ').trim();
    if (text) return text;
  }
  return '';
}

function siteOrigin(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

function imageUrl(value: string, origin?: string): string | undefined {
  if (/^https:\/\//u.test(value)) return value;
  if (!/^\/(?!\/)/u.test(value)) return undefined;
  return origin ? new URL(value, origin).href : value;
}

export function resolvePageSeo({
  settings,
  seo,
  pathname,
  page,
  article,
  title,
  description,
  noIndex = false,
}: {
  settings: SiteSettingsDto;
  seo: SeoSettingsDto;
  pathname: string;
  page?: keyof SeoPagesDto;
  article?: ArticleDto;
  title?: string;
  description?: string;
  noIndex?: boolean;
}) {
  const metadata: PageSeoDto | undefined =
    article?.seo ?? (page ? seo.pages[page] : undefined);
  const articleTitle = clean(article?.title);
  const articlePageTitle = articleTitle
    ? [articleTitle, clean(settings.name, seo.siteName)]
        .filter(Boolean)
        .join(' — ')
    : undefined;
  const resolvedTitle = clean(
    metadata?.title,
    title,
    articlePageTitle,
    article ? seo.siteName : settings.name,
    settings.name,
    seo.siteName,
  );
  const resolvedDescription = clean(
    metadata?.description,
    description,
    article?.description,
    settings.description,
    seo.pages.home.description,
  );
  const origin = siteOrigin(seo.siteUrl);
  const canonical = origin ? new URL(pathname, origin).href : undefined;
  const image = imageUrl(
    clean(metadata?.ogImage, article?.coverImage, seo.defaultImage),
    origin,
  );
  const imageAlt = clean(
    metadata?.ogImageAlt,
    article?.coverAlt,
    seo.defaultImageAlt,
  );
  const indexing = Boolean(
    origin && seo.allowIndexing && !metadata?.noIndex && !noIndex,
  );
  const person = {
    '@type': 'Person',
    ...(origin ? { '@id': `${origin}/#person`, url: `${origin}/about/` } : {}),
    name: settings.name,
    jobTitle: settings.profession,
  };
  const website = {
    '@type': 'WebSite',
    ...(origin ? { '@id': `${origin}/#website`, url: `${origin}/` } : {}),
    name: seo.siteName,
    description: settings.description,
    inLanguage: 'ru-RU',
    publisher: origin ? { '@id': `${origin}/#person` } : person,
  };
  const webpage = {
    '@type': article
      ? 'BlogPosting'
      : page === 'about'
        ? 'AboutPage'
        : page === 'contacts'
          ? 'ContactPage'
          : page === 'journal'
            ? 'CollectionPage'
            : 'WebPage',
    ...(canonical
      ? {
          '@id': canonical,
          url: canonical,
          isPartOf: { '@id': `${origin}/#website` },
        }
      : {}),
    ...(article
      ? {
          headline: clean(article.title, resolvedTitle),
          author: origin ? { '@id': `${origin}/#person` } : person,
          mainEntityOfPage: canonical,
        }
      : {}),
    name: resolvedTitle,
    description: resolvedDescription,
    inLanguage: 'ru-RU',
    ...(image ? { image } : {}),
  };
  const breadcrumbs =
    canonical && page !== 'home'
      ? {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Главная',
              item: `${origin}/`,
            },
            ...(article
              ? [
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Журнал',
                    item: `${origin}/journal/`,
                  },
                ]
              : []),
            {
              '@type': 'ListItem',
              position: article ? 3 : 2,
              name: clean(article?.title, resolvedTitle),
              item: canonical,
            },
          ],
        }
      : undefined;
  return {
    title: resolvedTitle,
    description: resolvedDescription,
    ogTitle: clean(metadata?.ogTitle, resolvedTitle),
    ogDescription: clean(metadata?.ogDescription, resolvedDescription),
    siteName: seo.siteName,
    type: article ? 'article' : 'website',
    canonical,
    image,
    imageAlt,
    robots: indexing
      ? 'index, follow, max-image-preview:large'
      : 'noindex, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        person,
        website,
        webpage,
        ...(breadcrumbs ? [breadcrumbs] : []),
      ],
    },
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</gu, '\\u003c')
    .replace(/>/gu, '\\u003e')
    .replace(/&/gu, '\\u0026')
    .replace(/\u2028/gu, '\\u2028')
    .replace(/\u2029/gu, '\\u2029');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;');
}

export function sitemapXml(
  seo: SeoSettingsDto,
  articles: ArticleDto[],
): string {
  const origin = siteOrigin(seo.siteUrl);
  const paths =
    origin && seo.allowIndexing
      ? [
          ...Object.entries(seoPagePaths)
            .filter(([key]) => !seo.pages[key as keyof SeoPagesDto].noIndex)
            .map(([, path]) => path),
          ...articles
            .filter((article) => !article.seo?.noIndex)
            .map((article) => `/journal/${encodeURIComponent(article.slug)}/`),
        ]
      : [];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escapeXml(new URL(path, origin).href)}</loc></url>`).join('')}</urlset>\n`;
}

export function robotsTxt(seo: SeoSettingsDto): string {
  const origin = siteOrigin(seo.siteUrl);
  return origin && seo.allowIndexing
    ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /v1/\nSitemap: ${origin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
}
