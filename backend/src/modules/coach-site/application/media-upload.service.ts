import { InvalidStoryMediaError, SiteRecordNotFoundError } from './site-errors'
import {
  MEDIA_CHUNK_BYTES,
  type MediaUploadInput,
  type MediaUpload,
  type MediaUploadStorePort,
  type MediaFilesPort,
  type MediaProcessorPort,
} from './media-upload.port'

export class MediaUploadService {
  public constructor(
    private readonly uploads: MediaUploadStorePort,
    private readonly files: MediaFilesPort,
  ) {}
  public async create(input: MediaUploadInput): Promise<MediaUpload> {
    const image = ['image/jpeg', 'image/png', 'image/webp'].includes(
      input.mimeType,
    )
    if (
      (!image &&
        (input.mimeType !== 'video/mp4' || input.purpose !== 'story')) ||
      input.size < 1 ||
      input.size > (image ? 8 : 30) * 1024 * 1024
    )
      throw new InvalidStoryMediaError()
    return this.uploads.create(input)
  }
  public async get(
    id: string,
  ): Promise<MediaUpload & { receivedChunks: number[] }> {
    const upload = await this.require(id)
    return {
      ...upload,
      receivedChunks:
        upload.status === 'UPLOADING' ? await this.files.chunks(upload) : [],
    }
  }
  public list(contextKey?: string): Promise<MediaUpload[]> {
    return this.uploads.list(contextKey)
  }
  public async chunk(
    id: string,
    index: number,
    data: Uint8Array,
  ): Promise<void> {
    const upload = await this.require(id)
    const expected = Math.min(
      MEDIA_CHUNK_BYTES,
      upload.size - index * MEDIA_CHUNK_BYTES,
    )
    if (
      upload.status !== 'UPLOADING' ||
      !Number.isSafeInteger(index) ||
      index < 0 ||
      expected <= 0 ||
      data.length !== expected
    )
      throw new InvalidStoryMediaError()
    await this.files.chunk(upload, index, data)
  }
  public async finish(id: string): Promise<MediaUpload> {
    const upload = await this.require(id)
    if (upload.status === 'UPLOADING') {
      await this.files.assemble(upload)
      await this.uploads.enqueue(id)
    }
    return this.require(id)
  }
  public async retry(id: string): Promise<MediaUpload> {
    const upload = await this.require(id)
    if (upload.status !== 'FAILED' || upload.error !== 'PROCESSING_FAILED')
      throw new InvalidStoryMediaError()
    await this.uploads.retry(id)
    return this.require(id)
  }
  private async require(id: string): Promise<MediaUpload> {
    const upload = await this.uploads.get(id)
    if (!upload) throw new SiteRecordNotFoundError()
    return upload
  }
}

export class ProcessMediaUploads {
  public constructor(
    private readonly uploads: MediaUploadStorePort,
    private readonly processor: MediaProcessorPort,
  ) {}
  public async run(token: string, budgetMs = 25_000): Promise<number> {
    if (!(await this.uploads.acquire(token))) return 0
    let processed = 0
    try {
      const deadline = Date.now() + budgetMs
      while (Date.now() < deadline) {
        const upload = await this.uploads.claim(token)
        if (!upload) break
        try {
          const result = await this.processor.process(upload, token)
          await this.uploads.complete(upload.id, token, result)
        } catch (error) {
          await this.uploads.fail(
            upload.id,
            token,
            error instanceof InvalidStoryMediaError,
          )
        }
        processed += 1
      }
      await this.uploads.cleanup()
    } finally {
      await this.uploads.release(token)
    }
    return processed
  }
}
