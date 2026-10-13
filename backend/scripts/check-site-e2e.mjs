import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import { Pool } from 'pg'
import { createClient } from 'redis'
import {
  buildPostgresCommandConfig,
  buildApiRuntimeConfig,
} from '../dist/platform/config/runtime-environment.js'
import { PrismaClientProvider } from '../dist/platform/database/prisma-client.provider.js'
import { PrismaTransactionAdapter } from '../dist/platform/database/prisma-transaction.adapter.js'
import { PrismaTransactionContext } from '../dist/platform/database/prisma-transaction.context.js'
import { PrismaConsultationsAdapter } from '../dist/modules/coach-site/infrastructure/prisma-consultations.adapter.js'
import { PrismaPublicationAdapter } from '../dist/modules/coach-site/infrastructure/prisma-publication.adapter.js'
import { PublishSiteContent } from '../dist/modules/coach-site/application/publication.service.js'

const databaseName = `coach_acceptance_${randomBytes(6).toString('hex')}`
const owner = new Pool({
  connectionString:
    'postgresql://coach_yuliya:local-development-only@127.0.0.1:55438/coach_yuliya',
})
const databaseUrl = `postgresql://coach_yuliya:local-development-only@127.0.0.1:55438/${databaseName}`
let child
let pool
let provider
let logs = ''
const ownAdminDirectory = !process.env.ADMIN_STATIC_DIR
const adminDirectory =
  process.env.ADMIN_STATIC_DIR ||
  (await mkdtemp(join(tmpdir(), 'coach-admin-static-')))
if (ownAdminDirectory) {
  await writeFile(
    join(adminDirectory, 'index.html'),
    '<!doctype html><html><body>Admin acceptance</body></html>',
  )
  await writeFile(join(adminDirectory, 'app.css'), 'body { color: black; }')
}

function command(args, environment, input) {
  const result = spawnSync(process.execPath, args, {
    env: environment,
    encoding: 'utf8',
    input,
  })
  assert.equal(result.status, 0, `${args[0]} failed: ${result.stderr}`)
}

const listener = createServer()
listener.listen(0, '127.0.0.1')
await once(listener, 'listening')
const port = listener.address().port
await new Promise((resolve) => listener.close(resolve))
const origin = `http://127.0.0.1:${port}`
const env = {
  ...process.env,
  NODE_ENV: 'test',
  ADMIN_STATIC_DIR: adminDirectory,
  LOG_LEVEL: 'error',
  OTEL_SDK_DISABLED: 'true',
  API_HOST: '127.0.0.1',
  API_PORT: String(port),
  API_DOCS_MODE: 'public',
  PUBLIC_API_URL: origin,
  CORS_ORIGINS: process.env.BROWSER_SITE_ORIGIN
    ? `${origin},${process.env.BROWSER_SITE_ORIGIN}`
    : origin,
  TRUST_PROXY_CIDRS: '',
  DATABASE_URL: databaseUrl,
  REDIS_AUTH_URL: 'redis://127.0.0.1:6388',
  REDIS_KEY_PREFIX: databaseName.replaceAll('_', '-'),
  AUTH_SELF_SERVICE_MODE: 'disabled',
  AUTH_ACCOUNT_ADMINISTRATION_MODE: 'disabled',
  AUTH_ACCOUNT_EMAIL_WORKFLOWS_MODE: 'disabled',
  TELEGRAM_NOTIFICATIONS_MODE: 'disabled',
  SITE_REBUILD_MODE: 'disabled',
  SERVICE_REVISION: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
}
for (const key of [
  'AUTH_SESSION_KEY_SECRET',
  'AUTH_CSRF_SECRET',
  'AUTH_RATE_LIMIT_KEY_SECRET',
  'AUTH_NETWORK_METADATA_SECRET',
])
  env[key] = randomBytes(32).toString('base64url')
const credentials = {
  email: 'acceptance@example.com',
  password: randomBytes(24).toString('base64url'),
}
buildApiRuntimeConfig(env)
let cookie = ''
let csrf = ''

