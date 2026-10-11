import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))
if (!process.version.startsWith('v24.'))
  throw new Error('Use Node.js 24, as required by .node-version')

function run(command, args, input) {
  const result = spawnSync(command, args, {
    stdio: input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit'],
    ...(input === undefined ? {} : { input }),
    env: process.env,
  })
  if (result.status !== 0) throw new Error(`${command} failed`)
}

run('pnpm', ['--version'])
if (!existsSync('.env')) {
  let text = readFileSync('.env.example', 'utf8')
  for (const name of [
    'AUTH_SESSION_KEY_SECRET',
    'AUTH_CSRF_SECRET',
    'AUTH_RATE_LIMIT_KEY_SECRET',
    'AUTH_NETWORK_METADATA_SECRET',
  ]) {
    text = text.replace(
      new RegExp(`^${name}=.*$`, 'mu'),
      `${name}=${randomBytes(32).toString('base64url')}`,
    )
  }
  writeFileSync('.env', text, { mode: 0o600, flag: 'wx' })
}
run('docker', ['compose', '-f', 'compose.local.yml', 'up', '-d', '--wait'])
run('pnpm', ['start:migrate'])
run('pnpm', ['content:seed'])
if (!existsSync('.admin-credentials.json')) {
  const credentials = {
    email: 'admin@coach.local',
    password: randomBytes(24).toString('base64url'),
  }
  run(
    'pnpm',
    ['auth:create-admin', '--email', credentials.email],
    `${credentials.password}\n`,
  )
  writeFileSync(
    '.admin-credentials.json',
    `${JSON.stringify(credentials, null, 2)}\n`,
    { mode: 0o600, flag: 'wx' },
  )
}
process.stdout.write(
  'Ready. Admin credentials: backend/.admin-credentials.json. Start: pnpm dev:host\n',
)
