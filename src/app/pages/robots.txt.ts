import type { APIRoute } from 'astro';
import { loadSeoSettings, robotsTxt } from '@/entities/site';

export const GET: APIRoute = async () =>
  new Response(robotsTxt(await loadSeoSettings()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
