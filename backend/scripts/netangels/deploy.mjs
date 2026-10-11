import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

export function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function required(env, key) {
  const value = env[key]
  if (typeof value !== 'string' || value.length === 0)
    throw new Error(`Missing ${key}`)
  return value
}

export function readDeployConfig(env) {
  const target = required(env, 'DEPLOY_TARGET')
  if (!['backend', 'site'].includes(target))
    throw new Error('Invalid DEPLOY_TARGET')
  const host = required(env, 'NETANGELS_SSH_HOST')
  const user = required(env, 'NETANGELS_SSH_USER')
  if (
    !/^[a-z0-9][a-z0-9.-]*$/iu.test(host) ||
    !/^[a-z0-9][a-z0-9_-]*$/iu.test(user)
  )
    throw new Error('Invalid SSH host/user')
  const port = env.NETANGELS_SSH_PORT || '22'
  if (!/^\d+$/u.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error('Invalid SSH port')
  const domain = required(
    env,
    target === 'backend' ? 'NETANGELS_API_DOMAIN' : 'NETANGELS_SITE_DOMAIN',
  )
  if (!/^[a-z0-9][a-z0-9.-]+$/iu.test(domain)) throw new Error('Invalid domain')
  const directory = required(
    env,
    target === 'backend' ? 'NETANGELS_APP_DIR' : 'NETANGELS_WWW_DIR',
  )
  if (
    !/^\/home\/[A-Za-z0-9_./-]+$/u.test(directory) ||
    directory.split('/').some((part) => part === '..' || part === '.') ||
    !directory.endsWith(`/${domain}/${target === 'backend' ? 'app' : 'www'}`)
  )
    throw new Error('Invalid deployment directory')
  const origin = new URL(
    required(env, target === 'backend' ? 'PUBLIC_API_URL' : 'PUBLIC_SITE_URL'),
  )
  if (
    origin.protocol !== 'https:' ||
    origin.hostname !== domain ||
    origin.port !== '' ||
    origin.pathname !== '/' ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  )
    throw new Error('Deployment URL must match the HTTPS site domain')
  const sha = required(env, 'GITHUB_SHA')
  const runId = required(env, 'GITHUB_RUN_ID')
  const attempt = required(env, 'GITHUB_RUN_ATTEMPT')
  if (
    !/^[a-f0-9]{40}$/u.test(sha) ||
    !/^\d+$/u.test(runId) ||
    !/^\d+$/u.test(attempt)
  )
    throw new Error('Invalid release identity')
  const siteId = required(
    env,
    target === 'backend' ? 'NETANGELS_API_SITE_ID' : 'NETANGELS_STATIC_SITE_ID',
  )
  if (!/^[1-9]\d*$/u.test(siteId)) throw new Error('Invalid site id')
  return {
    target,
    host,
    user,
    port,
    domain,
    directory,
    origin: origin.origin,
    siteId,
    release: `${sha}-${runId}-${attempt}`,
    privateKey: required(env, 'NETANGELS_SSH_PRIVATE_KEY'),
    knownHosts: required(env, 'NETANGELS_SSH_KNOWN_HOSTS'),
    apiKey: required(env, 'NETANGELS_API_KEY'),
    initializeAdmin: target === 'backend' && env.INITIALIZE_ADMIN === 'true',
    adminEmail: env.INITIAL_ADMIN_EMAIL,
    adminPassword: env.INITIAL_ADMIN_PASSWORD,
  }
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: options.cwd,
      env: process.env,
    })
    let stdout = ''
    child.stdout.on('data', (chunk) => {
      if (options.capture) stdout += chunk.toString()
      else process.stdout.write(chunk)
    })
    child.stderr.on('data', (chunk) => process.stderr.write(chunk))
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0
        ? resolvePromise(stdout.trim())
        : reject(new Error(`${command} failed (${code})`)),
    )
    child.stdin.on('error', () => {})
    child.stdin.end(options.input)
  })
}

async function apiRequest(url, init) {
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`NetAngels API failed (${response.status})`)
  return response
}

