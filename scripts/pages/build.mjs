import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';

const result = spawnSync('pnpm', ['build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    GITHUB_PAGES: 'true',
    PUBLIC_SITE_URL:
      process.env.PUBLIC_SITE_URL || 'https://denischernykh.github.io',
    PUBLIC_SITE_BASE: process.env.PUBLIC_SITE_BASE || '/site-coach-yuliya/',
    PUBLIC_DATA_SOURCE: 'mock',
    PUBLIC_API_BASE_URL: '',
    API_INTERNAL_BASE_URL: '',
  },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

for (const page of ['cms-preview', 'social-links-check']) {
  rmSync(`dist-pages/${page}`, { recursive: true, force: true });
}
writeFileSync('dist-pages/.nojekyll', '');
console.log(
  'GitHub Pages demo ready in dist-pages/ (consultations are not sent).',
);
