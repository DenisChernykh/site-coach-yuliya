export const consultationStatuses = [
  'NEW',
  'IN_PROGRESS',
  'COMPLETED',
  'ARCHIVED',
] as const
export type ConsultationStatus = (typeof consultationStatuses)[number]
export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED'

export interface Consultation {
  readonly id: string
  readonly name: string
  readonly contact: string
  readonly message: string
  readonly serviceId: string | null
  readonly serviceTitle: string | null
  readonly consentAt: Date
  readonly consentVersion: string
  readonly status: ConsultationStatus
  readonly adminNote: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly delivery: {
    readonly status: DeliveryStatus
    readonly attempts: number
    readonly nextAttemptAt: Date
    readonly sentAt: Date | null
    readonly lastErrorCode: string | null
  } | null
}

export interface ConsultationPage {
  readonly items: Consultation[]
  readonly total: number
  readonly page: number
  readonly limit: number
}

export interface ClaimedDelivery {
  readonly consultation: Consultation
  readonly claimToken: string
  readonly attempts: number
}
