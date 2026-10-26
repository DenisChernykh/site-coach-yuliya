import type { CmsPageContent } from '@/modules/coach-site/domain/cms'
import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import {
  initialPages,
  validPages,
  currentPageLayouts,
  currentSiteSettings,
} from '@/modules/coach-site/domain/cms'
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
  it('upgrades stored layouts without changing other section order or visibility', () => {
    const pages = initialPages()
    const home = pages.find((page) => page.key === 'home')!
    home.blocks = home.blocks.filter(
      (block) => !['group', 'practices'].includes(block.id),
    )
    home.blocks.splice(
      2,
      0,
      { id: 'products', enabled: false },
      { id: 'approach', enabled: true },
      { id: 'boundaries', enabled: false },
    )
    home.blocks.find((block) => block.id === 'stories')!.title =
      'Подробнее о работе'
    const about = pages.find((page) => page.key === 'about')!
    about.blocks.push(
      { id: 'approach', enabled: true },
      { id: 'boundaries', enabled: true },
    )
    const upgraded = currentPageLayouts(pages)
    expect(upgraded[0]!.blocks.slice(1, 4)).toEqual([
      { id: 'stories', enabled: true, title: 'Подробнее о работе' },
      { id: 'group', enabled: false },
      { id: 'practices', enabled: false },
    ])
    expect(validPages(upgraded)).toBe(true)
    expect(currentPageLayouts(upgraded)).toEqual(upgraded)
    expect(upgraded.find((page) => page.key === 'coaching')).toEqual(
      pages.find((page) => page.key === 'coaching'),
    )
  })
  it('removes only navigation to retired approach sections', () => {
    const site = {
      ...initial.settings,
      navigation: [
        { label: 'Старый подход', href: '/#approach' },
        { label: 'Подход', href: '/about/#approach' },
        { label: 'Документы', href: '/about/#education' },
        { label: 'Моя ссылка', href: 'https://example.com/#approach' },
      ],
    }
    expect(currentSiteSettings(site).navigation).toEqual(
      site.navigation.slice(2),
    )
    expect(site.navigation).toHaveLength(4)
  })
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
