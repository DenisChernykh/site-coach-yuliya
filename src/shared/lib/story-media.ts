export function storyMediaUrl(
  id: string,
  baseUrl = import.meta.env.PUBLIC_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:3000' : ''),
): string {
  return `${baseUrl.replace(/\/$/, '')}/v1/story-media/${encodeURIComponent(id)}`;
}
