import { useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  Button,
} from '@/shared/ui'
import { contentError } from '../model/errors'
import { useContentMutation } from '../model/mutations'
import { adminDeleteArticle, adminDeleteProgram } from '@/shared/api'
export function DeleteContentButton({
  kind,
  id,
  onDeleted,
}: {
  kind: 'articles' | 'programs'
  id: string
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remove = useContentMutation(
    (value: string) =>
      kind === 'articles'
        ? adminDeleteArticle({ id: value })
        : adminDeleteProgram({ id: value }),
    kind,
  )
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="ghost" className="text-destructive" />}
      >
        Удалить
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Удалить {kind === 'articles' ? 'статью' : 'программу'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Запись будет удалена из базы и исчезнет с сайта после пересборки.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            Отмена
          </AlertDialogCancel>
          <Button
            variant="destructive"
            isLoading={remove.isPending}
            loadingLabel="Удаляем"
            onClick={async () => {
              setError(null)
              try {
                await remove.mutateAsync(id)
                setOpen(false)
                onDeleted()
              } catch (failure) {
                setError(contentError(failure))
              }
            }}
          >
            Удалить
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
