export function articleCoverUrl(
  value: string,
  apiBase = import.meta.env?.PUBLIC_API_BASE_URL ?? '',
): string {
  return value.startsWith('/v1/story-media/')
    ? `${apiBase.replace(/\/$/, '')}${value}${value.includes('?') ? '' : '?variant=optimized'}`
    : value;
}
