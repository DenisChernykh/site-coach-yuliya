import { useState } from 'react'
import { seoSchema, type SeoSettingsDto } from '@/shared/api'
import { Alert, AlertDescription, Button } from '@/shared/ui'
import { contentError } from '../model/errors'
import { useSaveSeo } from '../model/mutations'
import { useContentNavigationGuard } from '../model/use-content-navigation-guard'
import { SeoSettingsFields } from './seo-fields'

export function SeoForm({ initial }: { initial: SeoSettingsDto }) {
  const save = useSaveSeo()
  const [value, setValue] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { blocker } = useContentNavigationGuard(dirty)
  return (
    <form
      className="max-w-3xl space-y-6"
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)
        setSaved(false)
        const result = seoSchema.safeParse(value)
        if (!result.success) {
          setError('Проверьте заполненные поля и ссылки.')
          return
        }
        try {
          await save.mutateAsync(result.data)
          setDirty(false)
          setSaved(true)
        } catch (failure) {
          setError(contentError(failure))
        }
      }}
    >
      {blocker.state === 'blocked' && (
        <Alert>
          <AlertDescription>
            Есть несохранённые изменения.
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => blocker.reset()}
              >
                Продолжить редактирование
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => blocker.proceed()}
              >
                Уйти без сохранения
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      <fieldset disabled={save.isPending}>
        <SeoSettingsFields
          value={value}
          onChange={(next) => {
            setValue(next)
            setDirty(true)
            setSaved(false)
          }}
        />
      </fieldset>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <p role="status" className="text-sm text-muted-foreground">
          Изменения сохранены в черновике. Нажмите «Опубликовать сохранённое»,
          чтобы обновить сайт.
        </p>
      )}
      <Button type="submit" isLoading={save.isPending} loadingLabel="Сохраняем">
        Сохранить изменения
      </Button>
    </form>
  )
}
