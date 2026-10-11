import type {
  ConsultationRequestDto,
  ConsultationResultDto,
} from '../domain/content'
import type {
  ConsultationsPort,
  ConsultationRateLimitPort,
  TelegramSenderPort,
} from './consultations.port'
import type { SiteContentPort } from './content.port'
import { InvalidProgramError } from './site-errors'

export class ConsultationsService {
  public constructor(
    public readonly requests: ConsultationsPort,
    private readonly content: SiteContentPort,
    private readonly limiter: ConsultationRateLimitPort,
  ) {}

  public async submit(
    input: ConsultationRequestDto,
    ip: string,
  ): Promise<ConsultationResultDto> {
    await this.limiter.consume(ip)
    let title: string | null = null
    if (input.serviceId !== undefined) {
      const program = await this.content.findPublishedProgram(input.serviceId)
      if (program === undefined) throw new InvalidProgramError()
      title = program.title
    }
    await this.requests.create(input, title)
    return {
      status: 'accepted',
      message: 'Заявка сохранена. Юля свяжется с тобой по указанному контакту.',
    }
  }
}

export class DeliverTelegramNotifications {
  public constructor(
    private readonly requests: ConsultationsPort,
    private readonly sender: TelegramSenderPort,
  ) {}

  public async runOnce(signal: AbortSignal): Promise<void> {
    for (let count = 0; count < 10 && !signal.aborted; count++) {
      const claim = await this.requests.claimDelivery(new Date())
      if (claim === undefined) return
      const outcome = await this.sender.send(claim.consultation, signal)
      await this.requests.finishDelivery(claim, outcome)
    }
  }
}
