import sharp from 'sharp'
import type { ArticleCoverOptimizerPort } from '../application/article-cover-optimizer.port'
import { InvalidStoryMediaError } from '../application/site-errors'

export class SharpArticleCoverOptimizer implements ArticleCoverOptimizerPort {
  public async optimize(data: Uint8Array): Promise<Uint8Array> {
    try {
      const image = sharp(data, {
        limitInputPixels: 64_000_000,
        failOn: 'warning',
      })
      const metadata = await image.metadata()
      if (
        !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') ||
        (metadata.pages ?? 1) !== 1
      )
        throw new InvalidStoryMediaError()
      return await image
        .autoOrient()
        .resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
        .webp({
          quality: 90,
          alphaQuality: 100,
          smartSubsample: true,
          effort: 5,
        })
        .timeout({ seconds: 10 })
        .toBuffer()
    } catch {
      throw new InvalidStoryMediaError()
    }
  }
}
