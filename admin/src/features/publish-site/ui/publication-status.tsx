import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRevalidator } from 'react-router'
import { contentKeys, usePublication } from '@/entities/site-content'
import { adminRetryPublication, isProblemCode } from '@/shared/api'
import { Alert, AlertDescription, Button } from '@/shared/ui'

export function PublicationStatus() {
  const publication = usePublication()
  const client = useQueryClient()
  const revalidator = useRevalidator()
  const retry = useMutation({
    mutationFn: () => adminRetryPublication(),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: contentKeys.publication() }),
    onError: (error) => {
      if (isProblemCode(error, 'AUTHENTICATION_REQUIRED'))
        void revalidator.revalidate()
    },
  })
  if (publication.isPending)
    return (
      <p className="text-sm text-muted-foreground">Проверяем публикацию…</p>
    )
  if (publication.isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Не удалось получить статус публикации.
        </AlertDescription>
      </Alert>
    )
  const data = publication.data
  const labels = {
    IDLE: 'Сайт обновлён',
    PENDING: 'Изменения ожидают пересборки',
    DISPATCHING: 'Запускаем пересборку',
    BUILDING: 'Сайт пересобирается',
    FAILED: 'Не удалось обновить сайт',
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b py-3 text-sm">
      <p role="status">
        {data.automaticPublicationEnabled
          ? labels[data.status]
          : 'Автоматическая публикация отключена'}
      </p>
      <span className="text-xs text-muted-foreground">
        На сайте: {data.deployedRevision} · В базе: {data.requestedRevision}
      </span>
      {data.workflowUrl && (
        <a
          href={data.workflowUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline underline-offset-4"
        >
          Открыть сборку
        </a>
      )}
      {data.status === 'FAILED' && data.automaticPublicationEnabled && (
        <Button
          variant="outline"
          size="sm"
          isLoading={retry.isPending}
          loadingLabel="Запускаем"
          onClick={() => retry.mutate()}
        >
          Повторить публикацию
        </Button>
      )}
      {retry.isError && (
        <p className="text-destructive">
          Не удалось запустить повторную публикацию.
        </p>
      )}
    </div>
  )
}
