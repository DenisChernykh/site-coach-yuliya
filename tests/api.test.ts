import test from 'node:test';
import assert from 'node:assert/strict';
import { isMockMode } from '../src/shared/api/client/api-fetch';
import { ApiProblemError } from '../src/shared/api/client/api-errors';
import { getSiteSettings } from '../src/shared/api/generated/site/site';
import { getHomePage } from '../src/shared/api/generated/home/home';
import {
  getArticles,
  getArticle,
} from '../src/shared/api/generated/articles/articles';
import { getServices } from '../src/shared/api/generated/services/services';
import { getFaq } from '../src/shared/api/generated/faq/faq';
import { getSocialLinks } from '../src/shared/api/generated/social-links/social-links';
import { createConsultation } from '../src/shared/api/generated/consultations/consultations';
import { handleMockRequest } from '../src/shared/api/mocks/handler';

test('generated client provides all content without a backend or network', async () => {
  assert.equal(isMockMode, true);
  const network = test.mock.method(globalThis, 'fetch', () => {
    throw new Error('Mock mode must not access the network.');
  });
  try {
    const [site, home, services, articles, faq, socials] = await Promise.all([
      getSiteSettings(),
      getHomePage(),
      getServices(),
      getArticles(),
      getFaq(),
      getSocialLinks(),
    ]);
    assert.equal(site.name, 'Юля Валишина');
    assert.equal(home.hero.headingLines.length, 3);
    assert.equal(services.length, 3);
    assert.equal(articles.length, 2);
    assert.ok(faq.length > 0);
    assert.equal(socials.length, 4);
    assert.equal(network.mock.callCount(), 0);
  } finally {
    network.mock.restore();
  }
});

test('article filters and detail use the same generated contract', async () => {
  const articles = await getArticles({ topic: 'finding-work' });
  assert.equal(articles.length, 1);
  assert.equal(articles[0]?.slug, 'finding-your-work');
  const article = await getArticle(articles[0]!.slug);
  assert.deepEqual(article, articles[0]);
  assert.equal(article.sections.length, 5);
  assert.deepEqual(await getArticles({ topic: 'showing-up' }), [
    await getArticle('showing-up'),
  ]);
  await assert.rejects(
    getArticle('missing-article'),
    (error: unknown) =>
      error instanceof ApiProblemError && error.status === 404,
  );
});

test('content responses are independent and do not mutate fixtures', async () => {
  const articles = await getArticles();
  const title = articles[0]!.title;
  articles[0]!.title = 'Modified locally';
  articles[0]!.sections.splice(0);
  const fresh = await getArticle(articles[0]!.slug);
  assert.equal(fresh.title, title);
  assert.equal(fresh.sections.length, 5);
});

test('consultation validates input and never claims delivery in mock mode', async () => {
  const valid = {
    name: 'Тест',
    contact: '@local_demo',
    consent: true as const,
  };
  const result = await createConsultation(valid);
  assert.equal(result.status, 'preview');
  assert.match(result.message, /Заявка не отправлена, данные не сохранены/);
  for (const data of [
    null,
    [],
    {},
    { ...valid, consent: false },
    { ...valid, name: ' ' },
    { ...valid, contact: '123' },
    { ...valid, message: 'a'.repeat(2001) },
    { ...valid, serviceId: 42 },
    { ...valid, website: null },
    { ...valid, website: 42 },
    { ...valid, website: 'x'.repeat(2001) },
  ]) {
    await assert.rejects(
      handleMockRequest('/v1/consultations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      (error: unknown) =>
        error instanceof ApiProblemError &&
        error.code === 'VALIDATION_FAILED' &&
        error.status === 400,
    );
  }
  await assert.rejects(
    handleMockRequest('/v1/consultations', { method: 'POST', body: '{' }),
    ApiProblemError,
  );
});

test('generated requests respect AbortSignal', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    getArticles(undefined, { signal: controller.signal }),
    (error: unknown) =>
      error instanceof DOMException && error.name === 'AbortError',
  );
});
