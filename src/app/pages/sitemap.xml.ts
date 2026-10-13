import type { APIRoute } from 'astro';
import { loadSeoSettings, sitemapXml } from '@/entities/site';
import { loadArticles } from '@/entities/article';

export const GET: APIRoute = async () => {
  const [seo, articles] = await Promise.all([
    loadSeoSettings(),
    loadArticles(),
  ]);
  return new Response(sitemapXml(seo, articles), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
