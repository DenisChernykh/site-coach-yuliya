export function findTunnelOrigin(output, provider) {
  if (provider === 'vscode') {
    for (const line of output.split(/\r?\n/u)) {
      try {
        const { port_format: format } = JSON.parse(line);
        if (typeof format !== 'string') continue;
        const url = new URL(format.replace('{port}', '8787'));
        if (
          url.protocol === 'https:' &&
          url.hostname.endsWith('.devtunnels.ms') &&
          !url.username &&
          !url.password &&
          !url.port &&
          url.pathname === '/' &&
          !url.search &&
          !url.hash
        ) {
          return url;
        }
      } catch {
        // The CLI also writes ordinary progress messages and incomplete lines.
      }
    }
    return undefined;
  }
  const pattern =
    provider === 'localhost-run'
      ? /https:\/\/[a-z0-9-]+\.lhr\.life\b/u
      : /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com\b/u;
  const match = output.match(pattern);
  return match ? new URL(match[0]) : undefined;
}
