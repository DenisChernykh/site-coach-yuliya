import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import {
  assertHostingTarget,
  readDeployConfig,
  shellQuote,
  waitForRelease,
} from '../scripts/netangels/deploy.mjs'

function environment() {
  return {
    DEPLOY_TARGET: 'backend',
    NETANGELS_SSH_HOST: 'h1.netangels.ru',
    NETANGELS_SSH_USER: 'hosting_user',
    NETANGELS_API_DOMAIN: 'api.example.com',
    NETANGELS_SITE_DOMAIN: 'example.com',
    NETANGELS_APP_DIR: '/home/hosting_user/api.example.com/app',
    NETANGELS_WWW_DIR: '/home/hosting_user/example.com/www',
    NETANGELS_API_SITE_ID: '123',
    NETANGELS_STATIC_SITE_ID: '124',
    PUBLIC_API_URL: 'https://api.example.com',
    PUBLIC_SITE_URL: 'https://example.com',
    GITHUB_SHA: 'a'.repeat(40),
    GITHUB_RUN_ID: '456',
    GITHUB_RUN_ATTEMPT: '1',
    NETANGELS_SSH_PRIVATE_KEY: 'test-key',
    NETANGELS_SSH_KNOWN_HOSTS: 'test-known-host',
    NETANGELS_API_KEY: 'test-api-key',
  }
}

test('shell quoting preserves literal newlines, quotes and command substitutions', () => {
  const value = "first\nsecond ' `exit 73` $(exit 74) ; exit 75"
  const result = spawnSync('sh', ['-c', `printf '%s' ${shellQuote(value)}`], {
    encoding: 'utf8',
  })
  assert.equal(result.status, 0)
  assert.equal(result.stdout, value)
})

test('backend and static deployments select their own hosting targets', () => {
  const backend = readDeployConfig(environment())
  const site = readDeployConfig({
    ...environment(),
    DEPLOY_TARGET: 'site',
    INITIALIZE_ADMIN: 'true',
  })
  assert.equal(backend.directory, '/home/hosting_user/api.example.com/app')
  assert.equal(site.siteId, '124')
  assert.equal(site.directory, '/home/hosting_user/example.com/www')
  assert.equal(site.initializeAdmin, false)
})

test('deployment rejects another domain, traversal and unsafe SSH arguments', () => {
  for (const override of [
    { NETANGELS_APP_DIR: '/home/hosting_user/example.com/app' },
    { NETANGELS_APP_DIR: '/home/hosting_user/../api.example.com/app' },
    { NETANGELS_APP_DIR: '/home/hosting_user/api.example.com/app;exit' },
    { NETANGELS_SSH_HOST: '-oProxyCommand=exit' },
    { NETANGELS_SSH_USER: 'name;exit' },
    { NETANGELS_SSH_PORT: '65536' },
    { PUBLIC_API_URL: 'http://api.example.com' },
    { PUBLIC_API_URL: 'https://other.example.com' },
    { PUBLIC_API_URL: 'https://secret@api.example.com' },
    { PUBLIC_API_URL: 'https://api.example.com/health' },
    { GITHUB_SHA: 'unverified-branch' },
    { NETANGELS_API_SITE_ID: '0' },
  ])
    assert.throws(() => readDeployConfig({ ...environment(), ...override }))
})

test('hosting identity, engine and Node version are verified before deployment', () => {
  const config = readDeployConfig(environment())
  const site = {
    id: 123,
    name: 'api.example.com',
    engine: 'nodejs',
    engine_version: '24.18.0',
    state: 'Active',
  }
  assert.doesNotThrow(() => assertHostingTarget(site, config))
  for (const override of [
    { id: 124 },
    { name: 'example.com' },
    { engine: 'static' },
    { engine_version: '22.1.0' },
    { state: 'Blocked' },
  ])
    assert.throws(() => assertHostingTarget({ ...site, ...override }, config))
})

test('healthy responses from the previous backend do not confirm a new release', async () => {
  const config = readDeployConfig(environment())
  let requests = 0
  await waitForRelease(
    config,
    environment().GITHUB_SHA,
    async (url) => {
      assert.equal(new URL(url).pathname, '/health/ready')
      requests += 1
      return new Response('{}', {
        headers: {
          'x-service-revision':
            requests === 1 ? 'b'.repeat(40) : environment().GITHUB_SHA,
        },
      })
    },
    async () => {},
  )
  assert.equal(requests, 2)
})

test('static deployment waits for its release metadata after transient errors', async () => {
  const config = readDeployConfig({ ...environment(), DEPLOY_TARGET: 'site' })
  let requests = 0
  await waitForRelease(
    config,
    environment().GITHUB_SHA,
    async (url) => {
      assert.equal(new URL(url).pathname, '/release.json')
      requests += 1
      if (requests === 1) throw new Error('Restarting')
      return Response.json({
        revision: environment().GITHUB_SHA,
        contentRevision: 5,
      })
    },
    async () => {},
  )
  assert.equal(requests, 2)
})

test('a permanently stale release fails the deployment health gate', async () => {
  const config = readDeployConfig(environment())
  let requests = 0
  await assert.rejects(
    waitForRelease(
      config,
      environment().GITHUB_SHA,
      async () => {
        requests += 1
        return new Response('{}', {
          headers: { 'x-service-revision': 'b'.repeat(40) },
        })
      },
      async () => {},
    ),
    /did not become healthy/u,
  )
  assert.equal(requests, 40)
})
