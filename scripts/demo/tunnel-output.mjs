export function findTunnelOrigin(output, provider) {
  const pattern =
    provider === 'localhost-run'
      ? /https:\/\/[a-z0-9-]+\.lhr\.life\b/u
      : /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com\b/u;
  const match = output.match(pattern);
  return match ? new URL(match[0]) : undefined;
}
