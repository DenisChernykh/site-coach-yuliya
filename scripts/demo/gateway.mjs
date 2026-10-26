import { createServer, request } from 'node:http';
import { isIP } from 'node:net';
import { restoreDevTunnelOrigin } from './request-origin.mjs';

// All three applications share one browser origin; backend guards still own auth.
export function createDemoGateway({ siteTarget, apiTarget, state }) {
  const site = new URL(siteTarget);
  const api = new URL(apiTarget);

  function upstream(incoming) {
    const path = incoming.url?.split('?', 1)[0] ?? '/';
    return /^\/(?:v1|admin|media)(?:\/|$)/u.test(path) ? api : site;
  }

  function headers(incoming, target) {
    const values = { ...incoming.headers, host: target.host };
    const restoredOrigin = restoreDevTunnelOrigin(incoming, state.origin);
    if (restoredOrigin) values.origin = restoredOrigin;
    const publicRequest =
      incoming.headers.host === state.origin?.host || Boolean(restoredOrigin);
    // Cloudflare overwrites CF-Connecting-IP. Never trust a visitor's XFF chain.
    const cloudflareIp = state.origin?.hostname.endsWith('.trycloudflare.com')
      ? incoming.headers['cf-connecting-ip']
      : undefined;
    for (const name of Object.keys(values)) {
      if (name.startsWith('x-forwarded-') || name === 'forwarded') {
        delete values[name];
      }
    }
    values['x-forwarded-for'] =
      publicRequest && typeof cloudflareIp === 'string' && isIP(cloudflareIp)
        ? cloudflareIp
        : incoming.socket.remoteAddress;
    values['x-forwarded-proto'] = publicRequest
      ? state.origin.protocol.slice(0, -1)
      : 'http';
    values['x-forwarded-host'] = restoredOrigin
      ? state.origin.host
      : incoming.headers.host;
    return values;
  }

  const server = createServer((incoming, outgoing) => {
    outgoing.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (!state.ready) {
      outgoing.writeHead(503, { 'Retry-After': '5' });
      outgoing.end('Demo is starting. Please try again shortly.');
      return;
    }
    const target = upstream(incoming);
    const forwarded = request(
      {
        hostname: target.hostname,
        port: target.port,
        path: incoming.url,
        method: incoming.method,
        headers: headers(incoming, target),
        timeout: 30_000,
      },
      (response) => {
        if (
          (response.statusCode ?? 500) < 400 &&
          incoming.method === 'POST' &&
          incoming.url?.split('?', 1)[0] === '/v1/admin/cms/publish'
        ) {
          state.onContentPublished?.();
        }
        outgoing.writeHead(response.statusCode ?? 502, {
          ...response.headers,
          'referrer-policy': 'same-origin',
          'x-robots-tag': 'noindex, nofollow',
        });
        response.on('error', () => outgoing.destroy());
        response.pipe(outgoing);
      },
    );
    forwarded.on('timeout', () => forwarded.destroy());
    forwarded.on('error', () => {
      if (outgoing.headersSent) outgoing.destroy();
      else {
        outgoing.writeHead(502);
        outgoing.end('Demo service is unavailable.');
      }
    });
    incoming.on('aborted', () => forwarded.destroy());
    outgoing.on('close', () => forwarded.destroy());
    incoming.pipe(forwarded);
  });

  return server;
}
