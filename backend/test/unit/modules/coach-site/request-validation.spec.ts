import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
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
  ])(
    'rejects invalid consultation fields without persisting them',
    async (input) => {
      expect(
        await validate(plainToInstance(ConsultationRequestDto, input), options),
      ).not.toHaveLength(0)
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
