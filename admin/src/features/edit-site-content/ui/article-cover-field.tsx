import { MediaLibrary } from './media-library'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/shared/ui'
import legacyArt from '../../../../../design/assets/art.png'
import legacyLandscape from '../../../../../design/assets/landscape.png'
import { contentError } from '../model/errors'
import {
  storyImageTypes,
  uploadStoryFile,
  StoryUploadError,
} from '../model/story-upload'

export function ArticleCoverField({
  value,
  onChange,
  onUploadingChange,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  onUploadingChange: (busy: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  const inFlight = useRef(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [failedPreview, setFailedPreview] = useState('')
  const [localPreview, setLocalPreview] = useState('')
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    },
    [localPreview],
  )
  const storedPreview =
    value === 'art'
      ? legacyArt
      : value === 'landscape'
        ? legacyLandscape
        : value

  const preview = localPreview || storedPreview

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function upload(file?: File) {
    if (!file || inFlight.current) return
    setError('')
    if (!storyImageTypes.includes(file.type)) {
      setError('Выберите изображение JPG, PNG или WebP.')
      return
    }
    setLocalPreview(URL.createObjectURL(file))
    inFlight.current = true
    setBusy(true)
    setProgress(0)
    onUploadingChange(true)
    try {
      const media = await uploadStoryFile(
        file,
        (percent) => {
          if (mounted.current) setProgress(percent)
        },
        'article-cover',
        `${window.location.pathname}:cover`,
      )
      if (mounted.current) {
        setLocalPreview('')
        setFailedPreview('')
        onChange(`/v1/story-media/${media.id}`)
      }
    } catch (failure) {
      if (mounted.current) setLocalPreview('')
      if (mounted.current)
        setError(
          failure instanceof StoryUploadError
            ? failure.message
            : contentError(failure),
        )
    } finally {
      inFlight.current = false
      if (mounted.current) {
        setBusy(false)
        onUploadingChange(false)
      }
    }
  }

  return (
    <section className="space-y-3" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-lg font-semibold">
        Обложка статьи
      </h2>
      <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
        {preview && failedPreview !== preview ? (
          <img
            src={preview}
            alt="Превью обложки статьи"
            className="max-h-64 w-full object-contain"
            onError={() => setFailedPreview(preview)}
          />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            {preview
              ? 'Не удалось показать текущую обложку. Можно загрузить другую.'
              : 'Выберите изображение для обложки статьи.'}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={storyImageTypes.join(',')}
        aria-label="Файл обложки статьи"
        aria-describedby={`${id}-hint`}
        hidden
        disabled={busy || disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          void upload(file)
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy || disabled}
        onClick={() => input.current?.click()}
      >
        {value ? 'Заменить обложку' : 'Загрузить обложку'}
      </Button>
      <MediaLibrary
        purpose="article-cover"
        imagesOnly
        disabled={busy || disabled}
        onSelect={(media) => {
          setLocalPreview('')
          setFailedPreview('')
          onChange(`/v1/story-media/${media.id}`)
        }}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        JPG, PNG или WebP, до 8 МБ. Обложка оптимизируется автоматически. После
        готовности сохраните статью.
      </p>
      {busy && (
        <p role="status" className="text-sm">
          {progress < 100
            ? `Загружаем обложку… ${progress}%`
            : 'Файл сохранён. Ожидаем обработки — страницу можно закрыть.'}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
