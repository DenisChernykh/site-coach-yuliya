import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import type {
  MediaProcessorPort,
  MediaUpload,
  MediaOutput,
} from '../application/media-upload.port'
import { InvalidStoryMediaError } from '../application/site-errors'
import type { DiskMediaFiles } from './disk-media-files'
import { inspectPreparedMp4 } from './prepared-mp4'

export class SharpMediaProcessor implements MediaProcessorPort {
  public constructor(private readonly files: DiskMediaFiles) {}
  public async process(
    input: MediaUpload,
    token: string,
  ): Promise<MediaOutput> {
    await this.files.verifySource(input)
    const relative = `${input.id}/${token}`
    const directory = join(this.files.root, 'public', relative)
    await mkdir(directory, { recursive: true })
    const url = (name: string): string => `/media/${relative}/${name}`
    if (input.mimeType === 'video/mp4') {
      const metadata = inspectPreparedMp4(
        await readFile(this.files.source(input.id)),
      )
      await copyFile(this.files.source(input.id), join(directory, 'video.mp4'))
      return {
        url: url('video.mp4'),
        previewUrl: '',
        mobileUrl: url('video.mp4'),
        mimeType: 'video/mp4',
        size: input.size,
        ...metadata,
      }
    }
    sharp.concurrency(1)
    sharp.cache({ memory: 16, files: 0, items: 16 })
    const source = this.files.source(input.id)
    const options = { limitInputPixels: 40_000_000, failOn: 'warning' as const }
    let metadata: sharp.Metadata
    try {
      metadata = await sharp(source, options).metadata()
    } catch {
      throw new InvalidStoryMediaError()
    }
    if (
      !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') ||
      (metadata.pages ?? 1) !== 1 ||
      `image/${metadata.format}` !== input.mimeType
    )
      throw new InvalidStoryMediaError()
    const social = input.purpose === 'social'
    const document = input.purpose === 'document'
    const sizes =
      input.purpose === 'story'
        ? [
            [1080, 1920],
            [540, 960],
            [240, 426],
          ]
        : social
          ? [
              [1200, 630],
              [600, 315],
              [240, 126],
            ]
          : [
              [2560, 2560],
              [960, 960],
              [320, 320],
            ]
    const names = ['main', 'mobile', 'preview']
    const results: sharp.OutputInfo[] = []
    for (let index = 0; index < sizes.length; index++) {
      const [width, height] = sizes[index]!
      const image = sharp(source, options)
        .autoOrient()
        .resize(width, height, {
          fit: social ? 'contain' : 'inside',
          background: '#ffffff',
          withoutEnlargement: true,
        })
        .timeout({ seconds: 15 })
      const output = social
        ? image
            .flatten({ background: '#ffffff' })
            .jpeg({ quality: 90, mozjpeg: false })
        : image.webp({
            quality: 90,
            alphaQuality: 100,
            effort: 3,
            lossless: document && index === 0,
            smartSubsample: true,
          })
      results.push(
        await output.toFile(
          join(directory, `${names[index]}.${social ? 'jpg' : 'webp'}`),
        ),
      )
    }
    const main = results[0]!
    const extension = social ? 'jpg' : 'webp'
    return {
      url: url(`main.${extension}`),
      previewUrl: url(`preview.${extension}`),
      mobileUrl: url(`mobile.${extension}`),
      mimeType: social ? 'image/jpeg' : 'image/webp',
      size: main.size,
      width: main.width,
      height: main.height,
    }
  }
}
