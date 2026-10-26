import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import test from 'node:test';
import { getHomePage } from '../src/shared/api/generated/home/home';
import { getContacts } from '../src/shared/api/generated/contacts/contacts';
import { getSocialLinks } from '../src/shared/api/generated/social-links/social-links';
import { contentImageUrl } from '../src/shared/lib/content-image';
import { withBase } from '../src/shared/routes';

test('published material has real local images and distinct Telegram destinations', async () => {
  const [home, contacts, socials] = await Promise.all([
    getHomePage(),
    getContacts(),
    getSocialLinks(),
  ]);
  assert.equal(contacts.telegramUrl, 'https://t.me/yuliabakirova');
  assert.equal(
    socials.find((link) => link.id === 'telegram')?.url,
    'https://t.me/Mnogogrannajulia',
  );
  assert.equal(home.education?.length, 3);
  assert.equal(home.caseStudies.length, 5);
  assert.ok(home.caseStudies.every((story) => story.enabled !== false));
  for (const image of [
    ...(home.education ?? []).map((item) => item.image),
    ...home.caseStudies
      .map((item) => item.reviewImage)
      .filter((path): path is string => Boolean(path)),
  ]) {
    assert.ok(
      (await stat(new URL(`../public${image}`, import.meta.url))).size > 0,
    );
    assert.equal(
      withBase(contentImageUrl(image), '/site-coach-yuliya/'),
      `/site-coach-yuliya${image}`,
    );
  }
});

test('uploaded images use the API origin and unsafe image schemes are rejected', () => {
  assert.equal(
    contentImageUrl('/v1/story-media/abc', 'https://api.example/'),
    'https://api.example/v1/story-media/abc',
  );
  for (const path of [
    'javascript:alert(1)',
    'data:image/svg+xml,unsafe',
    '//other.example/x',
  ])
    assert.equal(contentImageUrl(path), '');
});
