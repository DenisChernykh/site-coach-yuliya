import { INVALID_PROGRAM_PROBLEM } from '../presentation/site-problem.definitions'
import type {
  HttpProblemContribution,
  HttpProblemMapping,
} from '@/platform/http/errors/problem.contracts'
import {
  ConsultationRateLimitError,
  DeliveryRetryConflictError,
  InvalidProgramError,
  InvalidStoryMediaError,
  SiteContentConflictError,
  SiteRecordNotFoundError,
} from '../application/site-errors'

export const COACH_SITE_HTTP_PROBLEMS: HttpProblemContribution = Object.freeze({
  definitions: Object.freeze([INVALID_PROGRAM_PROBLEM]),
  map(error: unknown): HttpProblemMapping | undefined {
    if (error instanceof InvalidStoryMediaError)
      return {
        code: 'VALIDATION_FAILED',
        errors: [
          {
            pointer: '/home/stories',
            code: 'invalid_media',
            detail: 'Invalid media file or story reference.',
          },
        ],
      }
    if (error instanceof SiteRecordNotFoundError) return { code: 'NOT_FOUND' }
    if (
      error instanceof SiteContentConflictError ||
      error instanceof DeliveryRetryConflictError
    )
      return { code: 'CONFLICT' }
    if (error instanceof InvalidProgramError) return { code: 'INVALID_PROGRAM' }
    if (error instanceof ConsultationRateLimitError)
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: Math.max(1, Math.ceil(error.retryAfterMs / 1000)),
      }
    return undefined
  },
})
