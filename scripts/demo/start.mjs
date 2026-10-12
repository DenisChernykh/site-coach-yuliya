import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { createDemoGateway } from './gateway.mjs';
import { findTunnelOrigin } from './tunnel-output.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const backend = join(root, 'backend');
const localOnly = process.argv.includes('--local');
const provider = process.env.DEMO_TUNNEL_PROVIDER ?? 'vscode';
const state = { ready: false, origin: undefined };
const children = new Set();
let gateway;
let astro;
let stopping = false;
let ownsSession = false;
let refreshTimer;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  state.ready = false;
  clearTimeout(refreshTimer);
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // A child may have already exited.
    }
  }
  const forceExit = setTimeout(() => {
    for (const child of children) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        // Already stopped.
      }
    }
    process.exit(code);
  }, 8_000);
  forceExit.unref();
  await astro?.stop();
  gateway?.close();
  gateway?.closeAllConnections();
  if (ownsSession) await rm(join(root, '.demo/session.json'), { force: true });
  process.exitCode = code;
}

process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    detached: true,
    ...options,
  });
  children.add(child);
  child.on('error', () => {
    console.error(`Не удалось запустить ${command}.`);
    void stop(1);
  });
  child.on('exit', (code) => {
    children.delete(child);
    if (!stopping) {
      console.error(`${command} остановился (код ${code}).`);
      void stop(1);
    }
  });
  return child;
}

async function run(command, args, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    detached: true,
  });
  children.add(child);
  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      children.delete(child);
      if (code === 0) resolve();
      else reject(new Error(`${command} завершился с кодом ${code}.`));
    });
  });
}

async function checkPort(port) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', resolve);
  });
  await new Promise((resolve) => probe.close(resolve));
}

async function waitFor(url, expectedSiteName) {
  const deadline = Date.now() + 60_000;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(3_000),
      });
      if (expectedSiteName === undefined) {
        await response.arrayBuffer();
        if (response.ok) return;
      } else if (
        response.ok &&
        response.headers.get('content-type')?.includes('application/json')
      ) {
        if ((await response.json()).name === expectedSiteName) return;
      } else {
        await response.arrayBuffer();
      }
    } catch {
      // The listener may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Сервер не ответил: ${url}`);
}

