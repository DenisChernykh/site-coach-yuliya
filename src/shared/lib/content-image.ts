import { withBase } from '../routes';

export function contentImageUrl(
  path: string,
  mediaBaseUrl?: string,
  variant?: 'preview' | 'mobile',
): string {
  if (/^\/v1\/story-media\/[a-zA-Z0-9-]+$/.test(path)) {
    const base = mediaBaseUrl ?? import.meta.env?.PUBLIC_API_BASE_URL ?? '';
    return `${base.replace(/\/$/, '')}${path}?variant=${variant ?? 'optimized'}`;
  }
  if (/^https:\/\//.test(path)) return path;
  if (/^\/(?!\/)/.test(path)) return withBase(path);
  return '';
}
