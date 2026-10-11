import { readFile, writeFile, rename } from 'node:fs/promises';

const source = process.env.OPENAPI_SPEC_SOURCE;
if (!source)
  throw new Error(
    'Задай OPENAPI_SPEC_SOURCE: URL или путь к OpenAPI JSON будущего NestJS backend.',
  );

let content;
if (/^https?:\/\//.test(source)) {
  const response = await fetch(source, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok)
    throw new Error(`OpenAPI source вернул HTTP ${response.status}.`);
  content = await response.text();
} else {
  content = await readFile(source, 'utf8');
}
const spec = JSON.parse(content);
if (
  !spec.openapi?.startsWith('3.') ||
  !spec.paths ||
  !spec.components?.schemas
) {
  throw new Error(
    'Ожидался OpenAPI 3.x JSON с paths и components.schemas. Snapshot не изменён.',
  );
}
await writeFile(
  'openapi/openapi.json.tmp',
  JSON.stringify(spec, null, 2) + '\n',
);
await rename('openapi/openapi.json.tmp', 'openapi/openapi.json');
console.log('OpenAPI snapshot обновлён. Выполни pnpm api:generate.');
