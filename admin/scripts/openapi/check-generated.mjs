import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

async function snapshot(root) {
  const files = await readdir(root, {
    recursive: true,
    withFileTypes: true,
  }).catch(() => [])
  const result = {}
  for (const file of files) {
    if (!file.isFile()) continue
    const path = file.parentPath + '/' + file.name
    result[path] = createHash('sha256')
      .update(await readFile(path))
      .digest('hex')
  }
  result['openapi/openapi.json'] = createHash('sha256')
    .update(await readFile('openapi/openapi.json').catch(() => ''))
    .digest('hex')
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
    ),
  )
}

const before = await snapshot('src/shared/api')
const run = spawnSync('pnpm', ['api:generate'], { stdio: 'inherit' })
if (run.status !== 0) process.exit(run.status ?? 1)
if (before !== (await snapshot('src/shared/api'))) {
  console.error(
    'Generated API изменился. Проверь результат pnpm api:generate и повтори проверку.',
  )
  process.exit(1)
}
console.log('Клиент и документация воспроизводятся без изменений.')
