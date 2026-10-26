import demoStoryMedia from '../api/mocks/story-media.json';
import { withBase } from '../routes';

export function storyMediaUrl(
  id: string,
  baseUrl?: string,
  variant?: 'preview' | 'mobile',
): string {
  if (
    !baseUrl &&
    import.meta.env?.PUBLIC_DATA_SOURCE !== 'api' &&
    Object.hasOwn(demoStoryMedia, id)
  ) {
    return withBase(demoStoryMedia[id as keyof typeof demoStoryMedia]);
  }
  const origin =
    baseUrl ??
    (import.meta.env?.PUBLIC_API_BASE_URL ||
      (import.meta.env?.DEV ? 'http://127.0.0.1:3000' : ''));
  return `${origin.replace(/\/$/, '')}/v1/story-media/${encodeURIComponent(id)}?variant=${variant ?? 'optimized'}`;
}
