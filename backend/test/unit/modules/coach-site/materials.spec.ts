import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { readFileSync } from 'node:fs'
import {
  initialPages,
  validPages,
  withEducationBlock,
} from '@/modules/coach-site/domain/cms'
import { HomePageDto } from '@/modules/coach-site/presentation/content.dto'

const initial = JSON.parse(readFileSync('content/initial.json', 'utf8')) as {
  home: HomePageDto
}

describe('education and case materials', () => {
  it('accepts new materials and legacy home content without optional additions', async () => {
    expect(
      await validate(plainToInstance(HomePageDto, initial.home), {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).toHaveLength(0)
    const legacy = { ...initial.home, education: undefined }
    legacy.caseStudies = legacy.caseStudies.map(
      ({ id, title, request, exploration, result, details }) => ({
        id,
        title,
        request,
        exploration,
        result,
        details,
      }),
    )
    expect(await validate(plainToInstance(HomePageDto, legacy))).toHaveLength(0)
  })
  it('rejects unsafe media links, invalid hours and duplicate education IDs', async () => {
    const home = structuredClone(initial.home)
    const education = home.education![0]!
    Object.assign(education, { image: 'javascript:alert(1)', hours: -1 })
    home.education!.push(education)
    Object.assign(home.caseStudies[0]!, {
      reviewImage: 'data:text/html,unsafe',
    })
    expect(await validate(plainToInstance(HomePageDto, home))).not.toHaveLength(
      0,
    )
  })
  it('adds education once without disturbing an existing layout or hidden sections', () => {
    const pages = initialPages()
    const about = pages.find((page) => page.key === 'about')!
    about.blocks = about.blocks.filter((block) => block.id !== 'education')
    about.blocks[1]!.enabled = false
    const upgraded = withEducationBlock(pages)
    expect(validPages(upgraded)).toBe(true)
    expect(
      upgraded
        .find((page) => page.key === 'about')!
        .blocks.filter((block) => block.id !== 'education'),
    ).toEqual(about.blocks)
    expect(withEducationBlock(upgraded)).toEqual(upgraded)
  })
})
