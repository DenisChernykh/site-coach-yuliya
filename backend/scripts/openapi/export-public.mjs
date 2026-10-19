import { readFile, writeFile } from 'node:fs/promises'

const full = JSON.parse(await readFile('docs/api/openapi.json', 'utf8'))
const publicPaths = [
  '/v1/story-media/{id}',
  '/v1/page-layouts',
  '/v1/site',
  '/v1/seo',
  '/v1/contacts',
  '/v1/home',
  '/v1/services',
  '/v1/articles',
  '/v1/articles/{slug}',
  '/v1/faq',
  '/v1/social-links',
  '/v1/consultations',
]
const paths = Object.fromEntries(
  publicPaths.map((path) => {
    if (!full.paths[path]) throw new Error(`Missing public route: ${path}`)
    return [path, full.paths[path]]
  }),
)
const schemas = {}
function includeRefs(value) {
  if (value === null || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (
      key === '$ref' &&
      typeof child === 'string' &&
      child.startsWith('#/components/schemas/')
    ) {
      const name = child.split('/').at(-1)
      if (!(name in schemas)) {
        if (!full.components.schemas[name])
          throw new Error(`Missing schema: ${name}`)
        schemas[name] = full.components.schemas[name]
        includeRefs(schemas[name])
      }
    } else includeRefs(child)
  }
}
includeRefs(paths)
await writeFile(
  'docs/api/public-openapi.json',
  `${JSON.stringify({ openapi: full.openapi, info: full.info, paths, components: { schemas } }, null, 2)}\n`,
)
