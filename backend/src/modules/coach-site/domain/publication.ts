export interface SitePublication {
  readonly requestedRevision: number
  readonly deployedRevision: number
  readonly activeRevision: number | null
  readonly status: 'IDLE' | 'PENDING' | 'DISPATCHING' | 'BUILDING' | 'FAILED'
  readonly requestedAt: Date | null
  readonly dispatchedAt: Date | null
  readonly attempts: number
  readonly nextAttemptAt: Date
  readonly workflowRunId: string | null
  readonly lastErrorCode: string | null
}

export interface PublicationClaim {
  readonly revision: number
  readonly claimToken: string
}
