import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { readFileSync } from 'node:fs'
import { SeoSettingsDto } from '@/modules/coach-site/presentation/seo.dto'
import {
  ConsultationRequestDto,
  ServiceDto,
} from '@/modules/coach-site/presentation/content.dto'
import {
  WriteArticleDto,
  ConsultationQueryDto,
} from '@/modules/coach-site/presentation/admin.dto'

const options = {
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
}
const valid = {
  name: 'Анна',
  contact: '@anna_example',
  message: '',
  consent: true,
}

describe('site HTTP input validation', () => {
  const initial = JSON.parse(readFileSync('content/initial.json', 'utf8')) as {
    seo: object
  }
  it.each([null, 'https://coach.example.com', 'https://coach.example.com/'])(
    'accepts SEO with an optional HTTPS site origin: %s',
    async (siteUrl) => {
      expect(
        await validate(
          plainToInstance(SeoSettingsDto, { ...initial.seo, siteUrl }),
          options,
        ),
      ).toHaveLength(0)
    },
  )
  it.each([
    { siteUrl: 'http://coach.example.com' },
    { siteUrl: 'https://coach.example.com/path' },
    { siteUrl: 'https://user:password@coach.example.com' },
    { siteUrl: 'https://coach.example.com?track=1' },
    { siteUrl: '' },
    { allowIndexing: 'true' },
    { pages: {} },
    { defaultImage: '//untrusted.example.com/image.png' },
    { defaultImage: 'javascript:alert(1)' },
    { defaultImageAlt: 'x'.repeat(301) },
  ])(
    'rejects invalid SEO origins, images, and incomplete nested pages',
    async (fields) => {
      expect(
        await validate(
          plainToInstance(SeoSettingsDto, { ...initial.seo, ...fields }),
          options,
        ),
      ).not.toHaveLength(0)
    },
  )
  it.each(['', 'has spaces', '../outside', 'two/slashes', 'UPPERCASE'])(
    'rejects a program ID that cannot be addressed by admin routes: %s',
    async (id) => {
      const input = plainToInstance(ServiceDto, {
        id,
        title: 'Программа',
        description: '',
        eyebrow: '',
        price: 0,
        priceNote: '',
        features: [],
      })
      expect(await validate(input, options)).not.toHaveLength(0)
    },
  )

  it.each([
    { ...valid, consent: false },
    { ...valid, message: null },
    { ...valid, serviceId: null },
    { ...valid, contact: ' ' },
    { ...valid, name: 'x' },
    { ...valid, message: 'x'.repeat(2001) },
    { ...valid, adminNote: 'Injected' },
    { ...valid, website: null },
    { ...valid, website: 42 },
    { ...valid, website: 'x'.repeat(2001) },
    { ...valid, source: null },
    { ...valid, source: 'UNKNOWN' },
    { ...valid, source: 'https://example.com/contacts/' },
    { ...valid, source: 42 },
  ])(
    'rejects invalid consultation fields without persisting them',
    async (input) => {
      expect(
        await validate(plainToInstance(ConsultationRequestDto, input), options),
      ).not.toHaveLength(0)
    },
  )

  it.each(['', 'https://spam.example'])(
    'accepts the trap field for server-side screening: %s',
    async (website) => {
      expect(
        await validate(
          plainToInstance(ConsultationRequestDto, { ...valid, website }),
          options,
        ),
      ).toHaveLength(0)
    },
  )

  it('trims contacts and accepts an optional message and program', async () => {
    const input = plainToInstance(ConsultationRequestDto, {
      name: '  Анна  ',
      contact: ' @anna_example ',
      consent: true,
    })
    expect(await validate(input, options)).toHaveLength(0)
    expect(input).toMatchObject({ name: 'Анна', contact: '@anna_example' })
  })

  it.each(['HOME_CONTACT', 'COACHING_CONTACT', 'CONTACTS_CONTACT'])(
    'accepts a known consultation form: %s',
    async (source) => {
      expect(
        await validate(
          plainToInstance(ConsultationRequestDto, { ...valid, source }),
          options,
        ),
      ).toHaveLength(0)
    },
  )

  it('requires nested article content even when other fields are valid', async () => {
    expect(
      await validate(
        plainToInstance(WriteArticleDto, { published: true, sortOrder: 0 }),
        options,
      ),
    ).not.toHaveLength(0)
  })

  it.each([
    { limit: '101' },
    { page: '0' },
    { status: 'SENT' },
    { page: '1e3' },
    { search: null },
  ])('bounds pagination and rejects malformed filter values', async (input) => {
    expect(
      await validate(plainToInstance(ConsultationQueryDto, input), options),
    ).not.toHaveLength(0)
  })
})
