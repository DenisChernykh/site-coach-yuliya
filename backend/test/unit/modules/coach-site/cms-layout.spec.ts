import type { CmsPageContent } from '@/modules/coach-site/domain/cms'
import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { initialPages, validPages } from '@/modules/coach-site/domain/cms'
import { CmsPageContentDto } from '@/modules/coach-site/presentation/cms.dto'
import { readFileSync } from 'node:fs'

const initial = JSON.parse(
  readFileSync('content/initial.json', 'utf8'),
) as Omit<CmsPageContent, 'site' | 'pages'> & {
  settings: CmsPageContent['site']
}
const content = (): CmsPageContent => ({
  site: initial.settings,
  contacts: initial.contacts,
  home: initial.home,
  faq: initial.faq,
  socials: initial.socials,
  pages: initialPages(),
})
describe('CMS layout boundaries', () => {
  it('preserves every existing section and allows reorder and hiding', () => {
    const pages = initialPages()
    const block = pages[0]!.blocks.splice(2, 1)[0]!
    block.enabled = false
    pages[0]!.blocks.splice(1, 0, block)
    expect(validPages(pages)).toBe(true)
  })
  it.each(['missing', 'duplicate', 'unknown', 'hero-hidden', 'hero-moved'])(
    'rejects a broken layout: %s',
    (kind) => {
      const pages = initialPages(),
        blocks = pages[0]!.blocks
      if (kind === 'missing') blocks.pop()
      if (kind === 'duplicate') blocks[1] = { ...blocks[0]! }
      if (kind === 'unknown') blocks[1]!.id = 'arbitrary-html'
      if (kind === 'hero-hidden') blocks[0]!.enabled = false
      if (kind === 'hero-moved') blocks.reverse()
      expect(validPages(pages)).toBe(false)
    },
  )
  it('validates nested content and rejects unsupported properties', async () => {
    const input = content()
    expect(
      await validate(plainToInstance(CmsPageContentDto, input), {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).toHaveLength(0)
    expect(
      await validate(
        plainToInstance(CmsPageContentDto, {
          ...input,
          pages: [{ key: 'home', blocks: null }],
        }),
        { whitelist: true, forbidNonWhitelisted: true },
      ),
    ).not.toHaveLength(0)
    expect(
      await validate(
        plainToInstance(CmsPageContentDto, {
          ...input,
          html: '<script>oops</script>',
        }),
        { whitelist: true, forbidNonWhitelisted: true },
      ),
    ).not.toHaveLength(0)
  })
})
