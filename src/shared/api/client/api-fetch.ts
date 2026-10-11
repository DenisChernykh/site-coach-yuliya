export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ErrorType<T> = ApiError & { payload?: T };
export type BodyType<T> = T;

export const isMockMode = import.meta.env?.PUBLIC_DATA_SOURCE !== 'api';

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
    throw new ApiError(
      'REQUEST_FAILED',
      'Не удалось выполнить запрос. Попробуй ещё раз.',
      response.status,
    );
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
