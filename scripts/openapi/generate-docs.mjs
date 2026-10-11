import { readFile, writeFile } from 'node:fs/promises';

const spec = JSON.parse(await readFile('openapi/openapi.json', 'utf8'));
const lines = [
  `# ${spec.info.title}`,
  '',
  'Сгенерировано из `openapi/openapi.json`. Не редактировать вручную.',
  '',
  spec.info.description,
  '',
  '## Методы',
  '',
  '| Метод | Путь | Назначение | operationId |',
  '| --- | --- | --- | --- |',
];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    lines.push(
      `| ${method.toUpperCase()} | \`${path}\` | ${operation.summary ?? ''} | \`${operation.operationId}\` |`,
    );
  }
}
lines.push('', '## Модели', '');
for (const [name, schema] of Object.entries(spec.components.schemas)) {
  lines.push(
    `### ${name}`,
    '',
    '| Поле | Тип | Обязательно |',
    '| --- | --- | --- |',
  );
  for (const [field, prop] of Object.entries(schema.properties ?? {})) {
    const type =
      prop.$ref?.split('/').at(-1) ??
      (prop.type === 'array'
        ? (prop.items.$ref?.split('/').at(-1) ?? prop.items.type) + '[]'
        : prop.type);
    lines.push(
      `| \`${field}\` | ${type}${prop.nullable ? ' / null' : ''} | ${schema.required?.includes(field) ? 'да' : 'нет'} |`,
    );
  }
  lines.push('');
}
await writeFile('docs/api.md', lines.join('\n'));
console.log('Документация API обновлена: docs/api.md');
