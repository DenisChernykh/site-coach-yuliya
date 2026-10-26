import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sanitizeErrorEvent as sitePrivacy } from '../src/shared/monitoring/privacy.ts';
import { sanitizeErrorEvent as adminPrivacy } from '../admin/src/shared/monitoring/privacy.ts';
import { sanitizeErrorEvent as backendPrivacy } from '../backend/src/platform/monitoring/privacy.ts';
import {
  auditMonitors,
  monitoringPlan,
  verifyUptime,
} from '../scripts/monitoring/verify-uptime.mjs';
import {
  notificationCycle,
  readIssues,
  runMonitor,
} from '../backend/scripts/netangels/notify-errors.mjs';

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

const env = {
  PUBLIC_SITE_URL: 'https://coach.example',
  PUBLIC_API_URL: 'https://api.coach.example',
};
const plan = monitoringPlan(env);
const now = 1_800_000_000_000;
function fixtures() {
  return plan.map((item) => ({
    ...item,
    locations: [{ london: [] }, { frankfurt: [] }, { new_york: [] }],
    monitor_status: 'active',
    uptime_status: 'up',
    last_check: now / 1000 - 30,
    contact_lists: ['contact'],
  }));
}
const contacts = [{ id: 'contact', telegram: ['123'], dnd: [] }];

test('external monitor audit rejects silent failure paths', () => {
  assert.deepEqual(auditMonitors(plan, fixtures(), contacts, now), []);
  for (const change of [
    { contact_lists: [] },
    { monitor_status: 'maint_dnd' },
    { uptime_status: 'down' },
    { last_check: now / 1000 - 600 },
    { accepted_http_codes: [200, 500] },
    { keyword: '' },
    { verify_ssl_certificate: false },
    { max_redirects: 5 },
    { locations: [{ london: [] }], triggering_locations: 1 },
  ]) {
    const monitors = fixtures();
    monitors[0] = { ...monitors[0], ...change };
    assert.ok(auditMonitors(plan, monitors, contacts, now).length > 0);
  }
  assert.ok(
    auditMonitors(
      plan,
      fixtures(),
      [{ ...contacts[0], dnd: [{ day: 'all' }] }],
      now,
    ).length,
  );
});
test('configuration rejects credential-bearing and non-HTTPS origins', () => {
  for (const origin of [
    'http://coach.example',
    'https://user:secret@coach.example',
    'https://coach.example/?token=secret',
  ]) {
    assert.throws(() => monitoringPlan({ ...env, PUBLIC_SITE_URL: origin }));
  }
});
test('HetrixTools outages are failures, not an empty healthy result', async () => {
  await assert.rejects(
    verifyUptime(
      { ...env, HETRIXTOOLS_API_KEY: 'private' },
      async () => new Response('', { status: 503 }),
    ),
  );
  await assert.rejects(
    verifyUptime({ ...env, HETRIXTOOLS_API_KEY: 'private' }, async () => {
      throw new Error('private');
    }),
    /API unavailable/,
  );
});
const monitorEnv = {
  SENTRY_ORG: 'coach',
  SENTRY_PROJECT: 'website',
  SENTRY_READ_TOKEN: 'secret',
  MONITOR_TELEGRAM_BOT_TOKEN: '123:secret',
  MONITOR_TELEGRAM_CHAT_ID: '-456',
  MONITOR_STATE_DIR: '/tmp/coach-monitor-test',
  MONITOR_HEARTBEAT_URL: 'https://sm.hetrixtools.net/hb/?s=private',
};

