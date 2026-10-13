import {
  TelegramAdapter,
  formatTelegramNotification,
} from '@/modules/coach-site/infrastructure/telegram.adapter'
import type { Consultation } from '@/modules/coach-site/domain/consultation'

const consultation: Consultation = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Анна <b>',
  contact: '@anna_example',
  message: 'Текст & вопросы',
  serviceId: 'coaching',
  serviceTitle: 'Коучинг',
  source: 'COACHING_CONTACT',
  consentAt: new Date('2026-10-11T00:00:00Z'),
  consentVersion: '2026-10-11',
  status: 'NEW',
  adminNote: '',
  createdAt: new Date('2026-10-11T00:00:00Z'),
  updatedAt: new Date(),
  delivery: null,
}
const config = {
  enabled: true,
  botToken: '1234:example-test-token',
  chatId: '-1001234',
}

describe('Telegram delivery boundary', () => {
  it('sends plain text with the contact and program snapshot, and acknowledges only a confirmed message', async () => {
    const fetcher = jest.fn(
      (...arguments_: Parameters<typeof fetch>): Promise<Response> => {
        void arguments_
        return Promise.resolve(
          Response.json({ ok: true, result: { message_id: 42 } }),
        )
      },
    )
    expect(
      await new TelegramAdapter(config, fetcher).send(
        consultation,
        new AbortController().signal,
      ),
    ).toEqual({ messageId: '42' })
    const request = JSON.parse(
      fetcher.mock.calls[0]![1]!.body as string,
    ) as Record<string, unknown>
    expect(request).not.toHaveProperty('parse_mode')
    expect(request['text']).toContain('Анна <b>')
    expect(request['text']).toContain('Коучинг')
    expect(request['text']).toContain('@anna_example')
    expect(request['text']).toContain('Источник: Коучинг → форма заявки')
  })

  it.each([
    ['HOME_CONTACT', 'Главная → форма знакомства'],
    ['COACHING_CONTACT', 'Коучинг → форма заявки'],
    ['CONTACTS_CONTACT', 'Контакты → форма связи'],
    [null, 'Неизвестен'],
  ] as const)(
    'identifies the form separately from the program: %s',
    (source, label) => {
      const text = formatTelegramNotification({ ...consultation, source })
      expect(text).toContain(`Источник: ${label}`)
      expect(text).toContain('Программа: Коучинг')
    },
  )

  it('honors Telegram retry_after and never returns provider details or secrets', async () => {
    const fetcher = (): Promise<Response> =>
      Promise.resolve(
        Response.json(
          {
            error_code: 429,
            description: config.botToken,
            parameters: { retry_after: 37 },
          },
          { status: 429 },
        ),
      )
    expect(
      await new TelegramAdapter(config, fetcher).send(
        consultation,
        new AbortController().signal,
      ),
    ).toEqual({
      errorCode: 'TELEGRAM_HTTP_429',
      permanent: false,
      retryAfterMs: 37000,
    })
  })

  it('does not repeatedly retry a blocked bot or invalid chat', async () => {
    const fetcher = (): Promise<Response> =>
      Promise.resolve(
        Response.json({ ok: false, error_code: 403 }, { status: 403 }),
      )
    expect(
      await new TelegramAdapter(config, fetcher).send(
        consultation,
        new AbortController().signal,
      ),
    ).toMatchObject({ permanent: true, errorCode: 'TELEGRAM_HTTP_403' })
  })
})
