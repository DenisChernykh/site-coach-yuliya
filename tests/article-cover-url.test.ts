import assert from 'node:assert/strict';
import test from 'node:test';
import { articleCoverUrl } from '../src/shared/lib/article-cover-url';

test('uploaded covers resolve against the API when site and API have different origins', () => {
  const path = '/v1/story-media/a7b563f2-661d-4c18-a842-82b1c3707530';
  assert.equal(
    articleCoverUrl(path, 'https://api.example.com/'),
    `https://api.example.com${path}?variant=optimized`,
  );
  assert.equal(articleCoverUrl(path, ''), `${path}?variant=optimized`);
  for (const value of [
    '/articles/cover.webp',
    '/_astro/cover.webp',
    'https://images.example.com/photo.jpg',
  ]) {
    assert.equal(articleCoverUrl(value, 'https://api.example.com'), value);
  }
});