export function assertHostingTarget(site, config) {
  if (
    site.id !== Number(config.siteId) ||
    site.name !== config.domain ||
    site.engine !== (config.target === 'backend' ? 'nodejs' : 'static')
  )
    throw new Error('NetAngels site does not match the deployment target')
  if (config.target === 'backend' && !/^24\./u.test(site.engine_version))
    throw new Error('Select Node.js 24 in the NetAngels panel')
  if (!['Active', 'Stopped', 'Error'].includes(site.state))
    throw new Error('NetAngels site is busy or blocked')
}

async function createApi(config) {
  const response = await apiRequest(
    'https://panel.netangels.ru/api/gateway/token/',
    { method: 'POST', body: new URLSearchParams({ api_key: config.apiKey }) },
  )
  const { token } = await response.json()
  if (typeof token !== 'string' || !token)
    throw new Error('Invalid NetAngels token response')
  process.stdout.write(`::add-mask::${token}\n`)
  const base = `https://api-ms.netangels.ru/api/v2/hosting/virtualhosts/${config.siteId}/`
  const headers = { Authorization: `Bearer ${token}` }
  const site = await (await apiRequest(base, { headers })).json()
  assertHostingTarget(site, config)
  return {
    restart: async () => {
      await apiRequest(`${base}restart/`, { method: 'PUT', headers })
    },
  }
}

export async function waitForRelease(
  config,
  sha,
  fetcher = fetch,
  pause = delay,
) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const url =
        config.target === 'backend'
          ? `${config.origin}/health/ready`
          : `${config.origin}/release.json`
      const response = await fetcher(`${url}?release=${config.release}`, {
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (response.ok) {
        if (
          config.target === 'site' &&
          (await response.json()).revision === sha
        )
          return
        if (
          config.target === 'backend' &&
          response.headers.get('x-service-revision') === sha
        )
          return
      }
    } catch {
      /* The hosting supervisor may still be restarting the process. */
    }
    await pause(3000)
  }
  throw new Error('The deployed release did not become healthy')
}

