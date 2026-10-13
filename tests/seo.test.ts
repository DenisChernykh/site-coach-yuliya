import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePageSeo,
  robotsTxt,
  sitemapXml,
  serializeJsonLd,
} from '../src/entities/site/model/seo';
import {
  seoSettings,
  siteSettings,
  articles,
} from '../src/shared/api/mocks/data';
import { getSeoSettings } from '../src/shared/api/generated/seo/seo';
import type { ArticleDto } from '../src/shared/api/generated/model';

function configured() {
  return {
    ...structuredClone(seoSettings),
    siteUrl: 'https://coach.example.com',
  };
}

test('generated SEO API works in mock mode and returns independent data', async () => {
  const seo = await getSeoSettings();
  assert.equal(Object.keys(seo.pages).length, 6);
  seo.pages.home.title = 'Changed';
  assert.notEqual((await getSeoSettings()).pages.home.title, 'Changed');
});

test('page metadata uses saved SEO and canonical ignores the rendering origin', () => {
  const seo = configured();
  seo.pages.home.title = 'Сохранённый SEO-заголовок';
  seo.pages.home.ogTitle = 'Отдельное превью';
  const result = resolvePageSeo({
    settings: siteSettings,
    seo,
    pathname: '/',
    page: 'home',
  });
  assert.equal(result.title, 'Сохранённый SEO-заголовок');
  assert.equal(result.ogTitle, 'Отдельное превью');
  assert.equal(result.canonical, 'https://coach.example.com/');
  assert.equal(result.image, 'https://coach.example.com/og/coach-yuliya.jpg');
  assert.equal(result.type, 'website');
  assert.match(result.robots, /^index, follow/u);
});

test('article SEO overrides editorial title and blank values inherit content and cover', () => {
  const article = {
    ...articles[0]!,
    seo: {
      title: 'SEO статьи',
      description: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      ogImageAlt: '',
      noIndex: false,
    },
  };
  const result = resolvePageSeo({
    settings: siteSettings,
    seo: configured(),
    pathname: `/journal/${article.slug}/`,
    article,
  });
  assert.equal(result.title, 'SEO статьи');
  assert.equal(result.description, article.description);
  assert.equal(result.ogTitle, 'SEO статьи');
  assert.equal(result.type, 'article');
  assert.equal(result.jsonLd['@graph'][2]?.['@type'], 'BlogPosting');
  assert.equal(result.imageAlt, article.coverAlt);
  article.seo.title = '';
  assert.equal(
    resolvePageSeo({
      settings: siteSettings,
      seo: configured(),
      pathname: '/journal/example/',
      article,
    }).title,
    `${article.title.replace(/\s+/gu, ' ')} — ${siteSettings.name}`,
  );
});

test('indexing respects domain readiness, global switch, page flag, and 404', () => {
  for (const seo of [
    { ...configured(), siteUrl: null },
    { ...configured(), allowIndexing: false },
  ]) {
    assert.equal(
      resolvePageSeo({
        settings: siteSettings,
        seo,
        pathname: '/',
        page: 'home',
      }).robots,
      'noindex, follow',
    );
    assert.match(robotsTxt(seo), /Disallow: \/\n/u);
    assert.doesNotMatch(sitemapXml(seo, articles), /<loc>/u);
  }
  const seo = configured();
  assert.equal(
    resolvePageSeo({
      settings: siteSettings,
      seo,
      pathname: '/privacy/',
      page: 'privacy',
    }).robots,
    'noindex, follow',
  );
  assert.equal(
    resolvePageSeo({
      settings: siteSettings,
      seo,
      pathname: '/404/',
      noIndex: true,
    }).robots,
    'noindex, follow',
  );
  assert.equal(
    resolvePageSeo({
      settings: siteSettings,
      seo: seoSettings,
      pathname: '/',
      page: 'home',
    }).canonical,
    undefined,
  );
});

test('sitemap excludes noindex pages and articles while robots points to the same domain', () => {
  const seo = configured();
  const published: ArticleDto[] = structuredClone(articles);
  published[0]!.seo = { ...seo.pages.home, noIndex: true };
  const xml = sitemapXml(seo, published);
  assert.match(xml, /https:\/\/coach.example.com\/coaching\//u);
  assert.match(xml, /https:\/\/coach.example.com\/journal\/showing-up\//u);
  assert.doesNotMatch(
    xml,
    /privacy|finding-your-work|admin|404|social-links-check/u,
  );
  assert.match(
    robotsTxt(seo),
    /Sitemap: https:\/\/coach.example.com\/sitemap.xml/u,
  );
  assert.match(robotsTxt(seo), /Disallow: \/admin\//u);
});

test('JSON-LD cannot close its script when an editor enters HTML', () => {
  const value = { title: '</script><script>alert("x")</script>&\u2028' };
  const serialized = serializeJsonLd(value);
  assert.doesNotMatch(serialized, /<|>|&|\u2028/u);
  assert.deepEqual(JSON.parse(serialized), value);
});
