import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
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

async function checkStories() {
  const png = await readFile('../design/assets/portrait.png')
  const upload = {
    name: 'portrait.png',
    mimeType: 'image/png',
    base64: png.toString('base64'),
  }
  await http('/v1/admin/story-media', 'POST', upload, 401)
  const noCsrf = await fetch(`${origin}/v1/admin/story-media`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(upload),
  })
  assert.equal(noCsrf.status, 403)
  assert.ok(noCsrf.headers.get('content-security-policy'))
  const image = (await http('/v1/admin/story-media', 'POST', upload, 201, true))
    .body
  assert.equal(image.size, png.length)
  assert.equal(image.type, 'image')
  const bytes = await readFile('test/fixtures/stories/short.webm')
  const video = (
    await http(
      '/v1/admin/story-media',
      'POST',
      {
        name: 'short.webm',
        mimeType: 'video/webm',
        base64: bytes.toString('base64'),
      },
      201,
      true,
    )
  ).body
  await http(
    '/v1/admin/story-media',
    'POST',
    { ...upload, base64: Buffer.from('<svg/>').toString('base64') },
    422,
    true,
  )
  const full = await fetch(`${origin}/v1/story-media/${image.id}`)
  assert.equal(full.status, 200)
  assert.equal(full.headers.get('content-type'), 'image/png')
  assert.equal(full.headers.get('cross-origin-resource-policy'), 'cross-origin')
  assert.deepEqual(Buffer.from(await full.arrayBuffer()), png)
  for (const [range, start, end] of [
    ['bytes=0-31', 0, 31],
    ['bytes=100-', 100, bytes.length - 1],
    ['bytes=-12', bytes.length - 12, bytes.length - 1],
  ]) {
    const response = await fetch(`${origin}/v1/story-media/${video.id}`, {
      headers: { Range: range },
    })
    assert.equal(response.status, 206)
    assert.equal(
      response.headers.get('content-range'),
      `bytes ${start}-${end}/${bytes.length}`,
    )
    assert.deepEqual(
      Buffer.from(await response.arrayBuffer()),
      bytes.subarray(start, end + 1),
    )
  }
  const invalid = await fetch(`${origin}/v1/story-media/${video.id}`, {
    headers: { Range: `bytes=${bytes.length}-` },
  })
  assert.equal(invalid.status, 416)
  assert.equal(invalid.headers.get('cache-control'), 'no-store')
  const workspace = (await http('/v1/admin/cms', 'GET', undefined, 200, true))
    .body
  const content = structuredClone(workspace.content)
  delete content.articles
  delete content.programs
  delete content.seo
  const photoSlide = {
    id: randomUUID(),
    mediaId: image.id,
    type: 'image',
    caption: 'Фото из админки',
    durationSeconds: 30,
    enabled: true,
    linkLabel: 'Узнать о коучинге',
    linkUrl: '/coaching/',
  }
  const videoSlide = {
    ...photoSlide,
    id: randomUUID(),
    mediaId: video.id,
    type: 'video',
    caption: 'Видео из админки',
    linkLabel: '',
    linkUrl: '',
  }
  const first = {
    id: randomUUID(),
    title: 'Знакомство',
    coverMediaId: image.id,
    enabled: true,
    slides: [
      photoSlide,
      videoSlide,
      { ...photoSlide, id: randomUUID(), enabled: false },
    ],
  }
  const second = {
    ...first,
    id: randomUUID(),
    title: 'Как проходят встречи',
    slides: [{ ...photoSlide, id: randomUUID() }],
  }
  const hidden = {
    ...first,
    id: randomUUID(),
    title: 'Скрытая подборка',
    enabled: false,
  }
  content.home.stories = [second, hidden, first]
  const previous = (await http('/v1/home')).body.stories
  const saved = (
    await http(
      '/v1/admin/cms/draft',
      'PUT',
      { revision: workspace.revision, content },
      200,
      true,
    )
  ).body
  assert.deepEqual((await http('/v1/home')).body.stories, previous)
  assert.deepEqual(
    (await http('/v1/admin/cms', 'GET', undefined, 200, true)).body.content.home
      .stories,
    content.home.stories,
  )
  const broken = structuredClone(content)
  broken.home.stories[0].coverMediaId = video.id
  await http(
    '/v1/admin/cms/draft',
    'PUT',
    { revision: saved.revision, content: broken },
    422,
    true,
  )
  await publishDraft()
  const published = (await http('/v1/home')).body.stories
  assert.deepEqual(
    published.map((group) => group.title),
    [second.title, first.title],
  )
  assert.equal(published[1].slides.length, 2)
  assert.equal(
    (await http('/v1/admin/cms', 'GET', undefined, 200, true)).body.content.home
      .stories.length,
    3,
  )
  process.stdout.write(
    'PASS authenticated media uploads, actual byte checks, video ranges, persistent drafts, ordered publication and hidden stories\n',
  )
}

