import { useSearchParams } from 'react-router'
import { useArticles, usePrograms } from '@/entities/site-content'
import {
  ArticleForm,
  ProgramForm,
  DeleteContentButton,
} from '@/features/edit-site-content'
import { Alert, AlertDescription, Button } from '@/shared/ui'

export function ArticlesPage() {
  const query = useArticles()
  const [params, setParams] = useSearchParams()
  const selected = query.data?.find((item) => item.id === params.get('edit'))
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Статьи</h1>
        <Button onClick={() => setParams({ edit: 'new' })}>
          Добавить статью
        </Button>
      </div>
      {query.isPending ? (
        <p>Загружаем статьи…</p>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Не удалось загрузить статьи.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <ul className="divide-y border-t">
              {query.data.map((article) => (
                <li key={article.id}>
                  <button
                    type="button"
                    aria-pressed={selected?.id === article.id}
                    className={`w-full px-2 py-4 text-left transition-colors hover:bg-muted ${selected?.id === article.id ? 'bg-muted' : ''}`}
                    onClick={() => setParams({ edit: article.id })}
                  >
                    <p className="text-sm font-medium">
                      {article.content.title || 'Без заголовка'}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {article.published
                        ? 'Включена в публикацию'
                        : 'Не показывать'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            {query.data.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">Статей нет.</p>
            )}
          </div>
          {selected || params.get('edit') === 'new' ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">
                  {selected ? 'Редактирование статьи' : 'Новая статья'}
                </h2>
                {selected && (
                  <DeleteContentButton
                    kind="articles"
                    id={selected.id}
                    onDeleted={() => setParams({})}
                  />
                )}
              </div>
              <ArticleForm
                key={selected?.id ?? 'new'}
                article={selected}
                onSaved={(id) => {
                  if (!selected) setParams({ edit: id })
                }}
              />
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              Выберите статью или добавьте новую.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
export function ProgramsPage() {
  const query = usePrograms()
  const [params, setParams] = useSearchParams()
  const selected = query.data?.find((item) => item.id === params.get('edit'))
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Программы</h1>
        <Button onClick={() => setParams({ edit: 'new' })}>
          Добавить программу
        </Button>
      </div>
      {query.isPending ? (
        <p>Загружаем программы…</p>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Не удалось загрузить программы.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div>
            <ul className="divide-y border-t">
              {query.data.map((program) => (
                <li key={program.id}>
                  <button
                    type="button"
                    aria-pressed={selected?.id === program.id}
                    className={`w-full px-2 py-4 text-left transition-colors hover:bg-muted ${selected?.id === program.id ? 'bg-muted' : ''}`}
                    onClick={() => setParams({ edit: program.id })}
                  >
                    <p className="text-sm font-medium">
                      {program.content.title || 'Без названия'}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {program.published
                        ? 'Включена в публикацию'
                        : 'Не показывать'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {selected || params.get('edit') === 'new' ? (
            <div className="max-w-3xl space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">
                  {selected ? 'Редактирование программы' : 'Новая программа'}
                </h2>
                {selected && (
                  <DeleteContentButton
                    kind="programs"
                    id={selected.id}
                    onDeleted={() => setParams({})}
                  />
                )}
              </div>
              <ProgramForm
                key={selected?.id ?? 'new'}
                program={selected}
                onSaved={(id) => {
                  if (!selected) setParams({ edit: id })
                }}
              />
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              Выберите программу или добавьте новую.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
