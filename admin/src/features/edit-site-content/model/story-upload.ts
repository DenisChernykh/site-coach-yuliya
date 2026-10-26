import {
  adminCreateMediaUpload,
  adminGetMediaUpload,
  adminUploadMediaChunk,
  adminCompleteMediaUpload,
  type MediaUploadDtoPurpose,
} from '@/shared/api'

export const storyImageTypes = ['image/jpeg', 'image/png', 'image/webp']
export const storyMediaTypes = [...storyImageTypes, 'video/mp4']
export class StoryUploadError extends Error {}
const chunkSize = 1024 * 1024

export async function uploadStoryFile(
  file: File,
  onProgress: (percent: number) => void,
  purpose: MediaUploadDtoPurpose = 'story',
  contextKey = window.location.pathname,
) {
  if (!storyMediaTypes.includes(file.type))
    throw new StoryUploadError(
      'Выберите JPG, PNG, WebP или подготовленный MP4 (H.264/AAC).',
    )
  const image = file.type.startsWith('image/')
  if (!file.size || file.size > (image ? 8 : 30) * 1024 * 1024)
    throw new StoryUploadError(
      `Файл слишком большой. Максимум: ${image ? '8' : '30'} МБ.`,
    )
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () =>
      reject(new StoryUploadError('Не удалось прочитать файл.'))
    reader.readAsArrayBuffer(file)
  })
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  const sha256 = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  const key = `media-upload:v1:${purpose}:${sha256}:${contextKey}`
  let id: string
  try {
    id = localStorage.getItem(key) || crypto.randomUUID()
    localStorage.setItem(key, id)
  } catch {
    id = crypto.randomUUID()
  }
  let upload = await adminCreateMediaUpload({
    id,
    name: file.name.slice(0, 200),
    mimeType: file.type as
      'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4',
    size: file.size,
    sha256,
    purpose,
    contextKey: contextKey.slice(0, 300),
  })
  if (upload.status === 'UPLOADING') {
    const received = new Set(
      (await adminGetMediaUpload({ id })).receivedChunks ?? [],
    )
    for (let index = 0; index * chunkSize < file.size; index++) {
      if (!received.has(index))
        await adminUploadMediaChunk(
          { id, index },
          file.slice(
            index * chunkSize,
            Math.min(file.size, (index + 1) * chunkSize),
            'application/octet-stream',
          ),
        )
      onProgress(
        Math.min(
          99,
          Math.round(
            (Math.min(file.size, (index + 1) * chunkSize) / file.size) * 100,
          ),
        ),
      )
    }
    upload = await adminCompleteMediaUpload({ id })
  }
  onProgress(100)
  const deadline = Date.now() + 180_000
  while (upload.status === 'QUEUED' || upload.status === 'PROCESSING') {
    if (Date.now() > deadline)
      throw new StoryUploadError(
        'Файл сохранён и ожидает обработки. Результат появится в «Загруженных файлах»; страницу можно закрыть.',
      )
    await new Promise((resolve) => setTimeout(resolve, 2000))
    upload = await adminGetMediaUpload({ id })
  }
  if (upload.status !== 'READY')
    throw new StoryUploadError(
      upload.error === 'INVALID_MEDIA'
        ? image
          ? 'Не удалось обработать изображение. Выберите другой файл.'
          : 'Нужен MP4 H.264/AAC с быстрым стартом, до 60 секунд, 1920 × 1080 или 1080 × 1920 и 60 кадров/с.'
        : 'Обработка не завершена. Откройте «Загруженные файлы», чтобы повторить её.',
    )
  return {
    id: upload.id,
    mimeType: upload.output!.mimeType,
    size: upload.output!.size,
    type: image ? ('image' as const) : ('video' as const),
  }
}

export function reorderStoryItem<T>(
  items: T[],
  index: number,
  offset: number,
): T[] {
  const destination = index + offset
  if (destination < 0 || destination >= items.length) return items
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(destination, 0, item!)
  return next
}
