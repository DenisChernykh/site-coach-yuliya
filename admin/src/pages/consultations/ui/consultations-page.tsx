import { useState } from 'react'
import { consultationStatuses, useConsultations } from '@/entities/consultation'
import { ConsultationForm } from '@/features/manage-consultation'
import { type AdminListConsultationsParams } from '@/shared/api'
import {
  Alert,
  AlertDescription,
  Button,
  SelectField,
  TextField,
} from '@/shared/ui'

export function ConsultationsPage() {
  const [params, setParams] = useState<AdminListConsultationsParams>({
    page: 1,
    limit: 20,
  })
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const query = useConsultations(params)
  const selected = query.data?.items.find((item) => item.id === selectedId)
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Заявки</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
        >
          Обновить
        </Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setParams({ ...params, page: 1, search: search.trim() || undefined })
          setSelectedId(null)
        }}
      >
        <div className="min-w-48 flex-1">
          <TextField
            label="Поиск по имени или контакту"
            value={search}
            maxLength={120}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="min-w-40">
          <SelectField
            label="Статус"
            options={{ '': 'Все заявки', ...consultationStatuses }}
            value={params.status ?? ''}
            onChange={(event) => {
              setParams({
                ...params,
                page: 1,
                status:
                  event.target.value === ''
                    ? undefined
                    : (event.target
                        .value as AdminListConsultationsParams['status']),
              })
              setSelectedId(null)
            }}
          />
        </div>
        <Button type="submit" variant="outline">
          Найти
        </Button>
      </form>
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Загружаем заявки…</p>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Не удалось загрузить заявки.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="mb-3 text-xs text-muted-foreground">
                Всего: {query.data.total}
              </p>
              <ul className="divide-y border-t">
                {query.data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`w-full px-2 py-4 text-left transition-colors hover:bg-muted ${selectedId === item.id ? 'bg-muted' : ''}`}
                      aria-pressed={selectedId === item.id}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {consultationStatuses[item.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm break-words text-muted-foreground">
                        {item.contact}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Источник: {item.sourceLabel}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              {query.data.items.length === 0 && (
                <p className="py-8 text-sm text-muted-foreground">
                  Заявок нет.
                </p>
              )}
              <div className="mt-5 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={params.page === 1}
                  onClick={() => {
                    setParams({ ...params, page: (params.page ?? 1) - 1 })
                    setSelectedId(null)
                  }}
                >
                  Назад
                </Button>
                <span className="text-xs">
                  {params.page} /{' '}
                  {Math.max(1, Math.ceil(query.data.total / 20))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(params.page ?? 1) * 20 >= query.data.total}
                  onClick={() => {
                    setParams({ ...params, page: (params.page ?? 1) + 1 })
                    setSelectedId(null)
                  }}
                >
                  Далее
                </Button>
              </div>
            </div>
            {selected ? (
              <ConsultationForm key={selected.id} consultation={selected} />
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                Выберите заявку для просмотра.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
