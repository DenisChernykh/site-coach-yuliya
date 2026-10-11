import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiProblemError,
  ApiNetworkError,
  ApiProtocolError,
  type ProblemCode,
} from '../src/shared/api/client/api-errors';
import { getConsultationErrorMessage } from '../src/features/request-consultation/model/errors';
import { getJournalErrorMessage } from '../src/widgets/journal-list/model/errors';

function problem(code: ProblemCode, retryAfterMs: number | null = null) {
  return new ApiProblemError(
    {
      type: 'https://example.test/problems/error',
      title: 'Private title',
      detail: 'Private detail',
      instance: 'urn:request:request-1',
      status: 429,
      code,
      requestId: 'request-1',
    },
    retryAfterMs,
  );
}

test('consultation messages use server retry duration without a hardcoded cap or fallback', () => {
  assert.match(
    getConsultationErrorMessage(problem('RATE_LIMIT_EXCEEDED', 42_000)),
    /1 мин\./,
  );
  assert.match(
    getConsultationErrorMessage(problem('RATE_LIMIT_EXCEEDED', 61_000)),
    /2 мин\./,
  );
  assert.match(
    getConsultationErrorMessage(problem('RATE_LIMIT_EXCEEDED', 900_000)),
    /15 мин\./,
  );
  assert.match(
    getConsultationErrorMessage(problem('RATE_LIMIT_EXCEEDED')),
    /Подожди немного/,
  );
  assert.match(
    getConsultationErrorMessage(problem('RATE_LIMIT_EXCEEDED', 0)),
    /1 мин\./,
  );
  // A status alone is not a domain classification.
  assert.doesNotMatch(
    getConsultationErrorMessage(problem('INTERNAL_ERROR')),
    /Слишком много/,
  );
});

test('presentation distinguishes actionable failures without showing server text', () => {
  assert.match(
    getConsultationErrorMessage(problem('VALIDATION_FAILED')),
    /Проверь поля/,
  );
  assert.match(
    getConsultationErrorMessage(problem('DEPENDENCY_UNAVAILABLE')),
    /временно недоступен/,
  );
  for (const present of [getConsultationErrorMessage, getJournalErrorMessage]) {
    assert.match(present(new ApiNetworkError()), /соединение/);
    assert.match(present(new ApiProtocolError()), /некорректный ответ/);
    assert.match(present(problem('INTERNAL_ERROR')), /Код запроса: request-1/);
    assert.doesNotMatch(present(problem('INTERNAL_ERROR')), /Private/);
    assert.doesNotMatch(present(new Error('Private detail')), /Private/);
  }
});

test('query retries are limited to network failures and server problems', async () => {
  const { shouldRetryQuery } = await import('../src/app/providers/query-retry');
  assert.equal(shouldRetryQuery(0, new ApiNetworkError()), true);
  assert.equal(shouldRetryQuery(1, new ApiNetworkError()), false);
  assert.equal(shouldRetryQuery(0, new ApiProtocolError()), false);
  assert.equal(shouldRetryQuery(0, problem('RATE_LIMIT_EXCEEDED')), false);
  assert.equal(shouldRetryQuery(0, new Error('unknown')), false);
  const unavailable = problem('DEPENDENCY_UNAVAILABLE');
  unavailable.problem.status = 503;
  assert.equal(shouldRetryQuery(0, unavailable), true);
});
