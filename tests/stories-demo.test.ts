import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { test } from 'node:test';
import { getHomePage } from '../src/shared/api/generated/home/home';
import { storyMediaUrl } from '../src/shared/lib/story-media';
import { demoStories } from '../src/shared/api/mocks/stories';
import { withBase } from '../src/shared/routes';

test('test stories stay unpublished while bundled media remains available for previews', async () => {
  const home = await getHomePage();
  assert.deepEqual(
    home.stories?.map((group) => group.title),
    ['Образование', 'Кейс и отзыв'],
  );
  for (const group of home.stories ?? []) {
    for (const slide of group.slides) {
      const path = storyMediaUrl(slide.mediaId);
      assert.match(path, /^\/images\//);
      assert.ok(
        (await stat(new URL(`../public${path}`, import.meta.url))).size > 0,
      );
    }
  }
  const groups = demoStories;
  assert.ok(groups.every((group) => !group.enabled));
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
        `https://api.example/v1/story-media/${id}?variant=optimized`,
      );
    }
  }
});
