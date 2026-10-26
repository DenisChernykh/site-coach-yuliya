import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { crc32 } from 'node:zlib'
import sharp from 'sharp'
import { StoryMediaService } from '@/modules/coach-site/application/story-media.service'
import type { StoryMediaPort } from '@/modules/coach-site/application/story-media.port'
import { InvalidStoryMediaError } from '@/modules/coach-site/application/site-errors'
import { SharpArticleCoverOptimizer } from '@/modules/coach-site/infrastructure/sharp-article-cover-optimizer'
import { UploadStoryMediaDto } from '@/modules/coach-site/presentation/stories.dto'

const id = 'b66d592e-b32e-4ea0-9876-74cacd4f5a25'

function setup(): {
  media: jest.Mocked<StoryMediaPort>
  service: StoryMediaService
} {
  const media: jest.Mocked<StoryMediaPort> = {
    create: jest.fn(
      (input: { name: string; mimeType: string; data: Uint8Array }) =>
        Promise.resolve({
          id,
          mimeType: input.mimeType,
          size: input.data.length,
        }),
    ),
    find: jest.fn(),
    read: jest.fn(),
  }
  return {
    media,
    service: new StoryMediaService(media, new SharpArticleCoverOptimizer()),
  }
}

describe('article cover optimization', () => {
  it('stores WebP after applying EXIF orientation and shrinking the long edge without cropping', async () => {
    const { service, media } = setup()
    const source = await sharp({
      create: { width: 3840, height: 2160, channels: 3, background: '#527c9e' },
    })
      .withMetadata({ orientation: 6 })
      .jpeg({ quality: 96 })
      .toBuffer()
    const result = await service.upload({
      name: 'portrait.JPG',
      mimeType: 'image/jpeg',
      base64: source.toString('base64'),
      purpose: 'article-cover',
    })
    const stored = media.create.mock.calls[0]![0]
    const metadata = await sharp(stored.data).metadata()
    expect(stored).toMatchObject({
      name: 'portrait.webp',
      mimeType: 'image/webp',
    })
    expect(metadata).toMatchObject({
      format: 'webp',
      width: 1440,
      height: 2560,
    })
    expect(metadata.orientation).toBeUndefined()
    expect(metadata.exif).toBeUndefined()
    expect(result).toEqual({
      id,
      type: 'image',
      mimeType: 'image/webp',
      size: stored.data.length,
    })
    expect(stored.data.length).toBeLessThan(source.length)
  })

  it('does not enlarge small PNGs and preserves transparent pixels', async () => {
    const { service, media } = setup()
    const source = await sharp({
      create: {
        width: 64,
        height: 32,
        channels: 4,
        background: { r: 20, g: 80, b: 160, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer()
    await service.upload({
      name: 'alpha.png',
      mimeType: 'image/png',
      base64: source.toString('base64'),
      purpose: 'article-cover',
    })
    const stored = media.create.mock.calls[0]![0]
    expect(await sharp(stored.data).metadata()).toMatchObject({
      format: 'webp',
      width: 64,
      height: 32,
      hasAlpha: true,
    })
    const { data, info } = await sharp(stored.data)
      .raw()
      .toBuffer({ resolveWithObject: true })
    expect(info.channels).toBe(4)
    expect(data[3]).toBe(128)
  })

  it('accepts WebP input and preserves its aspect ratio', async () => {
    const { service, media } = setup()
    const source = await sharp({
      create: { width: 160, height: 90, channels: 3, background: '#6d6552' },
    })
      .webp()
      .toBuffer()
    await service.upload({
      name: 'cover.webp',
      mimeType: 'image/webp',
      base64: source.toString('base64'),
      purpose: 'article-cover',
    })
    expect(
      await sharp(media.create.mock.calls[0]![0].data).metadata(),
    ).toMatchObject({ format: 'webp', width: 160, height: 90 })
  })

  it('rejects damaged image data and videos before creating a cover', async () => {
    const { service, media } = setup()
    for (const input of [
      {
        name: 'broken.png',
        mimeType: 'image/png',
        data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      },
      {
        name: 'video.mp4',
        mimeType: 'video/mp4',
        data: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112]),
      },
    ]) {
      await expect(
        service.upload({
          name: input.name,
          mimeType: input.mimeType,
          base64: input.data.toString('base64'),
          purpose: 'article-cover',
        }),
      ).rejects.toBeInstanceOf(InvalidStoryMediaError)
    }
    expect(media.create.mock.calls).toHaveLength(0)
  })

  it('leaves the existing story-media upload contract unchanged', async () => {
    const { service, media } = setup()
    const source = await sharp({
      create: { width: 100, height: 50, channels: 3, background: '#9c7854' },
    })
      .png()
      .toBuffer()
    await service.upload({
      name: 'story.png',
      mimeType: 'image/png',
      base64: source.toString('base64'),
    })
    expect(media.create.mock.calls).toEqual([
      [
        {
          name: 'story.png',
          mimeType: 'image/png',
          data: source,
        },
      ],
    ])
  })

  it('rejects excessive decoded dimensions and animated WebP before persistence', async () => {
    const { service, media } = setup()
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer()
    png.writeUInt32BE(8001, 16)
    png.writeUInt32BE(8000, 20)
    png.writeUInt32BE(crc32(png.subarray(12, 29)), 29)
    const animated = await sharp(Buffer.from([255, 0, 0, 0, 0, 255]), {
      raw: { width: 1, height: 2, channels: 3, pageHeight: 1 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer()
    expect((await sharp(animated).metadata()).pages).toBe(2)
    for (const [mimeType, source] of [
      ['image/png', png],
      ['image/webp', animated],
    ] as const) {
      await expect(
        service.upload({
          name: 'cover',
          mimeType,
          base64: source.toString('base64'),
          purpose: 'article-cover',
        }),
      ).rejects.toBeInstanceOf(InvalidStoryMediaError)
    }
    expect(media.create.mock.calls).toHaveLength(0)
  })

  it('accepts only the declared cover purpose in the request DTO', async () => {
    const input = {
      name: 'cover.png',
      mimeType: 'image/png',
      base64: 'AAAA',
      purpose: 'article-cover',
    }
    expect(
      await validate(plainToInstance(UploadStoryMediaDto, input)),
    ).toHaveLength(0)
    expect(
      await validate(
        plainToInstance(UploadStoryMediaDto, { ...input, purpose: 'unknown' }),
      ),
    ).not.toHaveLength(0)
  })
})
