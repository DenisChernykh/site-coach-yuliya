import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/shared/ui'
import { contentError } from '../model/errors'
import {
  storyImageTypes,
  uploadStoryFile,
  StoryUploadError,
} from '../model/story-upload'

export function ContentImageField({
  value,
  label,
  onChange,
  onUploadingChange,
  fallback,
  clearable = true,
  disabled = false,
}: {
  value: string
  label: string
  onChange: (value: string) => void
  onUploadingChange?: (busy: boolean) => void
  fallback?: string
  clearable?: boolean
  disabled?: boolean
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  const inFlight = useRef(false)
  const callbacks = useRef({ onChange, onUploadingChange })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [failedPreview, setFailedPreview] = useState('')
  const preview = value || fallback || ''
  const localPreview = /^\/(?![/\\])[^\s\\]*$/u.test(preview)
  useEffect(() => {
    callbacks.current = { onChange, onUploadingChange }
  }, [onChange, onUploadingChange])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (inFlight.current) callbacks.current.onUploadingChange?.(false)
    }
  }, [])

  async function upload(file?: File) {
    if (!file || inFlight.current) return
    setError('')
    if (!storyImageTypes.includes(file.type)) {
      setError('Выберите изображение JPG, PNG или WebP.')
      return
    }
    inFlight.current = true
    setBusy(true)
    setProgress(0)
    onUploadingChange?.(true)
    onChange(value)
    try {
      const media = await uploadStoryFile(file, (percent) => {
        if (mounted.current) setProgress(percent)
      })
      if (mounted.current) {
        setFailedPreview('')
        callbacks.current.onChange(`/v1/story-media/${media.id}`)
      }
    } catch (failure) {
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
        callbacks.current.onUploadingChange?.(false)
      }
    }
  }

  return (
    <section className="space-y-3" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-sm font-medium">
        {label}
      </h3>
      <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
        {localPreview && failedPreview !== preview ? (
          <img
            src={preview}
            alt={`Превью: ${label.toLowerCase()}`}
            className="max-h-64 w-full object-contain"
            onError={() => setFailedPreview(preview)}
          />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            {preview
              ? 'Не удалось показать изображение. Можно загрузить другое.'
              : 'Изображение не выбрано.'}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={storyImageTypes.join(',')}
        aria-label={`Файл: ${label.toLowerCase()}`}
        aria-describedby={`${id}-hint`}
        hidden
        disabled={busy || disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          void upload(file)
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || disabled}
          onClick={() => input.current?.click()}
        >
          {value ? 'Заменить изображение' : 'Загрузить изображение'}
        </Button>
        {clearable && value && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy || disabled}
            onClick={() => {
              setError('')
              onChange('')
            }}
          >
            {fallback ? 'Использовать общее изображение' : 'Убрать изображение'}
          </Button>
        )}
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        JPG, PNG или WebP, до 8 МБ. После загрузки сохраните изменения.
        {!value && fallback && ' Сейчас используется изображение по умолчанию.'}
      </p>
      {busy && (
        <p role="status" className="text-sm">
          {progress < 100 ? `Загрузка: ${progress}%` : 'Сохраняем изображение…'}
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
