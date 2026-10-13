import { useSeo } from '@/entities/site-content'
import { SeoForm } from '@/features/edit-site-content'
import { Alert, AlertDescription } from '@/shared/ui'

export function SeoPage() {
  const query = useSeo()
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">SEO</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Заголовки и описания для поиска, превью ссылок и индексация. Сохраните
        черновик, затем опубликуйте его для обновления сайта.
      </p>
      {query.isPending ? (
        <p>Загружаем…</p>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Не удалось загрузить данные. Обновите страницу.
          </AlertDescription>
        </Alert>
      ) : (
        <SeoForm initial={query.data} />
      )}
    </section>
  )
}