export async function deploy(config) {
  const api = await createApi(config)
  if (
    config.initializeAdmin &&
    (!config.adminEmail ||
      !config.adminPassword ||
      config.adminPassword.length < 12)
  )
    throw new Error(
      'Provide INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD for the first deployment',
    )
  const temporary = await mkdtemp(join(tmpdir(), 'coach-netangels-'))
  try {
    const key = join(temporary, 'key')
    const hosts = join(temporary, 'known_hosts')
    await writeFile(key, `${config.privateKey.trim()}\n`, { mode: 0o600 })
    await writeFile(hosts, `${config.knownHosts.trim()}\n`, { mode: 0o600 })
    const sharedOptions = [
      '-i',
      key,
      '-o',
      `UserKnownHostsFile=${hosts}`,
      '-o',
      'StrictHostKeyChecking=yes',
      '-o',
      'BatchMode=yes',
      '-o',
      'ConnectTimeout=15',
      '-o',
      'ServerAliveInterval=15',
      '-o',
      'ServerAliveCountMax=4',
    ]
    const destination = `${config.user}@${config.host}`
    const ssh = (script, options) =>
      run(
        'ssh',
        [
          ...sharedOptions,
          '-p',
          config.port,
          destination,
          `bash -ic ${shellQuote(`set -euo pipefail\n${script}`)}`,
        ],
        options,
      )
    const releaseRoot =
      config.target === 'backend'
        ? `${config.directory}/releases`
        : `${dirname(config.directory)}/.site-releases`
    const releasePath = `${releaseRoot}/${config.release}`
    const archive = join(temporary, 'release.tar.gz')
    const backendRoot = fileURLToPath(new URL('../../', import.meta.url))
    if (config.target === 'backend') {
      await writeFile(
        join(backendRoot, 'release.json'),
        `${JSON.stringify({ revision: process.env.GITHUB_SHA })}\n`,
      )
      await run(
        'tar',
        [
          '-czf',
          archive,
          'dist',
          'admin-ui',
          'prisma',
          'prisma.config.ts',
          'package.json',
          'pnpm-lock.yaml',
          'pnpm-workspace.yaml',
          'content',
          'release.json',
          'scripts/netangels/start.cjs',
        ],
        { cwd: backendRoot },
      )
    } else {
      const root = resolve(backendRoot, '..')
      const contentRevision = Number(process.env.CONTENT_REVISION)
      if (!Number.isSafeInteger(contentRevision) || contentRevision < 0)
        throw new Error('Missing content revision for the site build')
      await writeFile(
        join(root, 'dist/release.json'),
        `${JSON.stringify({ revision: process.env.GITHUB_SHA, contentRevision })}\n`,
      )
      await run('tar', ['-czf', archive, '-C', join(root, 'dist'), '.'])
    }
    const pointer =
      config.target === 'backend'
        ? `${config.directory}/current`
        : config.directory
    const previous = await ssh(
      `if [ -L ${shellQuote(pointer)} ]; then readlink ${shellQuote(pointer)}; elif [ -e ${shellQuote(pointer)} ]; then printf 'The target must be a symlink or absent. See deployment instructions.\\n' >&2; exit 1; fi`,
      { capture: true },
    )
    if (previous && !previous.startsWith(`${releaseRoot}/`))
      throw new Error(
        'Existing symlink is outside this project release directory',
      )
    await ssh(
      `test -d ${shellQuote(dirname(config.directory))}\nmkdir -p ${shellQuote(releaseRoot)}\ntest ! -e ${shellQuote(releasePath)}`,
    )
    await run('scp', [
      ...sharedOptions,
      '-P',
      config.port,
      archive,
      `${destination}:${releaseRoot}/${config.release}.tar.gz`,
    ])
    await ssh(
      `mkdir ${shellQuote(releasePath)}\ntar -xzf ${shellQuote(`${releaseRoot}/${config.release}.tar.gz`)} -C ${shellQuote(releasePath)}\nrm ${shellQuote(`${releaseRoot}/${config.release}.tar.gz`)}`,
    )
    if (config.target === 'backend') {
      await ssh(
        `cd ${shellQuote(dirname(config.directory))}\ncd ${shellQuote(releasePath)}\ntest -f ${shellQuote(`${config.directory}/shared/.env`)}\nln -s ${shellQuote(`${config.directory}/shared/.env`)} .env\nnode -e "if (!process.version.startsWith('v24.')) process.exit(1)"\ntest "$(pnpm --version)" = '11.15.1'\npnpm install --prod --frozen-lockfile\nnode node_modules/prisma/build/index.js migrate deploy --config prisma.config.ts\nnode dist/bootstrap/content/main.js`,
      )
      if (config.initializeAdmin) {
        await ssh(
          `cd ${shellQuote(dirname(config.directory))}\ncd ${shellQuote(releasePath)}\nnode dist/bootstrap/admin/main.js --email ${shellQuote(config.adminEmail)}`,
          { input: `${config.adminPassword}\n` },
        )
      }
      await ssh(
        `cp ${shellQuote(`${releasePath}/scripts/netangels/start.cjs`)} ${shellQuote(`${config.directory}/start.cjs.next`)}\nmv ${shellQuote(`${config.directory}/start.cjs.next`)} ${shellQuote(`${config.directory}/start.cjs`)}`,
      )
    }
    let switched = false
    try {
      await ssh(
        `ln -s ${shellQuote(releasePath)} ${shellQuote(`${pointer}.next`)}\nmv -Tf ${shellQuote(`${pointer}.next`)} ${shellQuote(pointer)}`,
      )
      switched = true
      if (config.target === 'backend') await api.restart()
      await waitForRelease(config, process.env.GITHUB_SHA)
      process.stdout.write(
        `Deployed ${config.target} release ${config.release}\n`,
      )
    } catch (error) {
      if (switched && previous) {
        await ssh(
          `ln -s ${shellQuote(previous)} ${shellQuote(`${pointer}.rollback`)}\nmv -Tf ${shellQuote(`${pointer}.rollback`)} ${shellQuote(pointer)}`,
        )
        if (config.target === 'backend') await api.restart()
        process.stderr.write(
          'Restored the previous code release. Database migrations were preserved.\n',
        )
      }
      throw error
    }
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void deploy(readDeployConfig(process.env)).catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
}
