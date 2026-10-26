import { readdir, rm, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

async function sourceMaps(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) result.push(...(await sourceMaps(path)));
    else if (item.isFile() && item.name.endsWith('.map')) result.push(path);
  }
  return result;
}

export async function prepareSourceMaps(directories, env = process.env) {
  const allowed = new Set([
    'dist',
    'backend/dist',
    'backend/admin-ui',
    'admin/dist',
  ]);
  if (!directories.length || directories.some((path) => !allowed.has(path)))
    throw new Error('Specify only application build directories');
  const archive = env.MONITOR_ARCHIVE_SOURCEMAPS === 'true';
  if (archive && !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? ''))
    throw new Error('Private source maps require GITHUB_SHA');
  for (const directory of directories) {
    const maps = await sourceMaps(resolve(directory));
    if (archive && !maps.length)
      throw new Error('Source maps missing in ' + directory);
    for (const path of maps) {
      const local = relative(resolve(directory), path);
      if (local.startsWith('..')) throw new Error('Invalid map path');
      if (archive) {
        const destination = resolve(
          '.monitoring-artifacts',
          env.GITHUB_SHA,
          directory,
          local,
        );
        await mkdir(resolve(destination, '..'), {
          recursive: true,
          mode: 0o700,
        });
        await copyFile(path, destination);
      }
      await rm(path);
    }
    console.log(
      directory +
        ': source maps ' +
        (archive
          ? 'archived privately and removed from public build'
          : 'removed'),
    );
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  prepareSourceMaps(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
