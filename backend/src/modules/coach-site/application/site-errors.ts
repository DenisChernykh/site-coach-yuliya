export class SiteRecordNotFoundError extends Error {}
export class SiteContentConflictError extends Error {}
export class InvalidProgramError extends Error {}
export class ConsultationRateLimitError extends Error {
  public constructor(public readonly retryAfterMs: number) {
    super('Consultation rate limit exceeded')
  }
}
export class DeliveryRetryConflictError extends Error {}
