import {
  ApiNetworkError,
  ApiProtocolError,
  createApiError,
  type ApiClientError,
  type ProblemDocumentLike,
} from './api-errors';

export type ErrorType<T> = ApiClientError<T & ProblemDocumentLike>;
export type BodyType<T> = T;

export const isMockMode = import.meta.env?.PUBLIC_DATA_SOURCE !== 'api';

export async function fetchApi<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  options?.signal?.throwIfAborted();
  const headers = new Headers(options?.headers);
  headers.set('Accept', 'application/json, application/problem+json');
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error) {
    options?.signal?.throwIfAborted();
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiNetworkError();
  }
  options?.signal?.throwIfAborted();
  if (!response.ok) {
    const error = await createApiError(response);
    options?.signal?.throwIfAborted();
    throw error;
  }
  const contentType = response.headers
    .get('Content-Type')
    ?.split(';', 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== 'application/json') throw new ApiProtocolError();
  try {
    return (await response.json()) as T;
  } catch {
    options?.signal?.throwIfAborted();
    throw new ApiProtocolError();
  }
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
  if (!baseUrl) throw new ApiProtocolError();
  return fetchApi<T>(baseUrl + path, options);
}
