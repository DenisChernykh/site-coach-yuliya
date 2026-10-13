import { useState } from 'react'
import { Link } from 'react-router'
import { useCms } from '@/entities/site-content'
import { Button } from '@/shared/ui'
import { useCmsActions } from '../model/cms-mutations'
import { contentError } from '../model/errors'

export function CmsPublicationBar() {
  const query = useCms()
  const { publish } = useCmsActions()
  const [notice, setNotice] = useState('')
  if (!query.data) return null
  const draft = query.data.revision !== query.data.publishedRevision
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <div className="text-sm">
        <p>
          {draft
            ? 'Есть сохранённые изменения в черновике'
            : 'Сохранённый контент передан в публикацию'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Посетители увидят изменения после успешной сборки сайта.
        </p>
        {notice && (
          <p role="status" className="mt-2 text-sm">
            {notice}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          nativeButton={false}
          render={<Link to="/editor" />}
          size="sm"
          variant="outline"
        >
          Редактор страниц
        </Button>
        <Button
          size="sm"
          disabled={!draft || publish.isPending}
          onClick={async () => {
            try {
              await publish.mutateAsync(query.data!.revision)
              setNotice('Черновик поставлен в очередь публикации.')
            } catch (error) {
              setNotice(contentError(error))
            }
          }}
        >
          Опубликовать сохранённое
        </Button>
      </div>
    </div>
  )
}
