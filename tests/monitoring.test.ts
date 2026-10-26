import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  access,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareSourceMaps } from '../scripts/monitoring/sourcemaps.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeErrorEvent as sitePrivacy } from '../src/shared/monitoring/privacy.ts';
import { sanitizeErrorEvent as adminPrivacy } from '../admin/src/shared/monitoring/privacy.ts';
import { sanitizeErrorEvent as backendPrivacy } from '../backend/src/platform/monitoring/privacy.ts';
import { monitorTransport } from '../src/shared/monitoring/transport.ts';
import { HttpMetricBuffer } from '../backend/src/platform/monitoring/http-metrics.ts';
import { privateMapDestination } from '../scripts/monitoring/upload-sourcemaps.mjs';

for (const [name, sanitize] of Object.entries({
  sitePrivacy,
  adminPrivacy,
  backendPrivacy,
})) {
  test(
    name +
      ': preserves debugging coordinates without client data or credentials',
    () => {
      const cleaned = sanitize({
        type: undefined,
        event_id: 'a'.repeat(32),
        release: 'revision',
        environment: 'production',
        user: { email: 'private@example.com', ip_address: '203.0.113.1' },
        request: {
          url: 'https://site.example/?token=private',
          cookies: { session: 'private' },
          data: 'contact=private',
        },
        extra: { secret: 'private' },
        debug_meta: {
          images: [
            {
              type: 'sourcemap',
              code_file: 'https://site.example/app.js?token=private',
              debug_id: '11111111-2222-3333-4444-555555555555',
            },
          ],
        },
        breadcrumbs: [{ message: 'private' }],
        tags: {
          component: 'site',
          requestId: 'abc-123',
          email: 'private@example.com',
        },
        exception: {
          values: [
            {
              type: 'TypeError',
              value: 'private phone token=private',
              stacktrace: {
                frames: [
                  {
                    filename:
                      'https://user:private@site.example/assets/app.js?token=private#private',
                    lineno: 123,
                    colno: 45,
                    function: 'submit',
                    vars: { input: 'private' },
                    context_line: 'private',
                  },
                ],
              },
            },
          ],
        },
      });
      assert.ok(!JSON.stringify(cleaned).includes('private'));
      assert.equal(
        cleaned.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename,
        'https://site.example/assets/app.js',
      );
      assert.equal(
        cleaned.exception?.values?.[0]?.stacktrace?.frames?.[0]?.lineno,
        123,
      );
      assert.deepEqual(cleaned.tags, {
        component: 'site',
        requestId: 'abc-123',
      });
    },
  );
}

test('custom transport retries only the collector, omits credentials and uses stable event ID', async () => {
  const calls: { url: string; body: string }[] = [];
  const transport = monitorTransport(
    'https://collector.example/v1/browser/site',
    'public-key',
    false,
    (async (url, options) => {
      assert.equal(options?.credentials, 'omit');
      assert.equal(options?.redirect, 'error');
      assert.equal(
        new Headers(options?.headers).get('X-Monitor-Key'),
        'public-key',
      );
      calls.push({ url: String(url), body: String(options?.body) });
      if (calls.length === 1) throw new Error('offline');
      return new Response('{}', { status: 202 });
    }) as typeof fetch,
  );
  const result = await transport.send([
    { event_id: 'a'.repeat(32), sent_at: new Date().toISOString() },
    [[{ type: 'event' }, { event_id: 'a'.repeat(32), message: 'safe' }]],
  ]);
  assert.equal(result.statusCode, 202);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.body, calls[1]?.body);
  assert.ok(
    calls.every((call) => call.url.startsWith('https://collector.example/')),
  );
  assert.equal(await transport.flush(100), true);
});

test('HTTP metrics retry a frozen closed minute without copying routes or request data', async () => {
  const sent: any[] = [];
  const buffer = new HttpMetricBuffer(
    'https://collector.example/v1/ingest/site',
    'server-key',
    (async (_url, options) => {
      assert.equal(
        new Headers(options?.headers).get('Authorization'),
        'Bearer server-key',
      );
      sent.push(JSON.parse(String(options?.body)));
      return new Response('{}', { status: sent.length === 1 ? 503 : 202 });
    }) as typeof fetch,
  );
  buffer.record(
    { durationMs: 50, status: 200, route: '/private/contact' },
    120000,
  );
  buffer.record({ durationMs: 1200, status: 503 }, 120001);
  await buffer.flush(false, 180000);
  buffer.record({ durationMs: 400, status: 200 }, 180001);
  await buffer.flush(false, 180100);
  assert.deepEqual(sent[0], sent[1]);
  assert.equal(sent[0].metrics.requests, 2);
  assert.equal(sent[0].metrics.errors, 1);
  assert.deepEqual(sent[0].metrics.buckets, [1, 0, 0, 1, 0, 0]);
  assert.ok(!JSON.stringify(sent).includes('private'));
});

test('source map destination stays outside the public site and validates the release', () => {
  assert.equal(
    privateMapDestination(
      { directory: '/home/u/site.example/www' },
      'a'.repeat(40),
    ),
    '/home/u/site.example/.source-maps/' + 'a'.repeat(40),
  );
  assert.throws(() =>
    privateMapDestination(
      { directory: '/home/u/site.example/www' },
      '../../public',
    ),
  );
});

test('source maps are archived by exact release and excluded from public output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'monitor-map-test-'));
  const original = process.cwd();
  try {
    process.chdir(directory);
    await mkdir('dist');
    await writeFile(
      'dist/app.js.map',
      '{"version":3,"sourcesContent":["private source"]}',
    );
    await writeFile('dist/app.js', 'console.log(1)');
    const sha = 'a'.repeat(40);
    await prepareSourceMaps(['dist'], {
      MONITOR_ARCHIVE_SOURCEMAPS: 'true',
      GITHUB_SHA: sha,
    });
    await assert.rejects(access('dist/app.js.map'));
    assert.ok(
      (
        await readFile(
          join('.monitoring-artifacts', sha, 'dist/app.js.map'),
          'utf8',
        )
      ).includes('private source'),
    );
    await access('dist/app.js');
  } finally {
    process.chdir(original);
    await rm(directory, { recursive: true, force: true });
  }
});
