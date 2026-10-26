import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { StoryMediaService } from '@/modules/coach-site/application/story-media.service'
import { InvalidStoryMediaError } from '@/modules/coach-site/application/site-errors'
import { mediaRange } from '@/modules/coach-site/domain/media-range'
import {
  visibleStories,
  type StoryGroup,
} from '@/modules/coach-site/domain/stories'
import { withStoriesBlock, initialPages } from '@/modules/coach-site/domain/cms'
import { StoryGroupDto } from '@/modules/coach-site/presentation/stories.dto'

const id = 'b66d592e-b32e-4ea0-9876-74cacd4f5a25'
const group = (): StoryGroup => ({
  id,
  title: 'Знакомство',
  enabled: true,
  coverMediaId: id,
  slides: [
    {
      id,
      mediaId: id,
      type: 'image',
      caption: '',
      durationSeconds: 5,
      linkLabel: '',
      linkUrl: '',
      enabled: true,
    },
  ],
})

describe('stories publication and validation', () => {
  it('excludes hidden groups, hidden slides and empty groups without changing draft order', () => {
    const first = group(),
      second = { ...group(), id: 'second' },
      empty = { ...group(), slides: [] }
    first.slides.push({ ...first.slides[0]!, id: 'hidden', enabled: false })
    second.enabled = false
    const visible = visibleStories([second, first, empty])
    expect(visible).toEqual([{ ...first, slides: [first.slides[0]] }])
    expect(first.slides).toHaveLength(2)
  })
  it('adds the new section to legacy layouts once, preserving existing order and visibility', () => {
    const pages = initialPages()
    pages[0]!.blocks = pages[0]!.blocks.filter(
      (block) => block.id !== 'stories',
    )
    pages[0]!.blocks[1]!.enabled = false
    const next = withStoriesBlock(pages)
    expect(next[0]!.blocks[1]).toEqual({ id: 'stories', enabled: true })
    expect(next[0]!.blocks.filter((block) => block.id !== 'stories')).toEqual(
      pages[0]!.blocks,
    )
    expect(withStoriesBlock(next)).toEqual(next)
  })
  it('rejects script links, duplicate slide IDs and unsafe durations', async () => {
    const input = group()
    expect(await validate(plainToInstance(StoryGroupDto, input))).toHaveLength(
      0,
    )
    input.slides[0]!.linkUrl = 'javascript:alert(1)'
    input.slides[0]!.durationSeconds = 0
    input.slides.push({ ...input.slides[0]! })
    expect(
      await validate(plainToInstance(StoryGroupDto, input)),
    ).not.toHaveLength(0)
  })
})

describe('media upload boundaries', () => {
  const media = {
    create: jest.fn(() =>
      Promise.resolve({ id, mimeType: 'image/png', size: 8 }),
    ),
    find: jest.fn(() =>
      Promise.resolve({ id, mimeType: 'image/png', size: 8 }),
    ),
    read: jest.fn(() => Promise.resolve(new Uint8Array())),
  }
  const service = new StoryMediaService(media, {
    optimize: jest.fn(() =>
      Promise.reject(new Error('Unexpected optimization')),
    ),
  })
  it('checks actual bytes and canonical base64 before persistence', async () => {
    await expect(
      service.upload({
        name: 'fake.png',
        mimeType: 'image/png',
        base64: Buffer.from('<svg onload="alert(1)">').toString('base64'),
      }),
    ).rejects.toBeInstanceOf(InvalidStoryMediaError)
    const base64 = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString(
      'base64',
    )
    await expect(
      service.upload({ name: 'photo.png', mimeType: 'image/png', base64 }),
    ).resolves.toMatchObject({ type: 'image' })
    await expect(
      service.upload({
        name: 'photo.png',
        mimeType: 'image/png',
        base64: base64 + ' ',
      }),
    ).rejects.toBeInstanceOf(InvalidStoryMediaError)
  })
  it('rejects oversized files and mismatched media references', async () => {
    await expect(
      service.upload({
        name: 'large.png',
        mimeType: 'image/png',
        base64: Buffer.alloc(8 * 1024 * 1024 + 1).toString('base64'),
      }),
    ).rejects.toBeInstanceOf(InvalidStoryMediaError)
    const stories = [group()]
    stories[0]!.slides[0]!.type = 'video'
    await expect(service.validateStories(stories)).rejects.toBeInstanceOf(
      InvalidStoryMediaError,
    )
  })
})

describe('video byte ranges', () => {
  it.each([
    ['bytes=0-9', { start: 0, end: 9 }],
    ['bytes=90-', { start: 90, end: 99 }],
    ['bytes=-10', { start: 90, end: 99 }],
    ['bytes=-200', { start: 0, end: 99 }],
    ['bytes=0-200', { start: 0, end: 99 }],
    ['bytes=100-', 'invalid'],
    ['bytes=9-1', 'invalid'],
    ['bytes=-0', 'invalid'],
    ['bytes=0-1,4-5', 'invalid'],
    ['bytes=9007199254740992-', 'invalid'],
  ])('handles %s', (header, expected) => {
    expect(mediaRange(header, 100)).toEqual(expected)
  })
})
