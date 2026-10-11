import type {
  ProblemResponseDto,
  ProblemFieldErrorResponseDto,
} from '../generated/model';
import { ProblemResponseDtoCode } from '../generated/model/problemResponseDtoCode';

export type ProblemCode = ProblemResponseDto['code'];
export type ProblemDocumentLike = ProblemResponseDto & {
  errors?: ProblemFieldErrorResponseDto[];
};

export class ApiProblemError<
  TProblem extends ProblemDocumentLike = ProblemDocumentLike,
> extends Error {
  public readonly name = 'ApiProblemError';

  constructor(
    public readonly problem: TProblem,
    public readonly retryAfterMs: number | null,
  ) {
    super(problem.title);
  }

  get code() {
    return this.problem.code;
  }
  get status() {
    return this.problem.status;
  }
  get requestId() {
    return this.problem.requestId;
  }
}

export class ApiNetworkError extends Error {
  public readonly name = 'ApiNetworkError';
  constructor() {
    super('The API could not be reached');
  }
}

export class ApiProtocolError extends Error {
  public readonly name = 'ApiProtocolError';
  constructor() {
    super('The API returned an invalid response');
  }
}

export type ApiClientError<
  TProblem extends ProblemDocumentLike = ProblemDocumentLike,
> = ApiProblemError<TProblem> | ApiNetworkError | ApiProtocolError;

const problemCodes = new Set<string>(Object.values(ProblemResponseDtoCode));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isProblemDocument(value: unknown): value is ProblemDocumentLike {
  if (!isRecord(value)) return false;
  if (
    !['type', 'title', 'detail', 'instance', 'requestId'].every(
      (field) => typeof value[field] === 'string',
    ) ||
    typeof value.code !== 'string' ||
    !problemCodes.has(value.code) ||
    typeof value.status !== 'number' ||
    !Number.isInteger(value.status) ||
    value.status < 400 ||
    value.status > 599
  )
    return false;
  return (
    value.errors === undefined ||
    (Array.isArray(value.errors) &&
      value.errors.every(
        (error) =>
          isRecord(error) &&
          ['pointer', 'code', 'detail'].every(
            (field) => typeof error[field] === 'string',
          ),
      ))
  );
}

function parseRetryAfter(value: string | null, now: number): number | null {
  if (value === null) return null;
  const retryAfter = value.trim();
  if (/^\d+$/u.test(retryAfter)) {
    const milliseconds = Number(retryAfter) * 1_000;
    return Number.isSafeInteger(milliseconds) ? milliseconds : null;
  }
  // Numeric values with a sign or fraction must not be interpreted as dates.
  if (!/^[A-Za-z]/u.test(retryAfter)) return null;
  const retryAt = Date.parse(retryAfter);
  return Number.isNaN(retryAt) || retryAt <= now ? null : retryAt - now;
}

export async function createApiError(
  response: Response,
  now = Date.now(),
): Promise<ApiProblemError | ApiProtocolError> {
  const contentType = response.headers
    .get('Content-Type')
    ?.split(';', 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== 'application/problem+json') return new ApiProtocolError();
  let problem: unknown;
  try {
    problem = await response.json();
  } catch {
    return new ApiProtocolError();
  }
  if (!isProblemDocument(problem) || problem.status !== response.status) {
    return new ApiProtocolError();
  }
  return new ApiProblemError(
    problem,
    parseRetryAfter(response.headers.get('Retry-After'), now),
  );
}

export function isProblemCode<TCode extends ProblemCode>(
  error: unknown,
  code: TCode,
): error is ApiProblemError<ProblemDocumentLike & { code: TCode }> {
  return error instanceof ApiProblemError && error.code === code;
}
