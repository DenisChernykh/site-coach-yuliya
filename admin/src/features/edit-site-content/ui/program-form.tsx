import { Controller } from 'react-hook-form'
import { useState } from 'react'
import { writeProgramSchema, type ManagedProgramDto } from '@/shared/api'
import { useZodForm } from '@/shared/lib/form'
import { Alert, AlertDescription, Button, TextField } from '@/shared/ui'
import { newProgram, type ContentValue } from '../model/content-fields'
import { contentError } from '../model/errors'
import { useSaveProgram } from '../model/mutations'
import { ContentFields } from './content-fields'
import { useContentNavigationGuard } from '../model/use-content-navigation-guard'

export function ProgramForm({
  program,
  onSaved,
}: {
  program?: ManagedProgramDto
  onSaved: (id: string) => void
}) {
  const save = useSaveProgram(program?.id)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState(false)
  const form = useZodForm(writeProgramSchema, {
    defaultValues: {
      content: program?.content ?? newProgram,
      published: program?.published ?? false,
      sortOrder: program?.sortOrder ?? 0,
    },
  })
  const { blocker, afterSave } = useContentNavigationGuard(
    form.formState.isDirty,
  )
  const submit = form.handleSubmit(async (input) => {
    setError(null)
    setNotice(false)
    try {
      const saved = await save.mutateAsync(input)
      form.reset({
        content: saved.content,
        published: saved.published,
        sortOrder: saved.sortOrder,
      })
      setNotice(true)
      afterSave(() => onSaved(saved.id))
    } catch (failure) {
      setError(contentError(failure))
    }
  })
  return (
    <form className="space-y-6" onSubmit={submit}>
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
      <fieldset className="space-y-5" disabled={save.isPending}>
        <Controller
          name="content"
          control={form.control}
          render={({ field }) => (
            <ContentFields
              value={field.value as ContentValue}
              onChange={field.onChange}
            />
          )}
        />
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...form.register('published')}
          />
          Включить в публикацию сайта
        </label>
        <TextField
          label="Порядок в списке"
          type="number"
          min={0}
          max={10000}
          {...form.register('sortOrder', { valueAsNumber: true })}
        />
      </fieldset>
      {Object.keys(form.formState.errors).length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>Проверьте поля формы.</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          Программа сохранена в черновике. Нажмите «Опубликовать сохранённое»,
          чтобы обновить сайт.
        </p>
      )}
      <Button type="submit" isLoading={save.isPending} loadingLabel="Сохраняем">
        Сохранить программу
      </Button>
    </form>
  )
}
