import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { test } from 'node:test';
import { getHomePage } from '../src/shared/api/generated/home/home';
import { storyMediaUrl } from '../src/shared/lib/story-media';
import { withBase } from '../src/shared/routes';

test('demo home includes playable photo and video stories with bundled media', async () => {
  const home = await getHomePage();
  const groups = home.stories?.filter((group) => group.enabled) ?? [];
  assert.equal(groups.length, 2);
  for (const group of groups) {
    const slides = group.slides.filter((slide) => slide.enabled);
    assert.ok(slides.some((slide) => slide.type === 'image'));
    assert.ok(slides.some((slide) => slide.type === 'video'));
    for (const id of [
      group.coverMediaId,
      ...slides.map((slide) => slide.mediaId),
    ]) {
      const path = storyMediaUrl(id);
      assert.match(path, /^\/stories\/.+\.(png|mp4)$/);
      assert.ok(
        (await stat(new URL(`../public${path}`, import.meta.url))).size > 0,
      );
      assert.equal(
        withBase(path, '/site-coach-yuliya/'),
        `/site-coach-yuliya${path}`,
      );
      assert.equal(
        storyMediaUrl(id, 'https://api.example/'),
        `https://api.example/v1/story-media/${id}`,
      );
    }
  }
});
