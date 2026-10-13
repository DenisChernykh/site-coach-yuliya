import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreDevTunnelOrigin } from '../scripts/demo/request-origin.mjs';

const origin = new URL('https://approved-8787.use.devtunnels.ms');
const request = {
  headers: {
    host: 'localhost:8787',
    origin: 'http://localhost:8787',
    referer: `${origin.origin}/admin/seo`,
    'sec-fetch-site': 'same-origin',
  },
  socket: { remoteAddress: '127.0.0.1', localPort: 8787 },
};

test('restores only the configured dev tunnel browser origin from its exact referer', () => {
  assert.equal(restoreDevTunnelOrigin(request, origin), origin.origin);
  assert.equal(
    restoreDevTunnelOrigin(
      {
        ...request,
        headers: { ...request.headers, origin: 'http://localhost' },
      },
      origin,
    ),
    origin.origin,
  );
});

test('does not convert cross-site requests, unknown origins, or caller-supplied forwarded headers', () => {
  for (const headers of [
    { ...request.headers, 'sec-fetch-site': 'cross-site' },
    { ...request.headers, 'sec-fetch-site': 'same-site' },
    { ...request.headers, 'sec-fetch-site': undefined },
    { ...request.headers, referer: 'https://attacker.example/admin/seo' },
    { ...request.headers, referer: undefined },
    { ...request.headers, referer: 'invalid' },
    { ...request.headers, origin: 'https://attacker.example' },
    { ...request.headers, origin: 'null' },
    { ...request.headers, origin: undefined },
    { ...request.headers, origin: 'http://localhost:5173' },
    {
      ...request.headers,
      host: 'attacker.example',
      'x-forwarded-host': origin.host,
    },
  ])
    assert.equal(
      restoreDevTunnelOrigin({ ...request, headers }, origin),
      undefined,
    );
  assert.equal(
    restoreDevTunnelOrigin(
      {
        ...request,
        socket: { ...request.socket, remoteAddress: '203.0.113.7' },
      },
      origin,
    ),
    undefined,
  );
  assert.equal(
    restoreDevTunnelOrigin(request, new URL('https://demo.example.com')),
    undefined,
  );
  assert.equal(restoreDevTunnelOrigin(request, undefined), undefined);
});
