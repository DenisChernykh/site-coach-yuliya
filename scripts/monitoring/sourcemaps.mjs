import { readdir, rm } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
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

export async function prepareSourceMaps(
  directories,
  env = process.env,
  execute = spawnSync,
) {
  const allowed = new Set([
    'dist',
    'backend/dist',
    'backend/admin-ui',
    'admin/dist',
  ]);
  if (
    directories.length === 0 ||
    directories.some((path) => !allowed.has(path))
  ) {
    throw new Error('Specify only application build directories');
  }
  const upload = env.SENTRY_UPLOAD_SOURCEMAPS === 'true';
  if (
    upload &&
    [
      'SENTRY_AUTH_TOKEN',
      'SENTRY_ORG',
      'SENTRY_PROJECT',
      'SENTRY_RELEASE',
    ].some((key) => !env[key])
  ) {
    throw new Error(
      'Source map upload requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT and SENTRY_RELEASE',
    );
  }
  for (const directory of directories) {
    const maps = await sourceMaps(resolve(directory));
    if (upload) {
      if (maps.length === 0)
        throw new Error('Source maps missing in ' + directory);
      for (const args of [
        ['sourcemaps', 'inject', directory],
        ['sourcemaps', 'upload', '--release', env.SENTRY_RELEASE, directory],
      ]) {
        const result = execute(resolve('node_modules/.bin/sentry-cli'), args, {
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 120_000,
        });
        // CLI output may include credentials or source excerpts. Keep CI output bounded.
        if (result.status !== 0)
          throw new Error('Sentry source map operation failed in ' + directory);
      }
    }
    for (const path of maps) {
      if (relative(resolve(directory), path).startsWith('..'))
        throw new Error('Invalid map path');
      await rm(path);
    }
    console.log(
      directory +
        ': source maps ' +
        (upload ? 'uploaded and removed' : 'removed'),
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