async function checkNavigationMigration() {
  const workspace = (await http('/v1/admin/cms', 'GET', undefined, 200, true))
    .body
  const connection = await pool.connect()
  try {
    await connection.query('BEGIN')
    const legacy = structuredClone(workspace.content)
    const oldNavigation = legacy.site.navigation
      .filter((item) => item.href !== '/contacts/')
      .map((item) =>
        item.href === '/about/'
          ? { label: 'Своя история', href: '/#about' }
          : item,
      )
    oldNavigation.push({
      label: 'Мой канал',
      href: 'https://example.test/channel#about',
    })
    legacy.site.navigation = oldNavigation
    const navigation = [
      ...oldNavigation.map((item) =>
        item.href === '/#about' ? { ...item, href: '/about/' } : item,
      ),
      { label: 'Контакты', href: '/contacts/' },
    ]
    const originalSite = (
      await connection.query('SELECT settings FROM site_content')
    ).rows[0].settings
    await connection.query('UPDATE site_content SET settings = $1::jsonb', [
      JSON.stringify({ ...originalSite, navigation: oldNavigation }),
    ])
    await connection.query(
      'UPDATE site_cms_drafts SET content = $1::jsonb, revision = 10, published_revision = 10',
      [JSON.stringify(legacy)],
    )
    const migration = await readFile(
      'prisma/migrations/20261013130000_site_navigation_pages/migration.sql',
      'utf8',
    )
    await connection.query(migration)
    const published = (await connection.query('SELECT * FROM site_content'))
      .rows[0]
    const first = (await connection.query('SELECT * FROM site_cms_drafts'))
      .rows[0]
    assert.deepEqual(published.settings, { ...originalSite, navigation })
    assert.deepEqual(first.content, {
      ...legacy,
      site: { ...legacy.site, navigation },
    })
    assert.equal(first.revision, 11)
    assert.equal(first.published_revision, 11)
    await connection.query(migration)
    assert.deepEqual(
      (await connection.query('SELECT * FROM site_content')).rows[0],
      published,
    )
    assert.deepEqual(
      (await connection.query('SELECT * FROM site_cms_drafts')).rows[0],
      first,
    )

    const unsaved = structuredClone(first.content)
    unsaved.site.navigation = oldNavigation
    unsaved.home.hero.description = 'Неопубликованный текст'
    await connection.query(
      'UPDATE site_cms_drafts SET content = $1::jsonb, revision = 12',
      [JSON.stringify(unsaved)],
    )
    await connection.query(migration)
    const draft = (await connection.query('SELECT * FROM site_cms_drafts'))
      .rows[0]
    assert.deepEqual(draft.content, {
      ...unsaved,
      site: { ...unsaved.site, navigation },
    })
    assert.equal(draft.revision, 13)
    assert.equal(draft.published_revision, 11)
    assert.deepEqual(
      (await connection.query('SELECT * FROM site_content')).rows[0],
      published,
    )
    process.stdout.write(
      'PASS navigation migration, custom link preservation, draft revisions and idempotence\n',
    )
  } finally {
    await connection.query('ROLLBACK')
    connection.release()
  }
}

