import {
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
} from '@/shared/api';

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 1 || error instanceof ApiProtocolError) return false;
  if (error instanceof ApiNetworkError) return true;
  return error instanceof ApiProblemError && error.status >= 500;
}
