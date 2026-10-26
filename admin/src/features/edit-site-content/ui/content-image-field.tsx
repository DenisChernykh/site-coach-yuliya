import { useId, useRef, useState } from 'react'
import { TextField } from '@/shared/ui'
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
}: {
  value: string
  label: string
  onChange: (value: string) => void
  onUploadingChange?: (busy: boolean) => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  async function upload(file?: File) {
    if (!file) return
    setError('')
    if (!storyImageTypes.includes(file.type)) {
      setError('Выберите изображение JPG, PNG или WebP.')
      return
    }
    setBusy(true)
    onUploadingChange?.(true)
    onChange(value)
    try {
      const media = await uploadStoryFile(file, setProgress)
      onChange(`/v1/story-media/${media.id}`)
    } catch (failure) {
      setError(
        failure instanceof StoryUploadError
          ? failure.message
          : contentError(failure),
      )
    } finally {
      setBusy(false)
      onUploadingChange?.(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className="space-y-3">
      <TextField
        label={label}
        description="Путь /images/… или ссылка https://. Можно загрузить изображение ниже."
        value={value}
        disabled={busy}
        onChange={(event) => onChange(event.target.value)}
      />
      <label htmlFor={id} className="block text-sm font-medium">
        Загрузить: {label.toLowerCase()}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept={storyImageTypes.join(',')}
        disabled={busy}
        className="block w-full text-sm"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">
        JPG, PNG или WebP, до 8 МБ. Появится на сайте после публикации.
      </p>
      {busy && (
        <p role="status" className="text-sm">
          Загрузка: {progress}%
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
