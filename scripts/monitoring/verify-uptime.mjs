import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function monitoringPlan(env) {
  function origin(key) {
    let url;
    try {
      url = new URL(env[key]);
    } catch {
      throw new Error('Set ' + key + ' to a production HTTPS origin');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      url.hostname === 'localhost'
    ) {
      throw new Error('Set ' + key + ' to a production HTTPS origin');
    }
    return url.origin;
  }
  const site = origin('PUBLIC_SITE_URL');
  const api = origin('PUBLIC_API_URL');
  const websites = [
    {
      name: 'Coach Yuliya · site',
      target: site + '/',
      keyword: 'content="Coach Yuliya"',
    },
    {
      name: 'Coach Yuliya · API and database',
      target: api + '/health/ready',
      keyword: '"status":"ok"',
    },
    {
      name: 'Coach Yuliya · admin',
      target: api + '/admin/',
      keyword: 'id="root"',
    },
  ].map((monitor) => ({
    ...monitor,
    type: 'website',
    check_frequency: 1,
    timeout: 10,
    accepted_http_codes: [200],
    max_redirects: 0,
    verify_ssl_certificate: true,
    verify_ssl_hostname: true,
    number_of_tries: 3,
    locations: ['london', 'frankfurt', 'new_york'],
    triggering_locations: 2,
    alert_after_minutes: 1,
    repeat_alert_times: 3,
    repeat_alert_frequency: 60,
    public_report: false,
    public_target: false,
  }));
  return [
    ...websites,
    {
      name: 'Coach Yuliya · error notifier',
      type: 'heartbeat',
      heartbeat_type: 'cron_job',
      target: null,
      timeout: 300,
      grace: 60,
      cron_expression: null,
      alert_after_minutes: 0,
      repeat_alert_times: 3,
      repeat_alert_frequency: 60,
      public_report: false,
      public_target: false,
    },
  ];
}

export function auditMonitors(plan, monitors, contacts, now = Date.now()) {
  const errors = [];
  for (const expected of plan) {
    const matches = monitors.filter((item) =>
      expected.type === 'heartbeat'
        ? item.name === expected.name && item.type === expected.type
        : item.target === expected.target,
    );
    if (matches.length !== 1) {
      errors.push(expected.name + ': expected exactly one monitor');
      continue;
    }
    const actual = matches[0];
    const policyKeys =
      expected.type === 'heartbeat'
        ? [
            'type',
            'heartbeat_type',
            'timeout',
            'grace',
            'cron_expression',
            'alert_after_minutes',
            'repeat_alert_times',
            'repeat_alert_frequency',
            'public_report',
            'public_target',
          ]
        : [
            'type',
            'check_frequency',
            'timeout',
            'max_redirects',
            'verify_ssl_certificate',
            'verify_ssl_hostname',
            'number_of_tries',
            'alert_after_minutes',
            'repeat_alert_times',
            'repeat_alert_frequency',
            'keyword',
            'public_report',
            'public_target',
          ];
    const policyMatches = policyKeys.every(
      (key) => actual[key] === expected[key],
    );
    if (
      !policyMatches ||
      (expected.type === 'website' &&
        JSON.stringify(actual.accepted_http_codes) !== '[200]')
    )
      errors.push(expected.name + ': monitoring policy differs');
    const locations = Array.isArray(actual.locations)
      ? actual.locations.length
      : 0;
    if (
      expected.type === 'website' &&
      (locations < 3 ||
        actual.triggering_locations < Math.floor(locations / 2) + 1)
    )
      errors.push(expected.name + ': missing multi-region confirmation');
    if (actual.monitor_status !== 'active' || actual.uptime_status !== 'up')
      errors.push(expected.name + ': not active and healthy');
    if (
      !Number.isFinite(actual.last_check) ||
      now / 1000 - actual.last_check > 300 ||
      actual.last_check > now / 1000 + 60
    )
      errors.push(expected.name + ': stale check');
    const recipient = contacts.find((contact) =>
      actual.contact_lists?.includes(contact.id),
    );
    if (!recipient?.telegram?.length)
      errors.push(expected.name + ': Telegram contact missing');
    if (recipient?.dnd?.length)
      errors.push(expected.name + ': contact has quiet hours');
  }
  return errors;
}

export async function verifyUptime(env, fetcher = fetch) {
  const plan = monitoringPlan(env);
  if (!env.HETRIXTOOLS_API_KEY) throw new Error('Set HETRIXTOOLS_API_KEY');
  async function getAll(path, key) {
    const all = [];
    for (let page = 1; page <= 50; page++) {
      let response;
      try {
        response = await fetcher(
          'https://api.hetrixtools.com/v3/' +
            path +
            '?per_page=200&page=' +
            page,
          {
            headers: { Authorization: 'Bearer ' + env.HETRIXTOOLS_API_KEY },
            redirect: 'error',
            signal: AbortSignal.timeout(15_000),
          },
        );
      } catch {
        throw new Error('HetrixTools API unavailable');
      }
      if (!response.ok)
        throw new Error('HetrixTools API status ' + response.status);
      const body = await response.json();
      if (!Array.isArray(body[key]))
        throw new Error('Invalid HetrixTools response');
      all.push(...body[key]);
      if (!body.meta?.pagination?.next) return all;
    }
    throw new Error('HetrixTools pagination limit reached');
  }
  const [monitors, contacts] = await Promise.all([
    getAll('uptime-monitors', 'monitors'),
    getAll('contact-lists', 'contact_lists'),
  ]);
  return auditMonitors(plan, monitors, contacts);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  (async () => {
    if (process.argv.includes('--plan')) {
      console.log(JSON.stringify(monitoringPlan(process.env), null, 2));
      return;
    }
    const errors = await verifyUptime(process.env);
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else
      console.log(
        'All four external monitors are active, healthy and connected to Telegram.',
      );
  })().catch(() => {
    console.error(
      'Monitoring verification failed. Check configuration, API access and the monitor settings.',
    );
    process.exitCode = 1;
  });
}