async function checkConsultationSourceMigration() {
  const connection = await pool.connect()
  try {
    await connection.query('BEGIN')
    await connection.query('CREATE SCHEMA source_migration_fixture')
    await connection.query('SET LOCAL search_path = source_migration_fixture')
    await connection.query(
      'CREATE TABLE consultations (id text PRIMARY KEY, name text NOT NULL)',
    )
    await connection.query(
      "INSERT INTO consultations VALUES ('legacy', 'Старая заявка')",
    )
    const legacy = (await connection.query('SELECT * FROM consultations'))
      .rows[0]
    await connection.query(
      await readFile(
        'prisma/migrations/20261013140000_consultation_source/migration.sql',
        'utf8',
      ),
    )
    assert.deepEqual(
      (await connection.query('SELECT * FROM consultations')).rows[0],
      { ...legacy, source: null },
    )
    for (const source of [
      'HOME_CONTACT',
      'COACHING_CONTACT',
      'CONTACTS_CONTACT',
    ]) {
      await connection.query('INSERT INTO consultations VALUES ($1, $2, $3)', [
        source,
        'Новая заявка',
        source,
      ])
    }
    process.stdout.write(
      'PASS consultation source migration preserves historical rows and accepts every form\n',
    )
  } finally {
    await connection.query('ROLLBACK')
    connection.release()
  }
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
  await checkConsultationSourceMigration()
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

  await checkNavigationMigration()
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
  changed.contacts.telegramUrl = 'https://t.me/personal_contact'
  changed.socials = [
    {
      id: 'telegram',
      label: 'Telegram-канал',
      url: 'https://t.me/public_channel',
    },
  ]
  changed.editorialNotes = [
    {
      materialId: 'private-note',
      source: 'Internal source',
    },
  ]
  changed.home.education[0].enabled = false
  changed.home.caseStudies[0].enabled = false

  const section = changed.pages[0].blocks.splice(
    changed.pages[0].blocks.findIndex((block) => block.id === 'about'),
    1,
  )[0]
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
  assert.equal(
    savedPages.content.contacts.telegramUrl,
    'https://t.me/personal_contact',
  )
  assert.equal(savedPages.content.socials[0].url, 'https://t.me/public_channel')
  assert.deepEqual(savedPages.content.editorialNotes, changed.editorialNotes)
  assert.equal(savedPages.content.home.education.length, 3)
  await pool.query(
    "UPDATE site_cms_drafts SET content = jsonb_set(content, '{editorialNotes,0,permissionNote}', $1::jsonb)",
    [JSON.stringify('Legacy note')],
  )
  const migratedNotes = (
    await http('/v1/admin/cms', 'GET', undefined, 200, true)
  ).body
  assert.deepEqual(migratedNotes.content.editorialNotes, changed.editorialNotes)

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

  const publicMaterials = (await http('/v1/home')).body
  assert.equal(publicMaterials.education.length, 2)
  assert.equal(
    publicMaterials.caseStudies.length,
    pageContent.home.caseStudies.length - 1,
  )
  assert.equal(
    publicMaterials.caseStudies.find((item) => item.id === 'career-or-business')
      .reviewImage,
    '/images/reviews/career-or-business.jpg',
  )
  assert.ok(!JSON.stringify(publicMaterials).includes('Internal source'))
  assert.equal(publicMaterials.editorialNotes, undefined)
  assert.equal(
    (await http('/v1/contacts')).body.telegramUrl,
    'https://t.me/personal_contact',
  )
  assert.equal(
    (await http('/v1/social-links')).body[0].url,
    'https://t.me/public_channel',
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
      source: 'UNKNOWN',
    },
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
      source: 'COACHING_CONTACT',
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
  assert.equal(consultation.source, 'COACHING_CONTACT')
  assert.equal(consultation.sourceLabel, 'Коучинг → форма заявки')
  assert.equal(consultation.delivery.status, 'PENDING')
  assert.equal(consultation.consentVersion, '2026-10-26')
  assert.equal(consultation.delivery.claimToken, undefined)
  const updatedConsultation = await http(
    `/v1/admin/consultations/${consultation.id}`,
    'PATCH',
    { status: 'IN_PROGRESS', adminNote: 'Связаться завтра' },
    200,
    true,
  )
  assert.equal(updatedConsultation.body.source, consultation.source)
  assert.equal(updatedConsultation.body.sourceLabel, consultation.sourceLabel)
  const details = (
    await http(
      `/v1/admin/consultations/${consultation.id}`,
      'GET',
      undefined,
      200,
      true,
    )
  ).body
  assert.equal(details.source, consultation.source)
  assert.equal(details.sourceLabel, consultation.sourceLabel)
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
  const legacyRequest = (
    await http(
      '/v1/admin/consultations?search=test_example',
      'GET',
      undefined,
      200,
      true,
    )
  ).body.items[0]
  assert.equal(legacyRequest.source, null)
  assert.equal(legacyRequest.sourceLabel, 'Неизвестен')

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
    telegramUrl: 'https://t.me/private_coach',
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
  assert.equal(contacts.telegramUrl, combinedContacts.telegramUrl)
  assert.equal(
    (await http('/v1/admin/publication', 'GET', undefined, 200, true)).body
      .requestedRevision,
    beforeContacts,
  )
  await publishDraft()
  assert.equal(
    (await http('/v1/contacts')).body.telegramUrl,
    combinedContacts.telegramUrl,
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
    source: 'HOME_CONTACT',
  }
  const otherRequests = new PrismaConsultationsAdapter(provider, transaction)
  const repeatedRows = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      (index % 2 === 0 ? requests : otherRequests).create(repeated, null),
    ),
  )
  assert.equal(new Set(repeatedRows.map((row) => row.id)).size, 1)
  assert.equal(repeatedRows[0].source, 'HOME_CONTACT')
  const otherFormDuplicate = await requests.create(
    { ...repeated, source: 'CONTACTS_CONTACT' },
    null,
  )
  assert.equal(otherFormDuplicate.id, repeatedRows[0].id)
  assert.equal(otherFormDuplicate.source, 'HOME_CONTACT')
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
  for (const [source, sourceLabel] of [
    ['HOME_CONTACT', 'Главная → форма знакомства'],
    ['CONTACTS_CONTACT', 'Контакты → форма связи'],
  ]) {
    const savedSource = await requests.create(
      { ...repeated, contact: `@source_${source}`, source },
      initial.programs[0].title,
    )
    const sourceDetails = (
      await http(
        `/v1/admin/consultations/${savedSource.id}`,
        'GET',
        undefined,
        200,
        true,
      )
    ).body
    assert.equal(sourceDetails.source, source)
    assert.equal(sourceDetails.sourceLabel, sourceLabel)
    assert.equal(sourceDetails.serviceTitle, initial.programs[0].title)
  }
  process.stdout.write(
    'PASS persisted form sources, admin list/detail/update, historical fallback and first-source deduplication\n',
  )
  await checkStories()
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
