import type { CoachSiteRuntimeConfig } from '@/platform/config/coach-site.config'
import type { Consultation } from '../domain/consultation'
import type {
  TelegramSenderPort,
  TelegramSendResult,
} from '../application/consultations.port'

export function formatTelegramNotification(consultation: Consultation): string {
  return [
    'Новая заявка на сайте Юлии Валишиной',
    `Номер: ${consultation.id}`,
    `Имя: ${consultation.name}`,
    `Контакт: ${consultation.contact}`,
    `Программа: ${consultation.serviceTitle ?? 'Знакомство'}`,
    `Сообщение: ${consultation.message || 'Не указано'}`,
    `Дата: ${consultation.createdAt.toISOString()}`,
    `Согласие получено: ${consultation.consentAt.toISOString()}`,
  ]
    .join('\n')
    .slice(0, 4096)
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function readResponse(response: Response): Promise<unknown> {
  if (response.body === null) return undefined
  const reader = (response.body as ReadableStream<Uint8Array>).getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      length += chunk.value.byteLength
      if (length > 16384) {
        await reader.cancel()
        return undefined
      }
      chunks.push(chunk.value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    return undefined
  } finally {
    reader.releaseLock()
  }
}

export class TelegramAdapter implements TelegramSenderPort {
  public constructor(
    private readonly config: CoachSiteRuntimeConfig['telegram'],
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  public async send(
    consultation: Consultation,
    signal: AbortSignal,
  ): Promise<TelegramSendResult> {
    try {
      const response = await this.fetcher(
        `https://api.telegram.org/bot${this.config.botToken}/sendMessage`,
        {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.chatId,
            text: formatTelegramNotification(consultation),
            link_preview_options: { is_disabled: true },
          }),
        },
      )
      const body = await readResponse(response)
      if (
        response.ok &&
        record(body) &&
        body['ok'] === true &&
        record(body['result']) &&
        typeof body['result']['message_id'] === 'number'
      )
        return { messageId: String(body['result']['message_id']) }
      const code =
        record(body) && typeof body['error_code'] === 'number'
          ? body['error_code']
          : response.status
      const parameters =
        record(body) && record(body['parameters'])
          ? body['parameters']
          : undefined
      const retry = parameters?.['retry_after']
      return {
        errorCode: `TELEGRAM_HTTP_${code}`,
        permanent: [400, 401, 403, 404].includes(code),
        retryAfterMs:
          typeof retry === 'number' && Number.isFinite(retry)
            ? Math.max(0, Math.min(retry, 86400)) * 1000
            : 0,
      }
    } catch {
      return {
        errorCode: signal.aborted
          ? 'TELEGRAM_SHUTDOWN'
          : 'TELEGRAM_UNAVAILABLE',
        permanent: false,
        retryAfterMs: 5000,
      }
    }
  }
}
