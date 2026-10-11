export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ErrorType<T> = ApiError & { payload?: T };
export type BodyType<T> = T;

export const isMockMode = import.meta.env?.PUBLIC_DATA_SOURCE !== 'api';

export function createApiError(response: Response): ApiError {
  const retryAfter = response.headers.get('Retry-After');
  const seconds =
    retryAfter !== null && /^\d+$/.test(retryAfter)
      ? Number(retryAfter)
      : undefined;
  return new ApiError(
    'REQUEST_FAILED',
    'Не удалось выполнить запрос. Попробуй ещё раз.',
    response.status,
    seconds !== undefined && Number.isSafeInteger(seconds) && seconds > 0
      ? seconds
      : undefined,
  );
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  options?.signal?.throwIfAborted();
  if (isMockMode) {
    const { handleMockRequest } = await import('../mocks/handler');
    return handleMockRequest<T>(path, options);
  }

  const baseUrl = import.meta.env.PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    throw new ApiError(
      'API_NOT_CONFIGURED',
      'Не задан PUBLIC_API_BASE_URL.',
      0,
    );
  }
  const headers = new Headers(options?.headers);
  headers.set('Accept', 'application/json');
  const response = await fetch(baseUrl + path, { ...options, headers });
  if (!response.ok) {
    throw createApiError(response);
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new ApiError(
      'INVALID_RESPONSE',
      'Сервер вернул ответ в неожиданном формате.',
      response.status,
    );
  }
  return response.json() as Promise<T>;
}
