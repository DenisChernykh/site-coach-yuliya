import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRevalidator } from 'react-router'
import { consultationKeys, consultationStatuses } from '@/entities/consultation'
import {
  adminUpdateConsultation,
  adminRetryTelegram,
  isProblemCode,
  type AdminConsultationDto,
} from '@/shared/api'
import {
  Alert,
  AlertDescription,
  Button,
  SelectField,
  TextareaField,
} from '@/shared/ui'

export function ConsultationForm({
  consultation,
}: {
  consultation: AdminConsultationDto
}) {
  const [status, setStatus] = useState(consultation.status)
  const [note, setNote] = useState(consultation.adminNote)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const client = useQueryClient()
  const revalidator = useRevalidator()
  const onError = (failure: unknown) => {
    if (isProblemCode(failure, 'AUTHENTICATION_REQUIRED'))
      void revalidator.revalidate()
  }
  const onSuccess = async () => {
    await client.invalidateQueries({ queryKey: consultationKeys() })
  }
  const save = useMutation({
    mutationFn: () =>
      adminUpdateConsultation(
        { id: consultation.id },
        { status, adminNote: note },
      ),
    onSuccess,
    onError,
  })
  const retry = useMutation({
    mutationFn: () => adminRetryTelegram({ id: consultation.id }),
    onSuccess,
    onError,
  })
  const deliveryLabels: Record<string, string> = {
    PENDING: 'Ожидает отправки',
    PROCESSING: 'Отправляется',
    SENT: 'Отправлено',
    FAILED: 'Ошибка отправки',
  }
  const date = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return (
    <section className="space-y-5 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
      <div>
        <h2 className="text-xl font-semibold">{consultation.name}</h2>
        <p className="mt-1 text-sm break-words">{consultation.contact}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {date.format(new Date(consultation.createdAt))}
        </p>
      </div>
      {consultation.serviceTitle && (
        <p className="text-sm">Программа: {consultation.serviceTitle}</p>
      )}
      {consultation.message && (
        <p className="text-sm leading-7 break-words whitespace-pre-wrap">
          {consultation.message}
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setError(null)
          setNotice(null)
          try {
            await save.mutateAsync()
            setNotice('Заявка обновлена.')
          } catch {
            setError('Не удалось сохранить заявку. Попробуйте снова.')
          }
        }}
      >
        <SelectField
          label="Статус заявки"
          options={consultationStatuses}
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        />
        <TextareaField
          label="Заметка администратора"
          rows={5}
          maxLength={4000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button
          type="submit"
          isLoading={save.isPending}
          loadingLabel="Сохраняем"
        >
          Сохранить заявку
        </Button>
      </form>
      <div className="border-t pt-4 text-sm">
        <p>
          Telegram:{' '}
          {consultation.delivery
            ? deliveryLabels[consultation.delivery.status]
            : 'Нет уведомления'}
        </p>
        {consultation.delivery?.status === 'FAILED' && (
          <Button
            className="mt-3"
            variant="outline"
            isLoading={retry.isPending}
            loadingLabel="Повторяем"
            onClick={async () => {
              setError(null)
              try {
                await retry.mutateAsync()
                setNotice('Уведомление поставлено в очередь.')
              } catch {
                setError('Не удалось повторить отправку.')
              }
            }}
          >
            Повторить отправку
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Согласие на обработку данных:{' '}
        {date.format(new Date(consultation.consentAt))}, версия{' '}
        {consultation.consentVersion}.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
    </section>
  )
}
