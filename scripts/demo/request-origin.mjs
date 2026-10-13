import { isIP } from 'node:net';

function isLocalAddress(value, port, origin = false) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(origin ? value : `http://${value}`);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      (url.port === '' || url.port === String(port)) &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function restoreDevTunnelOrigin(incoming, publicOrigin) {
  if (!publicOrigin?.hostname.endsWith('.devtunnels.ms')) return undefined;
  const remote = incoming.socket.remoteAddress;
  if (
    !isIP(remote ?? '') ||
    !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)
  )
    return undefined;
  if (incoming.headers['sec-fetch-site'] !== 'same-origin') return undefined;
  if (typeof incoming.headers.referer !== 'string') return undefined;
  try {
    if (new URL(incoming.headers.referer).origin !== publicOrigin.origin)
      return undefined;
  } catch {
    return undefined;
  }
  if (
    incoming.headers.host !== publicOrigin.host &&
    !isLocalAddress(incoming.headers.host, incoming.socket.localPort)
  )
    return undefined;
  return isLocalAddress(
    incoming.headers.origin,
    incoming.socket.localPort,
    true,
  )
    ? publicOrigin.origin
    : undefined;
}
