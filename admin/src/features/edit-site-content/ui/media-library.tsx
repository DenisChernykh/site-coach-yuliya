import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  mediaUploadsQueryOptions,
  mediaUploadsQueryKey,
} from '@/entities/media'
import {
  adminRetryMediaUpload,
  type MediaUploadDto,
  type MediaUploadDtoPurpose,
} from '@/shared/api'
import { Button } from '@/shared/ui'
import { contentError } from '../model/errors'

const statuses = {
  UPLOADING: 'Загрузка не завершена — выберите тот же файл, чтобы продолжить',
  QUEUED: 'Ожидает обработки',
  PROCESSING: 'Обрабатывается',
  READY: 'Готово',
  FAILED: 'Ошибка обработки',
}
export function MediaLibrary({
  purpose,
  onSelect,
  imagesOnly = false,
  disabled = false,
}: {
  purpose: MediaUploadDtoPurpose
  onSelect: (media: MediaUploadDto) => void
  imagesOnly?: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState('')
  const query = useQuery(mediaUploadsQueryOptions(open))
  const client = useQueryClient()
  const uploads = query.data?.filter(
    (media) =>
      media.purpose === purpose &&
      (!imagesOnly || media.mimeType.startsWith('image/')),
  )
  async function retry(id: string) {
    setRetrying(id)
    setError('')
    try {
      await adminRetryMediaUpload({ id })
      await client.invalidateQueries({ queryKey: mediaUploadsQueryKey() })
    } catch (failure) {
      setError(contentError(failure))
    } finally {
      setRetrying('')
    }
  }
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Скрыть загруженные файлы' : 'Загруженные файлы'}
      </Button>
      {open && (
        <section
          aria-label="Загруженные файлы"
          className="max-h-96 space-y-3 overflow-auto rounded-lg border p-3"
        >
          <p className="text-xs text-muted-foreground">
            Здесь сохраняются загрузки после закрытия страницы. Выберите готовый
            файл, затем сохраните изменения в форме.
          </p>
          {query.isLoading && <p role="status">Загружаем список…</p>}
          {query.error && <p role="alert">{contentError(query.error)}</p>}
          {uploads?.length === 0 && <p>Пока нет загруженных файлов.</p>}
          {uploads?.map((media) => (
            <div
              key={media.id}
              className="flex items-center gap-3 border-t pt-3"
            >
              {media.status === 'READY' &&
                media.mimeType.startsWith('image/') && (
                  <img
                    src={`/v1/story-media/${media.id}?variant=preview`}
                    alt=""
                    className="size-16 rounded object-contain"
                    loading="lazy"
                  />
                )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{media.name}</p>
                <p className="text-xs text-muted-foreground">
                  {statuses[media.status]}
                </p>
                {media.error === 'INVALID_MEDIA' && (
                  <p className="text-xs">
                    Файл не подходит по формату или параметрам. Загрузите
                    другой.
                  </p>
                )}
              </div>
              {media.status === 'READY' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onSelect(media)
                    setOpen(false)
                  }}
                >
                  Выбрать
                </Button>
              )}
              {media.status === 'FAILED' &&
                media.error === 'PROCESSING_FAILED' && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={!!retrying}
                    onClick={() => void retry(media.id)}
                  >
                    Повторить
                  </Button>
                )}
            </div>
          ))}
          {error && <p role="alert">{error}</p>}
        </section>
      )}
    </div>
  )
}