test('error notifications persist delivery, suppress duplicates and retry failed Telegram sends', async () => {
  const state: Record<string, { seen: number; notified: number }> = {};
  let seen = now;
  let sent = 0;
  let saved = 0;
  let heartbeats = 0;
  let rejectTelegram = false;
  const fetcher: typeof fetch = async (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input);
    assert.equal(options?.redirect, 'error');
    if (url.hostname === 'sentry.io') {
      assert.equal(url.searchParams.get('environment'), 'production');
      return Response.json([
        {
          id: '123',
          lastSeen: new Date(seen).toISOString(),
          title: 'private client text',
        },
      ]);
    }
    if (url.hostname === 'api.telegram.org') {
      assert.ok(!String(options?.body).includes('private client text'));
      sent++;
      return Response.json({ ok: !rejectTelegram });
    }
    assert.equal(url.hostname, 'sm.hetrixtools.net');
    heartbeats++;
    return new Response(null);
  };
  const save = async () => {
    saved++;
  };
  assert.equal(
    await notificationCycle(monitorEnv, state, save, fetcher, now),
    1,
  );
  assert.equal(
    await notificationCycle(monitorEnv, state, save, fetcher, now + 60_000),
    0,
  );
  seen += 120_000;
  assert.equal(
    await notificationCycle(monitorEnv, state, save, fetcher, now + 120_000),
    0,
  );
  rejectTelegram = true;
  await assert.rejects(
    notificationCycle(monitorEnv, state, save, fetcher, now + 3_600_000),
  );
  assert.equal(heartbeats, 3);
  assert.equal(state['123'].seen, now);
  rejectTelegram = false;
  assert.equal(
    await notificationCycle(monitorEnv, state, save, fetcher, now + 3_660_000),
    1,
  );
  assert.equal(state['123'].seen, seen);
  assert.equal(sent, 3);
  assert.ok(saved >= 4);
});

test('Sentry pagination copies only cursor and reports all pages', async () => {
  let calls = 0;
  const issues = await readIssues(
    monitorEnv,
    async (input) => {
      calls++;
      const url = new URL(input instanceof Request ? input.url : input);
      assert.equal(url.hostname, 'sentry.io');
      if (calls === 1)
        return Response.json(
          [{ id: '1', lastSeen: new Date(now).toISOString() }],
          {
            headers: {
              link: '<https://untrusted.example/>; rel="next"; results="true"; cursor="100:1:0"',
            },
          },
        );
      assert.equal(url.searchParams.get('cursor'), '100:1:0');
      return Response.json([
        { id: '2', lastSeen: new Date(now).toISOString() },
      ]);
    },
    now,
  );
  assert.equal(issues.length, 2);
});

test('upstream and state storage failures never send a healthy heartbeat', async () => {
  for (const phase of ['sentry', 'storage']) {
    let heartbeat = false;
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.hostname === 'sentry.io')
        return phase === 'sentry'
          ? new Response('', { status: 403 })
          : Response.json([]);
      heartbeat = true;
      return new Response(null);
    };
    await assert.rejects(
      notificationCycle(
        monitorEnv,
        {},
        async () => {
          throw new Error();
        },
        fetcher,
        now,
      ),
    );
    assert.equal(heartbeat, false);
  }
});

test('notifier retains confirmed deliveries across runs and refuses corrupted state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'coach-notifier-test-'));
  const settings = { ...monitorEnv, MONITOR_STATE_DIR: directory };
  let messages = 0;
  let heartbeats = 0;
  const seen = new Date().toISOString();
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname === 'sentry.io')
      return Response.json([{ id: '123', lastSeen: seen }]);
    if (url.hostname === 'api.telegram.org') {
      messages++;
      return Response.json({ ok: true });
    }
    heartbeats++;
    return new Response(null);
  };
  try {
    await runMonitor(settings, fetcher);
    await runMonitor(settings, fetcher);
    assert.equal(messages, 1);
    assert.equal(heartbeats, 2);
    const file = join(directory, 'sentry-notifications.json');
    assert.ok(JSON.parse(await readFile(file, 'utf8'))['123']);
    await writeFile(file, 'broken json');
    await assert.rejects(runMonitor(settings, fetcher));
    assert.equal(heartbeats, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
