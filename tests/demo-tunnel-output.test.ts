import test from 'node:test';
import assert from 'node:assert/strict';
import { findTunnelOrigin } from '../scripts/demo/tunnel-output.mjs';

test('localhost.run welcome links cannot become the customer URL', () => {
  const welcome =
    'Manage domains at https://admin.localhost.run/; docs: https://localhost.run/docs/';
  assert.equal(findTunnelOrigin(welcome, 'localhost-run'), undefined);
  const event = JSON.stringify({
    type: 'v1.tcpip_forward.register.accepted',
    data:
      'demo123.lhr.life tunneled with tls termination, https://demo123.lhr.life\r\n' +
      'QR'.repeat(10_000),
  });
  assert.equal(
    findTunnelOrigin(welcome + event, 'localhost-run')?.origin,
    'https://demo123.lhr.life',
  );
});

test('Cloudflare API URLs in errors cannot become the customer URL', () => {
  assert.equal(
    findTunnelOrigin(
      'Request failed: https://api.trycloudflare.com/tunnel',
      'cloudflare',
    ),
    undefined,
  );
  assert.equal(
    findTunnelOrigin(
      'Visit https://four-random-demo-words.trycloudflare.com',
      'cloudflare',
    )?.origin,
    'https://four-random-demo-words.trycloudflare.com',
  );
});
