// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { syncOpenApi, validateOpenApiDocument } from './sync-openapi.mjs'

const operations = [
  ['/v1/auth/login', 'post', 'authLogin'],
  ['/v1/auth/me', 'get', 'authGetMe'],
  ['/v1/auth/csrf', 'get', 'authGetCsrfToken'],
  ['/v1/auth/logout', 'post', 'authLogout'],
  ['/v1/admin/consultations', 'get', 'adminListConsultations'],
  ['/v1/admin/articles', 'get', 'adminListArticles'],
  ['/v1/admin/contacts', 'put', 'adminUpdateContacts'],
  ['/v1/admin/programs', 'post', 'adminCreateProgram'],
  ['/v1/admin/publication', 'get', 'adminGetPublication'],
]
function document() {
  return {
    openapi: '3.0.3',
    paths: Object.fromEntries(
      operations.map(([path, method, operationId]) => [
        path,
        { [method]: { operationId } },
      ]),
    ),
  }
}
describe('site admin OpenAPI contract', () => {
  it('accepts the site contract without registration or starter demo endpoints', () => {
    const value = document()
    expect(validateOpenApiDocument(value)).toBe(value)
  })
  it.each(operations)('requires %s %s', (path, method) => {
    const value = document()
    delete value.paths[path][method]
    expect(() => validateOpenApiDocument(value)).toThrow(
      `missing ${method.toUpperCase()} ${path}`,
    )
  })
  it.each(operations)(
    'rejects an incompatible operation ID for %s %s',
    (path, method) => {
      const value = document()
      value.paths[path][method].operationId = 'incompatible'
      expect(() => validateOpenApiDocument(value)).toThrow(
        `unexpected operation ID for ${method.toUpperCase()} ${path}`,
      )
    },
  )
  it.each([null, [], {}, { openapi: '2.0', paths: {} }])(
    'rejects a malformed document %j',
    (value) => {
      expect(() => validateOpenApiDocument(value)).toThrow('OpenAPI 3')
    },
  )
  it('preserves the previous snapshot when the new source is invalid', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coach-admin-openapi-'))
    const source = join(directory, 'source.json')
    const destination = join(directory, 'snapshot.json')
    try {
      await writeFile(destination, 'previous snapshot')
      await writeFile(source, '{}')
      await expect(syncOpenApi({ source, destination })).rejects.toThrow(
        'OpenAPI 3',
      )
      expect(await readFile(destination, 'utf8')).toBe('previous snapshot')
      await writeFile(source, JSON.stringify(document()))
      await syncOpenApi({ source, destination })
      expect(JSON.parse(await readFile(destination, 'utf8'))).toEqual(
        document(),
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
