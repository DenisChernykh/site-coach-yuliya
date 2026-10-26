import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { readFileSync } from 'node:fs'
import { HomePageDto } from '@/modules/coach-site/presentation/content.dto'
import { WriteArticleDto } from '@/modules/coach-site/presentation/admin.dto'
import { SeoSettingsDto } from '@/modules/coach-site/presentation/seo.dto'

const initial = JSON.parse(readFileSync('content/initial.json', 'utf8')) as {
  home: HomePageDto
  articles: WriteArticleDto['content'][]
  seo: SeoSettingsDto
}
const options = { whitelist: true, forbidNonWhitelisted: true }
const uploaded = '/v1/story-media/a7b563f2-661d-4c18-a842-82b1c3707530'

async function imageErrors(image: string): Promise<number[]> {
  const home = structuredClone(initial.home)
  Object.assign(home.education![0]!, { image })
  Object.assign(home.caseStudies[0]!, { reviewImage: image })
  const seo = structuredClone(initial.seo)
  Object.assign(seo, { defaultImage: image })
  Object.assign(seo.pages.home, { ogImage: image })
  return Promise.all([
    validate(plainToInstance(HomePageDto, home), options),
    validate(plainToInstance(SeoSettingsDto, seo), options),
    validate(
      plainToInstance(WriteArticleDto, {
        content: { ...initial.articles[0], coverImage: image },
        published: false,
        sortOrder: 0,
      }),
      options,
    ),
  ]).then((groups) => groups.map((errors) => errors.length))
}

describe('local images in editable content', () => {
  it.each([
    'https://images.example.org/photo.jpg',
    'http://images.example.org/photo.jpg',
    '//images.example.org/photo.jpg',
    '/\\images.example.org/photo.jpg',
    '/images/\\photo.jpg',
    'data:image/png;base64,AAAA',
    'javascript:alert(1)',
    'https://coach.example.org/images/photo.jpg',
  ])(
    'rejects external or nonlocal image references in every content DTO: %s',
    async (image) => {
      expect((await imageErrors(image)).every((count) => count > 0)).toBe(true)
    },
  )

  it.each([uploaded, '/images/education/diploma.jpg', '/og/coach-yuliya.jpg'])(
    'preserves uploads and existing local assets: %s',
    async (image) => {
      expect(await imageErrors(image)).toEqual([0, 0, 0])
    },
  )

  it('allows clearing optional images and keeping ordinary external navigation links', async () => {
    const home = structuredClone(initial.home)
    Object.assign(home.education![0]!, { image: '' })
    Object.assign(home.caseStudies[0]!, { reviewImage: '' })
    const seo = structuredClone(initial.seo)
    Object.assign(seo.pages.home, { ogImage: '' })
    Object.assign(seo, { siteUrl: 'https://coach.example.org' })
    expect(
      await validate(plainToInstance(HomePageDto, home), options),
    ).toHaveLength(0)
    expect(
      await validate(plainToInstance(SeoSettingsDto, seo), options),
    ).toHaveLength(0)
    expect((await imageErrors(''))[1]).toBeGreaterThan(0)
  })
})
