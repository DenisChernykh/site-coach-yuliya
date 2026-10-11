import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiProblemError,
  ApiNetworkError,
  ApiProtocolError,
  createApiError,
  isProblemCode,
  type ProblemDocumentLike,
} from '../src/shared/api/client/api-errors';
import { fetchApi } from '../src/shared/api/client/api-fetch';

const problem: ProblemDocumentLike = {
  type: 'https://example.test/problems/rate-limit-exceeded',
  title: 'Private title',
  status: 429,
  detail: 'Private detail',
  instance: 'urn:request:request-1',
  code: 'RATE_LIMIT_EXCEEDED',
  requestId: 'request-1',
};
function response(data: unknown = problem, retryAfter?: string) {
  return new Response(JSON.stringify(data), {
    status: 429,
    headers: {
      'Content-Type': 'application/problem+json; charset=utf-8',
      ...(retryAfter === undefined ? {} : { 'Retry-After': retryAfter }),
    },
  });
}

test('public transport preserves Problem Details, field errors, and retry metadata', async () => {
  const data = {
    ...problem,
    errors: [
      { pointer: '/name', code: 'too_small', detail: 'Private field detail' },
    ],
  };
  const error = await createApiError(response(data, '42'));
  assert.ok(error instanceof ApiProblemError);
  assert.deepEqual(error.problem, data);
  assert.equal(error.code, 'RATE_LIMIT_EXCEEDED');
  assert.equal(error.status, 429);
  assert.equal(error.requestId, 'request-1');
  assert.equal(error.retryAfterMs, 42_000);
  assert.equal(isProblemCode(error, 'RATE_LIMIT_EXCEEDED'), true);
  assert.equal(isProblemCode({ code: error.code }, error.code), false);
});

test('invalid and mismatched Problem Details become protocol errors', async () => {
  for (const data of [
    null,
    [],
    {},
    { ...problem, code: 'UNDECLARED_PROBLEM_CODE' },
    { ...problem, status: 500 },
    { ...problem, status: 429.5 },
    { ...problem, requestId: undefined },
    { ...problem, errors: null },
    { ...problem, errors: [{ pointer: 1, code: 'bad', detail: 'bad' }] },
  ]) {
    assert.ok(
      (await createApiError(response(data))) instanceof ApiProtocolError,
    );
  }
  for (const contentType of ['application/json', 'text/html']) {
    assert.ok(
      (await createApiError(
        new Response(JSON.stringify(problem), {
          status: 429,
          headers: { 'Content-Type': contentType },
        }),
      )) instanceof ApiProtocolError,
    );
  }
  assert.ok(
    (await createApiError(
      new Response('{', {
        status: 429,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    )) instanceof ApiProtocolError,
  );
});

test('Retry-After supports seconds and HTTP dates without inventing a deadline', async () => {
  const now = Date.UTC(2030, 0, 1);
  for (const [header, expected] of [
    ['0', 0],
    ['42', 42_000],
    [' 42 ', 42_000],
    ['Tue, 01 Jan 2030 00:00:05 GMT', 5_000],
    [undefined, null],
    ['', null],
    ['-1', null],
    ['0.5', null],
    ['Infinity', null],
    ['9007199254740992', null],
    ['Mon, 31 Dec 2029 23:59:59 GMT', null],
  ] as const) {
    const error = await createApiError(response(problem, header), now);
    assert.ok(error instanceof ApiProblemError);
    assert.equal(error.retryAfterMs, expected, String(header));
  }
});

test('fetch boundary normalizes HTTP and network errors and rejects malformed successes', async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, options?: RequestInit) => {
      assert.equal(
        new Headers(options?.headers).get('Accept'),
        'application/json, application/problem+json',
      );
      return response(problem, '12');
    },
  );
  await assert.rejects(
    fetchApi('https://example.test/v1/consultations'),
    (error: unknown) =>
      error instanceof ApiProblemError && error.retryAfterMs === 12_000,
  );
  fetchMock.mock.mockImplementation(async () => {
    throw new TypeError('fetch failed: private network detail');
  });
  await assert.rejects(fetchApi('https://example.test'), ApiNetworkError);
  for (const value of [
    new Response('<html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('{', { headers: { 'Content-Type': 'application/json' } }),
  ]) {
    fetchMock.mock.mockImplementation(async () => value);
    await assert.rejects(fetchApi('https://example.test'), ApiProtocolError);
  }
  fetchMock.mock.mockImplementation(async () => Response.json({ value: 'ok' }));
  assert.deepEqual(await fetchApi('https://example.test'), { value: 'ok' });
});

test('cancellation stays cancellation before, during fetch, and while reading the body', async (t) => {
  const controller = new AbortController();
  const reason = new DOMException('Aborted', 'AbortError');
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    controller.abort(reason);
    throw reason;
  });
  await assert.rejects(
    fetchApi('https://example.test', { signal: controller.signal }),
    (error) => error === reason,
  );
  assert.equal(fetchMock.mock.callCount(), 1);
  await assert.rejects(
    fetchApi('https://example.test', { signal: controller.signal }),
    (error) => error === reason,
  );
  assert.equal(fetchMock.mock.callCount(), 1);
  const reading = new AbortController();
  fetchMock.mock.mockImplementation(async () => {
    const result = response();
    t.mock.method(result, 'json', async () => {
      reading.abort(reason);
      throw reason;
    });
    return result;
  });
  await assert.rejects(
    fetchApi('https://example.test', { signal: reading.signal }),
    (error) => error === reason,
  );
});
