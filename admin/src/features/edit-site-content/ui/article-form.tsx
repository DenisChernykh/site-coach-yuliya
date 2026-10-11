import { useState } from 'react'
import { Controller } from 'react-hook-form'
import {
  writeArticleSchema,
  type ManagedArticleDto,
  type ArticleDto,
} from '@/shared/api'
import { useZodForm } from '@/shared/lib/form'
import {
  Alert,
  AlertDescription,
  Button,
  RichTextEditor,
  TextField,
} from '@/shared/ui'
import { newArticle, type ContentValue } from '../model/content-fields'
import { articleMarkdown } from '../model/article-markdown'
import { contentError } from '../model/errors'
import { useSaveArticle } from '../model/mutations'
import { ContentFields } from './content-fields'
import { useContentNavigationGuard } from '../model/use-content-navigation-guard'

const primaryMetadataKeys = ['slug', 'title', 'topic', 'description']
const metadataKeys = [
  'slug',
  'title',
  'description',
  'topic',
  'topicLabel',
  'coverImage',
  'coverAlt',
  'previewTitle',
  'previewDescription',
  'listingDescription',
  'practiceTitle',
  'practiceQuestions',
  'ctaTitle',
  'ctaDescription',
]

export function ArticleForm({
  article,
  onSaved,
}: {
  article?: ManagedArticleDto
  onSaved: (id: string) => void
}) {
  const save = useSaveArticle(article?.id)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState(false)
  const initial = { ...newArticle, ...article?.content }
  const form = useZodForm(writeArticleSchema, {
    defaultValues: {
      content: { ...initial, bodyMarkdown: articleMarkdown(initial) },
      published: article?.published ?? false,
      sortOrder: article?.sortOrder ?? 0,
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
      <fieldset className="space-y-6" disabled={save.isPending}>
        <Controller
          name="content"
          control={form.control}
          render={({ field }) => {
            const primary = Object.fromEntries(
              Object.entries(field.value).filter(([key]) =>
                primaryMetadataKeys.includes(key),
              ),
            ) as ContentValue
            const secondary = Object.fromEntries(
              Object.entries(field.value).filter(
                ([key]) =>
                  metadataKeys.includes(key) &&
                  !primaryMetadataKeys.includes(key),
              ),
            ) as ContentValue
            return (
              <>
                <ContentFields
                  value={primary}
                  onChange={(next) =>
                    field.onChange({
                      ...field.value,
                      ...(next as Partial<ArticleDto>),
                    })
                  }
                />
                <RichTextEditor
                  label="Текст статьи"
                  value={field.value.bodyMarkdown ?? ''}
                  onChange={(value) =>
                    field.onChange({ ...field.value, bodyMarkdown: value })
                  }
                />
                <details className="space-y-4 border-t pt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Карточки, обложка и дополнительные блоки
                  </summary>
                  <ContentFields
                    value={secondary}
                    onChange={(next) =>
                      field.onChange({
                        ...field.value,
                        ...(next as Partial<ArticleDto>),
                      })
                    }
                  />
                </details>
              </>
            )
          }}
        />
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...form.register('published')}
          />
          Опубликовать на сайте
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
          <AlertDescription>
            Проверьте поля формы и длину текста статьи.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          Статья сохранена. Обновление сайта поставлено в очередь.
        </p>
      )}
      <Button type="submit" isLoading={save.isPending} loadingLabel="Сохраняем">
        Сохранить статью
      </Button>
    </form>
  )
}
