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

test('VS Code port format becomes the HTTPS address of the shared gateway', () => {
  const event = JSON.stringify({
    port_format: 'https://sample-tunnel-{port}.uks1.devtunnels.ms/',
  });
  assert.equal(
    findTunnelOrigin(`Starting forwarding\n${event}\n`, 'vscode')?.origin,
    'https://sample-tunnel-8787.uks1.devtunnels.ms',
  );
  assert.equal(findTunnelOrigin(event.slice(0, -2), 'vscode'), undefined);
  assert.equal(
    findTunnelOrigin(
      'https://global.rel.tunnels.api.visualstudio.com',
      'vscode',
    ),
    undefined,
  );
});

test('VS Code rejects unsafe or unrelated port formats', () => {
  for (const port_format of [
    'http://sample-{port}.uks1.devtunnels.ms/',
    'https://user:secret@sample-{port}.uks1.devtunnels.ms/',
    'https://sample-{port}.uks1.devtunnels.ms.evil.example/',
    'https://sample-{port}.uks1.devtunnels.ms/path',
    'https://sample-{port}.uks1.devtunnels.ms/?token=secret',
  ]) {
    assert.equal(
      findTunnelOrigin(JSON.stringify({ port_format }), 'vscode'),
      undefined,
    );
  }
});
