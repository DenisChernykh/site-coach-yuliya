import test from 'node:test';
import assert from 'node:assert/strict';
import { withBase } from '../src/shared/routes';

test('project hosting prefixes page, anchor, and public asset URLs once', () => {
  const base = '/site-coach-yuliya-pages/';
  for (const path of ['/', '/about/', '/#approach', '/icons/telegram.svg']) {
    const result = withBase(path, base);
    assert.equal(result, `${base.slice(0, -1)}${path}`);
    assert.equal(withBase(result, base), result);
  }
  assert.equal(withBase('/about/', '/'), '/about/');
  assert.equal(
    withBase('/site-coach-yuliya-pages-extra/', base),
    `${base}site-coach-yuliya-pages-extra/`,
  );
});

test('project hosting preserves external links, fragments, and query strings', () => {
  for (const path of [
    'https://example.com/',
    '//example.com/',
    'mailto:a@example.com',
    'tel:+7000',
    '#contact',
    '?service=coaching#contact',
  ]) {
    assert.equal(withBase(path, '/project/'), path);
  }
});