async function cloudflareTunnel() {
  const tunnel = start(
    'cloudflared',
    [
      'tunnel',
      '--url',
      'http://127.0.0.1:8787',
      '--no-autoupdate',
      '--protocol',
      'http2',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return readTunnelOrigin(tunnel);
}

async function vscodeTunnel() {
  const client =
    process.env.DEMO_VSCODE_CLI ??
    (process.platform === 'darwin'
      ? '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code-tunnel'
      : 'code-tunnel');
  const tunnel = start(
    client,
    [
      '--cli-data-dir',
      join(root, '.demo/vscode'),
      'tunnel',
      'forward-internal',
      '--provider',
      'github',
    ],
    { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1' } },
  );
  tunnel.stdin.on('error', () => void stop(1));
  tunnel.stdin.write(
    `${JSON.stringify([{ number: 8787, privacy: 'public', protocol: 'http' }])}\n`,
  );
  return readTunnelOrigin(tunnel);
}

async function localhostTunnel() {
  await mkdir(join(root, '.demo'), { recursive: true });
  const tunnel = start(
    'ssh',
    [
      '-F',
      '/dev/null',
      '-T',
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-o',
      `UserKnownHostsFile=${join(root, '.demo/known_hosts')}`,
      '-o',
      'IdentityAgent=none',
      '-o',
      'IdentityFile=/dev/null',
      '-o',
      'IdentitiesOnly=yes',
      '-o',
      'ServerAliveInterval=30',
      '-o',
      'ServerAliveCountMax=3',
      '-o',
      'ExitOnForwardFailure=yes',
      '-o',
      'ConnectTimeout=15',
      '-R',
      '80:127.0.0.1:8787',
      'nokey@localhost.run',
      '--',
      '--output',
      'json',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return readTunnelOrigin(tunnel);
}

function readTunnelOrigin(tunnel) {
  return new Promise((resolve, reject) => {
    let output = '';
    let firstOrigin;
    const timeout = setTimeout(() => {
      reject(new Error('Сервис не выдал адрес туннеля за 60 секунд.'));
    }, 60_000);
    function read(chunk) {
      const content = output + chunk.toString();
      output = content.slice(-8_192);
      process.stderr.write(chunk);
      const origin = findTunnelOrigin(content, provider);
      if (origin) {
        clearTimeout(timeout);
        if (firstOrigin && firstOrigin.origin !== origin.origin) {
          console.error(
            'Сервис изменил адрес туннеля. Перезапустите pnpm demo:tunnel, чтобы обновить настройки доступа.',
          );
          void stop(1);
        } else {
          firstOrigin = origin;
          resolve(origin);
        }
      }
    }
    tunnel.stdout.on('data', read);
    tunnel.stderr.on('data', read);
    tunnel.once('error', () => {
      clearTimeout(timeout);
      reject(new Error('Не удалось запустить клиент туннеля.'));
    });
    tunnel.once('exit', () => {
      clearTimeout(timeout);
      reject(new Error('Процесс туннеля остановился.'));
    });
  });
}

try {
  if (!['cloudflare', 'localhost-run', 'vscode'].includes(provider)) {
    throw new Error(
      'DEMO_TUNNEL_PROVIDER must be vscode, cloudflare or localhost-run.',
    );
  }
  if (!process.version.startsWith('v24.')) {
    throw new Error('Для проекта нужен Node.js 24.');
  }
  const pnpm = spawnSync('pnpm', ['--version'], { encoding: 'utf8' });
  if (pnpm.stdout?.trim() !== '11.15.1') {
    throw new Error('Для проекта нужен pnpm 11.15.1.');
  }
  await access(join(backend, '.env'));
  await access(join(backend, '.admin-credentials.json'));
  const localEnv = parseEnv(await readFile(join(backend, '.env'), 'utf8'));
  if (process.platform === 'darwin') {
    start('caffeinate', ['-i', '-w', String(process.pid)]);
  }
  const telegramMode =
    process.env.TELEGRAM_NOTIFICATIONS_MODE ??
    localEnv.TELEGRAM_NOTIFICATIONS_MODE ??
    'disabled';
  for (const port of [3001, 4323, 8787]) await checkPort(port);
  await run(
    'docker',
    ['compose', '-f', 'compose.local.yml', 'up', '-d', '--wait'],
    backend,
  );
  await run('pnpm', ['--dir', 'admin', 'build']);
  await run('pnpm', ['--dir', 'backend', 'build']);
  gateway = createDemoGateway({
    siteTarget: 'http://127.0.0.1:4323',
    apiTarget: 'http://127.0.0.1:3001',
    state,
  });
  await new Promise((resolve, reject) => {
    gateway.once('error', reject);
    gateway.listen(8787, '127.0.0.1', resolve);
  });
  state.origin = localOnly
    ? new URL('http://127.0.0.1:8787')
    : provider === 'vscode'
      ? await vscodeTunnel()
      : provider === 'localhost-run'
        ? await localhostTunnel()
        : await cloudflareTunnel();
  const origin = state.origin.origin;
  console.log(`Адрес демо: ${origin}`);
  start('node', ['dist/bootstrap/api/main.js'], {
    cwd: backend,
    env: {
      ...process.env,
      NODE_ENV: localOnly ? 'development' : 'production',
      API_HOST: '127.0.0.1',
      API_PORT: '3001',
      PUBLIC_API_URL: origin,
      CORS_ORIGINS: origin,
      TRUST_PROXY_CIDRS: '127.0.0.1/32',
      ADMIN_STATIC_DIR: join(root, 'admin/dist'),
      API_DOCS_MODE: 'off',
      OTEL_SDK_DISABLED: 'true',
      SITE_REBUILD_MODE: 'disabled',
    },
  });
  await waitFor('http://127.0.0.1:3001/health/ready');
  process.env.PUBLIC_DATA_SOURCE = 'api';
  process.env.PUBLIC_API_BASE_URL = origin;
  process.env.API_INTERNAL_BASE_URL = 'http://127.0.0.1:3001';
  const { build, preview } = await import('astro');
  const previewConfig = (outDir) => ({
    root,
    outDir,
    cacheDir: join(root, '.demo/astro'),
    server: { host: '127.0.0.1', port: 4323 },
    vite: { cacheDir: join(root, '.demo/vite'), preview: { strictPort: true } },
  });
  let currentDirectory = join(root, '.demo/site-0');
  await build(previewConfig(currentDirectory));
  astro = await preview(previewConfig(currentDirectory));
  let refreshing = false;
  let refreshRequested = false;
  async function refresh() {
    if (refreshing || stopping) return;
    refreshing = true;
    try {
      while (refreshRequested && !stopping) {
        refreshRequested = false;
        const nextDirectory = join(
          root,
          currentDirectory.endsWith('site-0') ? '.demo/site-1' : '.demo/site-0',
        );
        await build(previewConfig(nextDirectory));
        if (stopping) break;
        await astro.stop();
        try {
          astro = await preview(previewConfig(nextDirectory));
        } catch (error) {
          astro = await preview(previewConfig(currentDirectory));
          throw error;
        }
        currentDirectory = nextDirectory;
        console.log('Демо-сайт обновлён после сохранения контента.');
      }
    } catch {
      console.error(
        'Не удалось обновить демо-сайт. Сохранена предыдущая сборка.',
      );
    } finally {
      refreshing = false;
    }
  }
  state.onContentSaved = () => {
    refreshRequested = true;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refresh(), 250);
  };
  await waitFor('http://127.0.0.1:4323/');
  state.ready = true;
  const settings = await (await fetch('http://127.0.0.1:3001/v1/site')).json();
  await waitFor(`${origin}/v1/site`, settings.name);
  await mkdir(join(root, '.demo'), { recursive: true });
  await writeFile(
    join(root, '.demo/session.json'),
    `${JSON.stringify({ url: origin, adminUrl: `${origin}/admin/`, pid: process.pid }, null, 2)}\n`,
    { mode: 0o600 },
  );
  ownsSession = true;
  console.log(`\nСайт: ${origin}/\nАдминка: ${origin}/admin/`);
  console.log('Данные для входа: backend/.admin-credentials.json');
  console.log(
    `Заявки сохраняются в локальной базе; Telegram: ${telegramMode}.`,
  );
  console.log(
    'Остановка: Ctrl+C. Компьютер и этот процесс должны оставаться включёнными.',
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Ошибка запуска демо.',
  );
  await stop(1);
}
