import { appendFile } from 'node:fs/promises'

const origin = new URL(process.env.PUBLIC_API_URL)
if (
  origin.protocol !== 'https:' ||
  origin.pathname !== '/' ||
  origin.username ||
  origin.password
)
  throw new Error('PUBLIC_API_URL must be an HTTPS origin')
const response = await fetch(`${origin.origin}/v1/content-version`, {
  signal: AbortSignal.timeout(15000),
  redirect: 'error',
  headers: { 'Cache-Control': 'no-cache' },
})
if (!response.ok)
  throw new Error(`Could not read content version (${response.status})`)
const { revision } = await response.json()
if (!Number.isSafeInteger(revision) || revision < 0)
  throw new Error('Invalid content revision')
await appendFile(process.env.GITHUB_ENV, `CONTENT_REVISION=${revision}\n`)
