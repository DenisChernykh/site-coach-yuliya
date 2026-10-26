import { adminUploadStoryMedia } from '@/shared/api'

export const storyImageTypes = ['image/jpeg', 'image/png', 'image/webp']
export const storyMediaTypes = [...storyImageTypes, 'video/mp4', 'video/webm']
export class StoryUploadError extends Error {}

export async function uploadStoryFile(
  file: File,
  onProgress: (percent: number) => void,
  purpose?: 'article-cover',
) {
  if (!storyMediaTypes.includes(file.type))
    throw new StoryUploadError('Выберите JPG, PNG, WebP, MP4 или WebM.')
  const limit = (file.type.startsWith('image/') ? 8 : 30) * 1024 * 1024
  if (!file.size || file.size > limit)
    throw new StoryUploadError(
      `Файл слишком большой. Максимум: ${file.type.startsWith('image/') ? '8' : '30'} МБ.`,
    )
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () =>
      reject(
        new StoryUploadError(
          'Не удалось прочитать файл. Выберите его ещё раз.',
        ),
      )
    reader.readAsDataURL(file)
  })
  return adminUploadStoryMedia(
    {
      name: file.name.slice(0, 200),
      mimeType: file.type as
        'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/webm',
      base64,
      ...(purpose ? { purpose } : {}),
    },
    {
      onUploadProgress: (event) =>
        onProgress(Math.round((event.loaded / (event.total || 1)) * 100)),
    },
  )
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