async function http(
  path,
  method = 'GET',
  body,
  expected = 200,
  authenticated = false,
) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
      ...(authenticated ? { Cookie: cookie, 'X-CSRF-Token': csrf } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(5000),
  })
  const result = response.status === 204 ? null : await response.json()
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${JSON.stringify(result)}`,
  )
  return { response, body: result }
}

async function publishDraft() {
  const workspace = (await http('/v1/admin/cms', 'GET', undefined, 200, true))
    .body
  return (
    await http(
      '/v1/admin/cms/publish',
      'POST',
      { revision: workspace.revision },
      200,
      true,
    )
  ).body
}

try {
  await owner.query(`CREATE DATABASE ${databaseName}`)
  pool = new Pool({ connectionString: databaseUrl })
  command(
    [
      'node_modules/prisma/build/index.js',
      'migrate',
      'deploy',
      '--config',
      'prisma.config.ts',
    ],
    env,
  )
  command(['dist/bootstrap/content/main.js'], env)
  command(
    ['dist/bootstrap/admin/main.js', '--email', credentials.email],
    env,
    `${credentials.password}\n`,
  )
  child = spawn(process.execPath, ['dist/bootstrap/api/main.js'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (chunk) => {
    logs = (logs + chunk.toString()).slice(-64000)
  })
  child.stderr.on('data', (chunk) => {
    logs = (logs + chunk.toString()).slice(-64000)
  })
  let ready = false
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`API exited: ${logs}`)
    try {
      if ((await fetch(`${origin}/health/ready`)).ok) {
        ready = true
        break
      }
    } catch {
      /* Listener is starting. */
    }
    await delay(100)
  }
  assert.ok(ready, `API not ready: ${logs}`)
  const health = await http('/health/ready')
  assert.equal(
    health.response.headers.get('x-service-revision'),
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  )
  for (const path of ['/admin/', '/admin/articles', '/admin/contacts']) {
    const response = await fetch(`${origin}${path}`)
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/html/u)
    assert.match(await response.text(), /<!doctype html>/iu)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
  }
  const adminHead = await fetch(`${origin}/admin/programs`, { method: 'HEAD' })
  assert.equal(adminHead.status, 200)
  assert.equal(await adminHead.text(), '')
  const missingAsset = await fetch(`${origin}/admin/assets/missing-module.js`)
  assert.equal(missingAsset.status, 404)
  assert.doesNotMatch(missingAsset.headers.get('content-type'), /text\/html/u)
  if (ownAdminDirectory) {
    const css = await fetch(`${origin}/admin/app.css`)
    assert.equal(css.status, 200)
    assert.match(await css.text(), /color: black/u)
  }
  process.stdout.write(
    'PASS admin SPA deep links, static assets and API boundary\n',
  )
  await http('/v1/admin/consultations', 'GET', undefined, 401)
  await http(
    '/v1/auth/register',
    'POST',
    { email: 'new@example.com', password: 'long-example-password' },
    404,
  )
  const login = await http('/v1/auth/login', 'POST', credentials)
  cookie = login.response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  csrf = login.body.csrfToken
  assert.ok(cookie && csrf)
  await http('/v1/auth/me', 'GET', undefined, 200, true)
  process.stdout.write(
    'PASS admin login, disabled registration and session protection\n',
  )

  const initial = JSON.parse(await readFile('content/initial.json', 'utf8'))
  await pool.query("UPDATE site_content SET seo = '{}'::jsonb")
  await pool.query("UPDATE articles SET content = content - 'seo'")
  command(['dist/bootstrap/content/main.js'], env)
  assert.deepEqual(
    (await http('/v1/articles')).body.map((article) => article.seo),
    initial.articles.map((article) => article.seo),
  )
  await http('/v1/admin/seo', 'GET', undefined, 401)
  assert.deepEqual((await http('/v1/seo')).body, initial.seo)
  const editedSeo = {
    ...initial.seo,
    siteUrl: 'https://coach.example.com',
    pages: {
      ...initial.seo.pages,
      home: { ...initial.seo.pages.home, title: 'SEO из редактора' },
    },
  }
  const seoRevision = (
    await http('/v1/admin/publication', 'GET', undefined, 200, true)
  ).body.requestedRevision
  await http(
    '/v1/admin/seo',
    'PUT',
    { ...editedSeo, siteUrl: 'https://coach.example.com/path' },
    422,
    true,
  )
  await http('/v1/admin/seo', 'PUT', editedSeo, 200, true)
  assert.deepEqual((await http('/v1/seo')).body, initial.seo)
  assert.deepEqual(
    (await http('/v1/admin/seo', 'GET', undefined, 200, true)).body,
    editedSeo,
  )
  await publishDraft()
  assert.deepEqual((await http('/v1/seo')).body, editedSeo)
  assert.equal(
    (await http('/v1/admin/publication', 'GET', undefined, 200, true)).body
      .requestedRevision,
    seoRevision + 1,
  )
  command(['dist/bootstrap/content/main.js'], env)
  assert.deepEqual((await http('/v1/seo')).body, editedSeo)
  process.stdout.write(
    'PASS SEO validation, protected editing, publication scheduling and seed preservation\n',
  )

  await http('/v1/admin/cms', 'GET', undefined, 401)
  const workspace = (await http('/v1/admin/cms', 'GET', undefined, 200, true))
    .body
  assert.equal(workspace.revision, workspace.publishedRevision)
  const originalHome = (await http('/v1/home')).body
  const pageContent = structuredClone(workspace.content)
  delete pageContent.articles
  delete pageContent.programs
  delete pageContent.seo
  const changed = structuredClone(pageContent)
  changed.home.hero.description = 'Только в черновике'
  const section = changed.pages[0].blocks.splice(2, 1)[0]
  changed.pages[0].blocks.splice(1, 0, section)
  changed.pages[0].blocks.find((b) => b.id === 'concerns').enabled = false
  const beforeCms = (
    await http('/v1/admin/publication', 'GET', undefined, 200, true)
  ).body.requestedRevision
  const savedPages = (
    await http(
      '/v1/admin/cms/draft',
      'PUT',
      { revision: workspace.revision, content: changed },
      200,
      true,
    )
  ).body
  assert.equal(savedPages.revision, workspace.revision + 1)
  assert.deepEqual((await http('/v1/home')).body, originalHome)
  assert.equal(
    (await http('/v1/admin/publication', 'GET', undefined, 200, true)).body
      .requestedRevision,
    beforeCms,
  )
  await http(
    '/v1/admin/cms/draft',
    'PUT',
    { revision: workspace.revision, content: changed },
    409,
    true,
  )
  await http(
    '/v1/admin/cms/publish',
    'POST',
    { revision: workspace.revision },
    409,
    true,
  )
  const broken = structuredClone(changed)
  broken.pages[0].blocks[0].enabled = false
  await http(
    '/v1/admin/cms/draft',
    'PUT',
    { revision: savedPages.revision, content: broken },
    422,
    true,
  )
  await publishDraft()
  assert.equal(
    (await http('/v1/home')).body.hero.description,
    'Только в черновике',
  )
  const publishedLayout = (await http('/v1/page-layouts')).body
  assert.equal(publishedLayout[0].blocks[1].id, 'about')
  assert.equal(
    publishedLayout[0].blocks.find((b) => b.id === 'concerns').enabled,
    false,
  )
  const once = (
    await http('/v1/admin/publication', 'GET', undefined, 200, true)
  ).body.requestedRevision
  await publishDraft()
  assert.equal(
    (await http('/v1/admin/publication', 'GET', undefined, 200, true)).body
      .requestedRevision,
    once,
  )
  await http(
    '/v1/admin/cms/draft',
    'PUT',
    { revision: savedPages.revision, content: pageContent },
    200,
    true,
  )
  await publishDraft()
  process.stdout.write(
    'PASS CMS draft isolation, migration, section ordering, visibility, optimistic concurrency and idempotent publication\n',
  )
  await http(
    '/v1/consultations',
    'POST',
    { name: 'Анна', contact: '@anna_example', consent: false },
    422,
  )
  await http(
    '/v1/consultations',
    'POST',
    { name: 'Анна', contact: '@anna_example', consent: true, message: null },
    422,
  )
  await http(
    '/v1/consultations',
    'POST',
    {
      name: 'Анна',
      contact: '@anna_example',
      consent: true,
      serviceId: 'unknown-program',
    },
    400,
  )
  const trapped = await http(
    '/v1/consultations',
    'POST',
    {
      name: 'Бот',
      contact: '@spam_example',
      consent: true,
      website: 'https://spam.example',
      serviceId: 'unknown-program',
    },
    201,
  )
  assert.equal(trapped.body.status, 'accepted')
  assert.equal(
    (await pool.query('SELECT count(*)::int AS total FROM consultations'))
      .rows[0].total,
    0,
  )
  const accepted = await http(
    '/v1/consultations',
    'POST',
    {
      name: ' Анна ',
      contact: ' @anna_example ',
      consent: true,
      serviceId: initial.programs[0].id,
      message: 'Заявка для проверки',
    },
    201,
  )
  assert.equal(accepted.body.status, 'accepted')
  const list = await http(
    '/v1/admin/consultations?search=anna&limit=20',
    'GET',
    undefined,
    200,
    true,
  )
  const consultation = list.body.items[0]
  assert.equal(consultation.name, 'Анна')
  assert.equal(consultation.serviceTitle, initial.programs[0].title)
  assert.equal(consultation.delivery.status, 'PENDING')
  assert.equal(consultation.consentVersion, '2026-10-11')
  assert.equal(consultation.delivery.claimToken, undefined)
  await http(
    `/v1/admin/consultations/${consultation.id}`,
    'PATCH',
    { status: 'IN_PROGRESS', adminNote: 'Связаться завтра' },
    200,
    true,
  )
  assert.equal(
    (
      await http(
        '/v1/admin/consultations?status=IN_PROGRESS',
        'GET',
        undefined,
        200,
        true,
      )
    ).body.total,
    1,
  )
  for (let index = 0; index < 4; index += 1) {
    const attempt = await http(
      '/v1/consultations',
      'POST',
      { name: 'Тест', contact: '@test_example', consent: true },
      index < 2 ? 201 : 429,
    )
    if (index >= 2) {
      assert.equal(
        attempt.response.headers.get('access-control-expose-headers'),
        'Retry-After',
      )
      const retryAfter = Number(attempt.response.headers.get('retry-after'))
      assert.ok(retryAfter >= 1 && retryAfter <= 600)
      assert.equal(attempt.body.code, 'RATE_LIMIT_EXCEEDED')
    }
  }
  process.stdout.write(
    'PASS durable consultations, program snapshots, validation, filters, status and rate limit\n',
  )

  const config = buildPostgresCommandConfig({
    NODE_ENV: 'test',
    ADMIN_STATIC_DIR: adminDirectory,
    DATABASE_URL: databaseUrl,
  })
  const context = new PrismaTransactionContext()
  provider = new PrismaClientProvider(config, context)
  await provider.connect(AbortSignal.timeout(5000))
  const transaction = new PrismaTransactionAdapter(provider, context, config)
  const requests = new PrismaConsultationsAdapter(provider, transaction)
  const claims = (
    await Promise.all([
      requests.claimDelivery(new Date()),
      requests.claimDelivery(new Date()),
    ])
  ).filter(Boolean)
  assert.equal(
    new Set(claims.map((claim) => claim.consultation.id)).size,
    claims.length,
  )
  const claim = claims[0]
  assert.ok(claim)
  await requests.finishDelivery(claim, {
    errorCode: 'TELEGRAM_HTTP_429',
    permanent: false,
    retryAfterMs: 37000,
  })
  const pending = await requests.find(claim.consultation.id)
  assert.equal(pending.delivery.status, 'PENDING')
  assert.ok(pending.delivery.nextAttemptAt.getTime() >= Date.now() + 36000)
  await pool.query(
    "UPDATE telegram_deliveries SET next_attempt_at = '2000-01-01' WHERE consultation_id = $1",
    [claim.consultation.id],
  )
  const reclaimed = await requests.claimDelivery(new Date())
  assert.equal(reclaimed.consultation.id, claim.consultation.id)
  await requests.finishDelivery(claim, { messageId: 'stale-worker' })
  assert.equal(
    (await requests.find(claim.consultation.id)).delivery.status,
    'PROCESSING',
  )
  await requests.finishDelivery(reclaimed, { messageId: 'confirmed-message' })
  assert.equal(
    (await requests.find(claim.consultation.id)).delivery.status,
    'SENT',
  )
  await http(
    `/v1/admin/consultations/${claim.consultation.id}/telegram/retry`,
    'POST',
    {},
    409,
    true,
  )
  process.stdout.write(
    'PASS Telegram job leases, delayed retries and stale worker protection\n',
  )

  const settings = (await http('/v1/site')).body
  const denied = await fetch(`${origin}/v1/admin/site`, {
    method: 'PUT',
    headers: {
      Origin: origin,
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  })
  assert.equal(denied.status, 403)
  await http(
    '/v1/admin/site',
    'PUT',
    { ...settings, profession: 'Изменено через админку' },
    200,
    true,
  )
  await http(
    '/v1/admin/contacts',
    'PUT',
    {
      email: 'coach@example.com',
      phone: '+79000000000',
      telegramUrl: 'https://t.me/example_coach',
      address: null,
    },
    200,
    true,
  )
  const draft = {
    content: {
      ...initial.articles[0],
      slug: 'acceptance-draft',
      bodyMarkdown:
        '## Статья из редактора\n\n**Выделенный текст** и [ссылка](https://example.com).',
    },
    published: false,
    sortOrder: 10,
  }
  const saved = (await http('/v1/admin/articles', 'POST', draft, 201, true))
    .body
  await http('/v1/articles/acceptance-draft', 'GET', undefined, 404)
  const beforeConflict = (
    await http('/v1/admin/publication', 'GET', undefined, 200, true)
  ).body.requestedRevision
  await http('/v1/admin/articles', 'POST', draft, 409, true)
  assert.equal(
    (await http('/v1/admin/publication', 'GET', undefined, 200, true)).body
      .requestedRevision,
    beforeConflict,
  )
  await http(
    `/v1/admin/articles/${saved.id}`,
    'PUT',
    { ...draft, published: true },
    200,
    true,
  )
  await http('/v1/articles/acceptance-draft', 'GET', undefined, 404)
  await publishDraft()
  assert.equal(
    (await http('/v1/articles/acceptance-draft')).body.bodyMarkdown,
    draft.content.bodyMarkdown,
  )
  const legacyContent = { ...draft.content }
  delete legacyContent.seo
  await http(
    `/v1/admin/articles/${saved.id}`,
    'PUT',
    { ...draft, content: legacyContent, published: true },
    200,
    true,
  )
  await publishDraft()
  assert.deepEqual(
    (await http('/v1/articles/acceptance-draft')).body.seo,
    draft.content.seo,
  )
  const originalArticle = (
    await http('/v1/admin/articles', 'GET', undefined, 200, true)
  ).body.find((article) => article.content.slug === initial.articles[0].slug)
  await http(
    `/v1/admin/articles/${originalArticle.id}`,
    'DELETE',
    undefined,
    204,
    true,
  )
  await publishDraft()
  command(['dist/bootstrap/content/main.js'], env)
  await http(`/v1/articles/${initial.articles[0].slug}`, 'GET', undefined, 404)
  assert.equal(
    (await http('/v1/site')).body.profession,
    'Изменено через админку',
  )
  assert.deepEqual((await http('/v1/seo')).body, editedSeo)
  process.stdout.write(
    'PASS CSRF, content editing, drafts, atomic publication scheduling and repeatable seed\n',
  )

  const automaticContent = { ...draft.content, title: 'Как найти своё дело?' }
  delete automaticContent.slug
  const automaticInput = { ...draft, content: automaticContent }
  const generated = (
    await http('/v1/admin/articles', 'POST', automaticInput, 201, true)
  ).body
  const duplicate = (
    await http('/v1/admin/articles', 'POST', automaticInput, 201, true)
  ).body
  assert.equal(generated.content.slug, 'kak-nayti-svoyo-delo')
  assert.equal(duplicate.content.slug, 'kak-nayti-svoyo-delo-2')
  const renamed = (
    await http(
      `/v1/admin/articles/${generated.id}`,
      'PUT',
      {
        ...automaticInput,
        content: { ...automaticContent, title: 'Новое название' },
      },
      200,
      true,
    )
  ).body
  assert.equal(renamed.content.slug, generated.content.slug)
  const programContent = { ...initial.programs[0] }
  delete programContent.id
  const programInput = {
    content: programContent,
    published: false,
    sortOrder: 0,
  }
  const program = (
    await http('/v1/admin/programs', 'POST', programInput, 201, true)
  ).body
  assert.match(program.id, /^[a-f0-9-]{36}$/u)
  assert.equal(program.id, program.content.id)
  const updatedProgram = (
    await http(
      `/v1/admin/programs/${program.id}`,
      'PUT',
      {
        ...programInput,
        content: { ...programContent, title: 'Новое название программы' },
      },
      200,
      true,
    )
  ).body
  assert.equal(updatedProgram.content.id, program.id)
  assert.equal(updatedProgram.content.featured, undefined)
  const combinedContacts = {
    email: 'coach@example.com',
    phone: '+79000000000',
    address: 'Онлайн',
    telegramUrl: null,
    links: [
      { id: 'telegram', label: 'Telegram', url: 'https://t.me/unified_coach' },
      {
        id: 'instagram',
        label: 'Instagram',
        url: 'https://www.instagram.com/coach',
      },
      { id: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/79000000000' },
      { id: 'youtube', label: 'YouTube', url: 'https://youtube.com/@coach' },
      { id: 'vk', label: 'ВКонтакте', url: 'https://vk.com/coach' },
      { id: 'dzen', label: 'Дзен', url: 'https://dzen.ru/coach' },
    ],
  }
  const beforeContacts = (
    await http('/v1/admin/publication', 'GET', undefined, 200, true)
  ).body.requestedRevision
  const contacts = (
    await http('/v1/admin/contacts', 'PUT', combinedContacts, 200, true)
  ).body
  assert.equal(contacts.telegramUrl, combinedContacts.links[0].url)
  assert.equal(
    (await http('/v1/admin/publication', 'GET', undefined, 200, true)).body
      .requestedRevision,
    beforeContacts,
  )
  await publishDraft()
  assert.equal(
    (await http('/v1/contacts')).body.telegramUrl,
    combinedContacts.links[0].url,
  )
  assert.deepEqual(
    (await http('/v1/social-links')).body,
    combinedContacts.links,
  )
  assert.equal(
    (await http('/v1/admin/publication', 'GET', undefined, 200, true)).body
      .requestedRevision,
    beforeContacts + 1,
  )
  await http(
    '/v1/admin/contacts',
    'PUT',
    {
      ...combinedContacts,
      links: [combinedContacts.links[0], combinedContacts.links[0]],
    },
    422,
    true,
  )
  assert.equal(
    (await http('/v1/admin/publication', 'GET', undefined, 200, true)).body
      .requestedRevision,
    beforeContacts + 1,
  )
  process.stdout.write(
    'PASS generated article addresses, duplicate titles, stable program IDs and atomic unified contacts\n',
  )

  const publications = new PrismaPublicationAdapter(provider, transaction)
  let builtRevision = 0
  const builder = {
    dispatch: async (revision) => {
      builtRevision = revision
      return { runId: '123' }
    },
    check: async () => ({ status: 'success', deployedRevision: builtRevision }),
  }
  const publisher = new PublishSiteContent(publications, builder)
  await pool.query(
    "UPDATE site_publications SET next_attempt_at = '2000-01-01' WHERE id = 'site'",
  )
  await publisher.runOnce(new AbortController().signal)
  assert.equal((await publications.get()).status, 'BUILDING')
  await http(
    '/v1/admin/site',
    'PUT',
    { ...settings, profession: 'Изменено во время сборки' },
    200,
    true,
  )
  await publishDraft()
  await publisher.runOnce(new AbortController().signal)
  assert.equal((await publications.get()).status, 'PENDING')
  await pool.query(
    "UPDATE site_publications SET next_attempt_at = '2000-01-01' WHERE id = 'site'",
  )
  await publisher.runOnce(new AbortController().signal)
  await publisher.runOnce(new AbortController().signal)
  const published = await publications.get()
  assert.equal(published.status, 'IDLE')
  assert.equal(published.requestedRevision, published.deployedRevision)
  await http('/v1/admin/publication/retry', 'POST', undefined, 204, true)
  const manuallyRequested = await publications.get()
  assert.equal(manuallyRequested.status, 'PENDING')
  assert.equal(
    manuallyRequested.requestedRevision,
    published.requestedRevision + 1,
  )
  await publisher.runOnce(new AbortController().signal)
  await http('/v1/admin/publication/retry', 'POST', undefined, 409, true)
  await publisher.runOnce(new AbortController().signal)
  assert.equal((await publications.get()).status, 'IDLE')
  process.stdout.write(
    'PASS manual website rebuild and active-build conflict protection\n',
  )
  const count = await pool.query(
    'SELECT count(*)::int AS total FROM consultations',
  )
  assert.equal(count.rows[0].total, 2)
  const repeated = {
    name: 'Повтор',
    contact: '@repeat_check',
    consent: true,
    message: 'Текст',
  }
  const otherRequests = new PrismaConsultationsAdapter(provider, transaction)
  const repeatedRows = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      (index % 2 === 0 ? requests : otherRequests).create(repeated, null),
    ),
  )
  assert.equal(new Set(repeatedRows.map((row) => row.id)).size, 1)
  assert.equal(
    (
      await pool.query(
        'SELECT count(*)::int AS total FROM consultations WHERE contact = $1',
        [repeated.contact],
      )
    ).rows[0].total,
    1,
  )
  assert.equal(
    (
      await pool.query(
        'SELECT count(*)::int AS total FROM telegram_deliveries WHERE consultation_id = $1',
        [repeatedRows[0].id],
      )
    ).rows[0].total,
    1,
  )
  assert.equal(
    (
      await requests.create(
        {
          ...repeated,
          name: ' Повтор ',
          contact: ' @repeat_check ',
          message: ' Текст ',
        },
        null,
      )
    ).id,
    repeatedRows[0].id,
  )
  assert.notEqual(
    (await requests.create({ ...repeated, message: 'Другой запрос' }, null)).id,
    repeatedRows[0].id,
  )
  assert.notEqual(
    (
      await requests.create(
        { ...repeated, serviceId: initial.programs[0].id },
        initial.programs[0].title,
      )
    ).id,
    repeatedRows[0].id,
  )
  await pool.query(
    "UPDATE consultations SET created_at = now() - interval '11 minutes' WHERE id = $1",
    [repeatedRows[0].id],
  )
  assert.notEqual(
    (await requests.create(repeated, null)).id,
    repeatedRows[0].id,
  )
  const retried = { ...repeated, contact: '@rollback_check' }
  await assert.rejects(
    transaction.run(async () => {
      await requests.create(retried, null)
      throw new Error('Simulated persistence rollback')
    }),
    /Simulated persistence rollback/,
  )
  assert.equal(
    (
      await pool.query(
        'SELECT count(*)::int AS total FROM consultations WHERE contact = $1',
        [retried.contact],
      )
    ).rows[0].total,
    0,
  )
  await requests.create(retried, null)
  assert.equal(
    (
      await pool.query(
        'SELECT count(*)::int AS total FROM consultations WHERE contact = $1',
        [retried.contact],
      )
    ).rows[0].total,
    1,
  )
  process.stdout.write(
    'PASS honeypot, concurrent durable deduplication, expiry, distinct requests and rollback recovery\n',
  )
  await http('/v1/auth/logout', 'POST', {}, 204, true)
  await http('/v1/admin/consultations', 'GET', undefined, 401, true)
  assert.ok(!logs.includes(credentials.password))
  process.stdout.write(
    'PASS publication changes during build, successful acknowledgement and logout\n',
  )
  if (process.env.BROWSER_ACCEPTANCE_STATE) {
    const redis = createClient({ url: env.REDIS_AUTH_URL })
    await redis.connect()
    try {
      const keys = await redis.keys(
        `${env.REDIS_KEY_PREFIX}:test:consultations:*`,
      )
      assert.equal(keys.length, 1)
      await redis.pExpire(keys[0], 120_000)
    } finally {
      redis.destroy()
    }
    await writeFile(
      process.env.BROWSER_ACCEPTANCE_STATE,
      JSON.stringify({ origin, credentials, pid: process.pid }),
      { mode: 0o600 },
    )
    process.stdout.write(`Browser acceptance API ready at ${origin}/admin/\n`)
    await new Promise((resolve) => {
      process.once('SIGTERM', resolve)
      process.once('SIGINT', resolve)
    })
  }
} finally {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM')
    await Promise.race([
      once(child, 'exit'),
      delay(15000).then(() => {
        if (child.exitCode === null) child.kill('SIGKILL')
      }),
    ])
  }
  await provider?.close(AbortSignal.timeout(3000))
  await pool?.end()
  const closeDeadline = Date.now() + 5000
  let connections
  do {
    connections = (
      await owner.query(
        'SELECT count(*)::int AS total FROM pg_stat_activity WHERE datname = $1',
        [databaseName],
      )
    ).rows[0].total
    if (connections > 0) await delay(50)
  } while (connections > 0 && Date.now() < closeDeadline)
  assert.equal(connections, 0, 'Fixture database still has active connections')
  await owner.query(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`)
  await owner.end()
  if (ownAdminDirectory)
    await rm(adminDirectory, { recursive: true, force: true })
  if (process.env.BROWSER_ACCEPTANCE_STATE)
    await rm(process.env.BROWSER_ACCEPTANCE_STATE, { force: true })
}
