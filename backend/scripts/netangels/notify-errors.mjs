import { mkdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises'
import { resolve, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

const hour = 3_600_000
const day = 24 * hour

function configuration(env) {
  const slug = /^[a-z0-9][a-z0-9-]{0,100}$/
  if (
    !slug.test(env.SENTRY_ORG ?? '') ||
    !slug.test(env.SENTRY_PROJECT ?? '') ||
    !env.SENTRY_READ_TOKEN ||
    !/^\d+:[A-Za-z0-9_-]+$/.test(env.MONITOR_TELEGRAM_BOT_TOKEN ?? '') ||
    !/^-?\d+$/.test(env.MONITOR_TELEGRAM_CHAT_ID ?? '') ||
    !isAbsolute(env.MONITOR_STATE_DIR ?? '')
  )
    throw new Error('Invalid monitoring configuration')
  const api = env.SENTRY_API_ORIGIN || 'https://sentry.io'
  if (
    ![
      'https://sentry.io',
      'https://us.sentry.io',
      'https://de.sentry.io',
    ].includes(api)
  )
    throw new Error('Invalid Sentry API origin')
  const heartbeat = new URL(env.MONITOR_HEARTBEAT_URL)
  if (
    heartbeat.origin !== 'https://sm.hetrixtools.net' ||
    heartbeat.pathname !== '/hb/' ||
    heartbeat.username ||
    heartbeat.password ||
    heartbeat.hash ||
    !heartbeat.searchParams.get('s')
  )
    throw new Error('Invalid monitoring heartbeat')
  return { api, heartbeat, org: env.SENTRY_ORG, project: env.SENTRY_PROJECT }
}

async function request(fetcher, url, options = {}) {
  // Never include upstream bodies, URLs or tokens in errors written to the host log.
  try {
    const response = await fetcher(url, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) throw new Error()
    return response
  } catch {
    throw new Error('Monitoring upstream request failed')
  }
}

export async function sendTelegram(env, text, fetcher = fetch) {
  const response = await request(
    fetcher,
    'https://api.telegram.org/bot' +
      env.MONITOR_TELEGRAM_BOT_TOKEN +
      '/sendMessage',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.MONITOR_TELEGRAM_CHAT_ID,
        text,
        link_preview_options: { is_disabled: true },
      }),
    },
  )
  if ((await response.json()).ok !== true)
    throw new Error('Telegram rejected notification')
}

export async function readIssues(env, fetcher = fetch, now = Date.now()) {
  const config = configuration(env)
  const url = new URL(
    config.api + '/api/0/organizations/' + config.org + '/issues/',
  )
  url.searchParams.set('project', config.project)
  url.searchParams.set('environment', 'production')
  url.searchParams.set('query', 'issue.category:error')
  url.searchParams.set('start', new Date(now - day).toISOString())
  url.searchParams.set('end', new Date(now).toISOString())
  url.searchParams.set('sort', 'date')
  url.searchParams.set('limit', '100')
  const issues = new Map()
  for (let page = 0; page < 5; page++) {
    const response = await request(fetcher, url.toString(), {
      headers: { Authorization: 'Bearer ' + env.SENTRY_READ_TOKEN },
    })
    const body = await response.json()
    if (!Array.isArray(body)) throw new Error('Invalid Sentry response')
    for (const issue of body) {
      const seen = Date.parse(issue.filtered?.lastSeen ?? issue.lastSeen)
      if (!/^\d+$/.test(issue.id ?? '') || !Number.isFinite(seen))
        throw new Error('Invalid Sentry issue')
      if (seen >= now - day && seen <= now + 60_000)
        issues.set(issue.id, { id: issue.id, seen })
    }
    const next = (response.headers.get('link') ?? '')
      .split(',')
      .find((part) => /rel="next"/.test(part))
    if (!next || !/results="true"/.test(next)) return [...issues.values()]
    const cursor = /cursor="([^"]+)"/.exec(next)?.[1]
    if (!cursor) throw new Error('Invalid Sentry pagination')
    // Only copy the cursor. Never follow a supplied URL with our authorization token.
    url.searchParams.set('cursor', cursor)
  }
  throw new Error('Monitoring issue limit exceeded')
}

export async function notificationCycle(
  env,
  state,
  save,
  fetcher = fetch,
  now = Date.now(),
) {
  const config = configuration(env)
  const issues = await readIssues(env, fetcher, now)
  const due = issues.filter((issue) => {
    const previous = state[issue.id]
    return (
      !previous ||
      (issue.seen > previous.seen && now - previous.notified >= hour)
    )
  })
  if (due.length) {
    const links = due
      .slice(0, 10)
      .map(
        (issue) =>
          'https://' + config.org + '.sentry.io/issues/' + issue.id + '/',
      )
    await sendTelegram(
      env,
      '⚠️ Сайт Юлии: ошибки production — ' +
        due.length +
        ' групп.\n' +
        links.join('\n') +
        (due.length > 10
          ? '\nОстальные ошибки: https://' +
            config.org +
            '.sentry.io/issues/?query=environment%3Aproduction'
          : ''),
      fetcher,
    )
    for (const issue of due)
      state[issue.id] = { seen: issue.seen, notified: now }
    // Persist only after Telegram confirms delivery. An unsuccessful send is retried next minute.
    await save(state)
  }
  for (const [id, item] of Object.entries(state))
    if (now - item.seen > 2 * day) delete state[id]
  await save(state)
  await request(fetcher, config.heartbeat, { method: 'HEAD' })
  return due.length
}

export async function runMonitor(env, fetcher = fetch) {
  configuration(env)
  const directory = env.MONITOR_STATE_DIR
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const lock = resolve(directory, 'notify.lock')
  try {
    await mkdir(lock, { mode: 0o700 })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    // The CLI watchdog ends a run within 55 seconds. Reclaim only abandoned locks.
    if (Date.now() - (await stat(lock)).mtimeMs < 5 * 60_000) return
    await rm(lock, { recursive: true })
    await mkdir(lock, { mode: 0o700 })
  }
  try {
    const file = resolve(directory, 'sentry-notifications.json')
    let state = {}
    try {
      state = JSON.parse(await readFile(file, 'utf8'))
      if (
        !state ||
        Array.isArray(state) ||
        typeof state !== 'object' ||
        Object.entries(state).some(
          ([id, item]) =>
            !/^\d+$/.test(id) ||
            !Number.isFinite(item?.seen) ||
            !Number.isFinite(item?.notified),
        )
      )
        throw new Error('Invalid monitoring state')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    await notificationCycle(
      env,
      state,
      async (next) => {
        const temp = file + '.tmp'
        await writeFile(temp, JSON.stringify(next), { mode: 0o600 })
        await rename(temp, file)
      },
      fetcher,
    )
  } finally {
    await rm(lock, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const watchdog = setTimeout(() => {
    console.error('Monitoring run timed out; heartbeat was not sent.')
    process.exit(1)
  }, 55_000)
  ;(async () => {
    configuration(process.env)
    if (process.argv.includes('--test-telegram')) {
      await sendTelegram(
        process.env,
        'Проверка уведомлений об ошибках сайта Юлии. Это тест, не авария.',
      )
    } else await runMonitor(process.env)
  })()
    .catch(() => {
      console.error(
        'Error notification check failed. Verify credentials, API availability and persistent state permissions.',
      )
      process.exitCode = 1
    })
    .finally(() => clearTimeout(watchdog))
}
