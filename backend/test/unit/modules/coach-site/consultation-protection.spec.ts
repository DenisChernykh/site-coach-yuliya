import { ConsultationsService } from '@/modules/coach-site/application/consultations.service'
import type { SiteContentPort } from '@/modules/coach-site/application/content.port'
import type {
  ConsultationsPort,
  ConsultationRateLimitPort,
} from '@/modules/coach-site/application/consultations.port'
import { ConsultationRateLimitError } from '@/modules/coach-site/application/site-errors'
import { COACH_SITE_HTTP_PROBLEMS } from '@/modules/coach-site/composition/coach-site-problems'

const valid = { name: 'Анна', contact: '@anna_example', consent: true as const }

describe('consultation spam protection', () => {
  const create = jest.fn<
    ReturnType<ConsultationsPort['create']>,
    Parameters<ConsultationsPort['create']>
  >()
  const findPublishedProgram = jest.fn<
    ReturnType<SiteContentPort['findPublishedProgram']>,
    Parameters<SiteContentPort['findPublishedProgram']>
  >()
  const consume = jest.fn<
    ReturnType<ConsultationRateLimitPort['consume']>,
    Parameters<ConsultationRateLimitPort['consume']>
  >()
  const service = new ConsultationsService(
    { create } as unknown as ConsultationsPort,
    { findPublishedProgram } as unknown as SiteContentPort,
    { consume },
  )

  beforeEach(() => {
    jest.resetAllMocks()
    consume.mockResolvedValue(undefined)
  })

  it('silently discards a filled trap before program lookup and persistence', async () => {
    const result = await service.submit(
      { ...valid, website: 'https://spam.example', serviceId: 'unknown' },
      '203.0.113.1',
    )
    expect(result.status).toBe('accepted')
    expect(consume).toHaveBeenCalledWith('203.0.113.1')
    expect(findPublishedProgram).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it.each([undefined, '', '   '])(
    'accepts a legitimate empty trap: %s',
    async (website) => {
      await service.submit(
        { ...valid, ...(website === undefined ? {} : { website }) },
        '203.0.113.1',
      )
      expect(create).toHaveBeenCalledTimes(1)
    },
  )

  it('also limits submissions with a filled trap', async () => {
    const error = new ConsultationRateLimitError(1001)
    consume.mockRejectedValue(error)
    await expect(
      service.submit({ ...valid, website: 'spam' }, '203.0.113.1'),
    ).rejects.toBe(error)
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    [0, 1],
    [1001, 2],
    [600000, 600],
  ])('projects remaining wait %s ms as %s seconds', (milliseconds, seconds) => {
    expect(
      COACH_SITE_HTTP_PROBLEMS.map(
        new ConsultationRateLimitError(milliseconds),
      ),
    ).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: seconds,
    })
  })
})
