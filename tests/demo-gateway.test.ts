import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request, type Server } from 'node:http';
import { createDemoGateway } from '../scripts/demo/gateway.mjs';

async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

test('demo forwards the site, admin and real API body/cookie/CSRF on one origin', async () => {
  const site = createServer((incoming, response) => {
    response.end(`site:${incoming.url}`);
  });
  const api = createServer(async (incoming, response) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    response.setHeader('Content-Type', 'application/json');
    if (incoming.url?.endsWith('/rejected')) response.statusCode = 403;
    response.setHeader(
      'Set-Cookie',
      '__Host-session=test; Secure; HttpOnly; Path=/',
    );
    response.end(
      JSON.stringify({
        path: incoming.url,
        body: Buffer.concat(chunks).toString(),
        cookie: incoming.headers.cookie,
        csrf: incoming.headers['x-csrf-token'],
        origin: incoming.headers.origin,
        ip: incoming.headers['x-forwarded-for'],
        proto: incoming.headers['x-forwarded-proto'],
      }),
    );
  });
  let contentRefreshes = 0;
  const state = {
    ready: true,
    origin: new URL('https://demo.trycloudflare.com'),
    onContentSaved: () => {
      contentRefreshes += 1;
    },
  };
  let gateway: Server | undefined;
  try {
    gateway = createDemoGateway({
      siteTarget: await listen(site),
      apiTarget: await listen(api),
      state,
    });
    const origin = await listen(gateway);
    const page = await fetch(`${origin}/contacts/`);
    assert.equal(await page.text(), 'site:/contacts/');
    assert.equal(page.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(page.headers.get('referrer-policy'), 'same-origin');
    const admin = await fetch(`${origin}/admin/consultations`);
    assert.equal((await admin.json()).path, '/admin/consultations');
    const options = {
      method: 'PUT',
      headers: {
        host: state.origin.host,
        origin: state.origin.origin,
        'Content-Type': 'application/json',
        Cookie: '__Host-session=secret',
        'X-CSRF-Token': 'csrf-value',
        'CF-Connecting-IP': '203.0.113.10',
        'X-Forwarded-For': '198.51.100.99',
        'X-Forwarded-Proto': 'http',
      },
    };
    const result = await new Promise<{ body: unknown; cookie: string }>(
      (resolve, reject) => {
        const outgoing = request(
          `${origin}/v1/admin/contacts?draft=1`,
          options,
          async (response) => {
            const chunks = [];
            for await (const chunk of response) chunks.push(chunk);
            resolve({
              body: JSON.parse(Buffer.concat(chunks).toString()),
              cookie: response.headers['set-cookie']?.join(';') ?? '',
            });
          },
        );
        outgoing.on('error', reject);
        outgoing.end('{"phone":"demo"}');
      },
    );
    assert.deepEqual(result.body, {
      path: '/v1/admin/contacts?draft=1',
      body: '{"phone":"demo"}',
      cookie: '__Host-session=secret',
      csrf: 'csrf-value',
      origin: state.origin.origin,
      ip: '203.0.113.10',
      proto: 'https',
    });
    assert.match(result.cookie, /Secure; HttpOnly/u);
    assert.equal(contentRefreshes, 1);
    const seoSave = await fetch(`${origin}/v1/admin/seo`, {
      method: 'PUT',
      body: '{}',
    });
    await seoSave.arrayBuffer();
    assert.equal(contentRefreshes, 2, 'saving SEO must rebuild the demo');
    for (const path of [
      '/v1/consultations',
      '/v1/admin/consultations/demo',
      '/v1/admin/articles/rejected',
      '/v1/admin/seo/rejected',
    ]) {
      const response = await fetch(origin + path, {
        method: 'POST',
        body: '{}',
      });
      await response.arrayBuffer();
    }
    assert.equal(
      contentRefreshes,
      2,
      'public submissions, notes and rejected saves must not rebuild the site',
    );
    const local = await fetch(`${origin}/v1/site`, {
      headers: { 'CF-Connecting-IP': '203.0.113.20' },
    });
    assert.equal((await local.json()).ip, '127.0.0.1');
    state.origin = new URL('https://approved-8787.use.devtunnels.ms');
    const restored = await fetch(`${origin}/v1/site`, {
      headers: {
        Host: `localhost:${new URL(origin).port}`,
        Origin: `http://localhost:${new URL(origin).port}`,
        Referer: `${state.origin.origin}/admin/seo`,
        'Sec-Fetch-Site': 'same-origin',
        'X-Forwarded-For': '198.51.100.99',
      },
    });
    const restoredBody = await restored.json();
    assert.equal(restoredBody.origin, state.origin.origin);
    assert.equal(restoredBody.proto, 'https');
    assert.equal(restoredBody.ip, '127.0.0.1');
    state.ready = false;
    const starting = await fetch(origin);
    assert.equal(starting.status, 503);
    assert.equal(starting.headers.get('retry-after'), '5');
  } finally {
    if (gateway) await close(gateway);
    await close(site);
    await close(api);
  }
});
