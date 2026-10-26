import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  readDeployConfig,
  shellQuote,
} from '../../backend/scripts/netangels/deploy.mjs';

export function privateMapDestination(config, sha) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid release revision');
  return `${dirname(config.directory)}/.source-maps/${sha}`;
}
function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
  });
  if (result.status !== 0)
    throw new Error(`Private source map ${command} failed`);
}
export async function uploadSourceMaps(env = process.env) {
  const config = readDeployConfig(env);
  const destination = privateMapDestination(config, env.GITHUB_SHA);
  const temporary = await mkdtemp(join(tmpdir(), 'monitor-maps-'));
  try {
    const key = join(temporary, 'key'),
      hosts = join(temporary, 'hosts'),
      archive = join(temporary, 'maps.tar.gz');
    await writeFile(key, config.privateKey, { mode: 0o600 });
    await writeFile(hosts, config.knownHosts, { mode: 0o600 });
    const options = [
      '-i',
      key,
      '-o',
      `UserKnownHostsFile=${hosts}`,
      '-o',
      'StrictHostKeyChecking=yes',
      '-o',
      'BatchMode=yes',
      '-o',
      'ConnectTimeout=15',
    ];
    const host = `${config.user}@${config.host}`;
    run('tar', [
      '-czf',
      archive,
      '-C',
      resolve('.monitoring-artifacts', env.GITHUB_SHA),
      config.target === 'site' ? 'dist' : 'backend',
    ]);
    run('ssh', [
      ...options,
      '-p',
      config.port,
      host,
      `umask 077; mkdir -p ${shellQuote(destination)}`,
    ]);
    run('scp', [
      ...options,
      '-P',
      config.port,
      archive,
      `${host}:${destination}/${config.target}.tar.gz`,
    ]);
    console.log(
      'Source maps saved outside the public web directory for release ' +
        env.GITHUB_SHA,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  uploadSourceMaps().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
