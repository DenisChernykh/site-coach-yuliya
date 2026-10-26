import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { crc32 } from 'node:zlib'
import sharp from 'sharp'
import { DiskMediaFiles } from '@/modules/coach-site/infrastructure/disk-media-files'
import { SharpMediaProcessor } from '@/modules/coach-site/infrastructure/sharp-media-processor'
import { inspectPreparedMp4 } from '@/modules/coach-site/infrastructure/prepared-mp4'
import { InvalidStoryMediaError } from '@/modules/coach-site/application/site-errors'
import type { MediaUpload } from '@/modules/coach-site/application/media-upload.port'

let directory: string
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'media-profiles-'))
})
afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})
async function processImage(
  bytes: Buffer,
  mimeType = 'image/png',
  purpose: MediaUpload['purpose'] = 'photo',
): Promise<Buffer> {
  const files = new DiskMediaFiles(directory)
  const id = randomUUID()
  await mkdir(files.directory(id), { recursive: true })
  await writeFile(files.source(id), bytes)
  const input: MediaUpload = {
    id,
    name: 'image',
    mimeType,
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    purpose,
    contextKey: 'test',
    status: 'PROCESSING',
    attempts: 1,
    error: null,
    output: null,
  }
  const output = await new SharpMediaProcessor(files).process(
    input,
    randomUUID(),
  )
  return readFile(join(directory, 'public', output.url.slice('/media/'.length)))
}
it('does not enlarge small photos and retains transparent pixels', async () => {
  const input = await sharp({
    create: {
      width: 64,
      height: 32,
      channels: 4,
      background: { r: 20, g: 80, b: 160, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer()
  const output = await processImage(input)
  const { data, info } = await sharp(output)
    .raw()
    .toBuffer({ resolveWithObject: true })
  expect(info).toMatchObject({ width: 64, height: 32, channels: 4 })
  expect(data[3]).toBe(128)
})
it('uses lossless WebP for readable documents', async () => {
  const input = await sharp({
    create: { width: 64, height: 32, channels: 3, background: '#1b3759' },
  })
    .png()
    .toBuffer()
  expect(
    await sharp(await processImage(input, 'image/png', 'document'))
      .raw()
      .toBuffer(),
  ).toEqual(await sharp(input).raw().toBuffer())
})
it('rejects damaged bytes, pixel bombs, format mismatches and animated WebP', async () => {
  const png = await sharp({
    create: { width: 1, height: 1, channels: 3, background: '#000' },
  })
    .png()
    .toBuffer()
  const bomb = Buffer.from(png)
  bomb.writeUInt32BE(8001, 16)
  bomb.writeUInt32BE(8000, 20)
  bomb.writeUInt32BE(crc32(bomb.subarray(12, 29)), 29)
  const animated = await sharp(Buffer.from([255, 0, 0, 0, 0, 255]), {
    raw: { width: 1, height: 2, channels: 3, pageHeight: 1 },
  })
    .webp({ loop: 0, delay: [100, 100] })
    .toBuffer()
  for (const [bytes, mime] of [
    [Buffer.from('broken'), 'image/png'],
    [bomb, 'image/png'],
    [animated, 'image/webp'],
    [png, 'image/jpeg'],
  ] as const)
    await expect(processImage(bytes, mime)).rejects.toBeInstanceOf(
      InvalidStoryMediaError,
    )
})
it('accepts a prepared MP4 and rejects missing samples or fabricated headers', async () => {
  const bytes = await readFile('test/fixtures/media/prepared.mp4')
  expect(inspectPreparedMp4(bytes)).toEqual({ width: 96, height: 160 })
  expect(() =>
    inspectPreparedMp4(bytes.subarray(0, bytes.length - 200)),
  ).toThrow(InvalidStoryMediaError)
  expect(() => inspectPreparedMp4(Buffer.from('0000ftypfake'))).toThrow(
    InvalidStoryMediaError,
  )
})
