import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  MEDIA_CHUNK_BYTES,
  type MediaFilesPort,
  type MediaUpload,
} from '../application/media-upload.port'
import { InvalidStoryMediaError } from '../application/site-errors'

export class DiskMediaFiles implements MediaFilesPort {
  public constructor(public readonly root: string) {}
  public directory(id: string): string {
    if (!/^[a-f0-9-]{36}$/iu.test(id)) throw new InvalidStoryMediaError()
    return join(this.root, 'private', id)
  }
  public source(id: string): string {
    return join(this.directory(id), 'source')
  }
  public async chunk(
    input: MediaUpload,
    index: number,
    data: Uint8Array,
  ): Promise<void> {
    const dir = this.directory(input.id)
    await mkdir(dir, { recursive: true, mode: 0o700 })
    const target = join(dir, `chunk-${index}`)
    try {
      const old = await readFile(target)
      if (!old.equals(Buffer.from(data))) throw new InvalidStoryMediaError()
      return
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    const temporary = join(dir, `.chunk-${randomUUID()}`)
    await writeFile(temporary, data, { flag: 'wx', mode: 0o600 })
    try {
      // Hard-link creation is exclusive; a duplicate request cannot overwrite a received chunk.
      const { link } = await import('node:fs/promises')
      try {
        await link(temporary, target)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
        if (!(await readFile(target)).equals(Buffer.from(data)))
          throw new InvalidStoryMediaError()
      }
    } finally {
      await unlink(temporary)
    }
  }
  public async chunks(input: MediaUpload): Promise<number[]> {
    const dir = this.directory(input.id)
    const names = await readdir(dir).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    return names
      .filter((n) => /^chunk-\d+$/u.test(n))
      .map((n) => Number(n.slice(6)))
      .sort((a, b) => a - b)
  }
  public async assemble(input: MediaUpload): Promise<void> {
    const expected = Math.ceil(input.size / MEDIA_CHUNK_BYTES)
    const chunks = await this.chunks(input)
    if (chunks.length !== expected || chunks.some((n, i) => n !== i))
      throw new InvalidStoryMediaError()
    const temporary = join(this.directory(input.id), `.source-${randomUUID()}`)
    const output = await open(temporary, 'wx', 0o600)
    const hash = createHash('sha256')
    let size = 0
    try {
      try {
        for (const index of chunks) {
          const chunk = await readFile(
            join(this.directory(input.id), `chunk-${index}`),
          )
          const expectedSize = Math.min(
            MEDIA_CHUNK_BYTES,
            input.size - index * MEDIA_CHUNK_BYTES,
          )
          if (chunk.length !== expectedSize) throw new InvalidStoryMediaError()
          await output.writeFile(chunk)
          hash.update(chunk)
          size += chunk.length
        }
        await output.sync()
      } finally {
        await output.close()
      }
      if (size !== input.size || hash.digest('hex') !== input.sha256)
        throw new InvalidStoryMediaError()
      await rename(temporary, this.source(input.id))
    } finally {
      await unlink(temporary).catch(() => undefined)
    }
  }
  public async verifySource(input: MediaUpload): Promise<void> {
    const source = this.source(input.id)
    if ((await stat(source)).size !== input.size)
      throw new InvalidStoryMediaError()
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(source))
      hash.update(chunk as Buffer)
    if (hash.digest('hex') !== input.sha256) throw new InvalidStoryMediaError()
  }
}
