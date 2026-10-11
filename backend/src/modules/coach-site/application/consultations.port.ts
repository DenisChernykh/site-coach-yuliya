import type {
  ClaimedDelivery,
  Consultation,
  ConsultationPage,
  ConsultationStatus,
} from '../domain/consultation'
import type { ConsultationRequestDto } from '../domain/content'

export interface ConsultationFilters {
  readonly page: number
  readonly limit: number
  readonly status?: ConsultationStatus
  readonly search?: string
}

export interface ConsultationsPort {
  create(
    input: ConsultationRequestDto,
    serviceTitle: string | null,
  ): Promise<Consultation>
  list(filters: ConsultationFilters): Promise<ConsultationPage>
  find(id: string): Promise<Consultation | undefined>
  update(
    id: string,
    patch: {
      readonly status?: ConsultationStatus
      readonly adminNote?: string
    },
  ): Promise<Consultation>
  retryDelivery(id: string): Promise<void>
  claimDelivery(now: Date): Promise<ClaimedDelivery | undefined>
  finishDelivery(
    claim: ClaimedDelivery,
    outcome:
      | { readonly messageId: string }
      | {
          readonly errorCode: string
          readonly permanent: boolean
          readonly retryAfterMs: number
        },
  ): Promise<void>
}

export interface ConsultationRateLimitPort {
  consume(ip: string): Promise<void>
}

export type TelegramSendResult =
  | { readonly messageId: string }
  | {
      readonly errorCode: string
      readonly permanent: boolean
      readonly retryAfterMs: number
    }

export interface TelegramSenderPort {
  send(
    consultation: Consultation,
    signal: AbortSignal,
  ): Promise<TelegramSendResult>
}
