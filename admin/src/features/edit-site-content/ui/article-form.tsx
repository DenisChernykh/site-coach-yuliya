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
import { ArticleCoverField } from './article-cover-field'
import { ArticlePreview } from './cms-preview'
import { SeoFields } from './seo-fields'
import { emptyPageSeo } from '../model/seo'
import { useContentNavigationGuard } from '../model/use-content-navigation-guard'

const primaryMetadataKeys = ['title', 'description']
const metadataKeys = [
  'title',
  'description',
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
  const [uploading, setUploading] = useState(false)
  const initial = { ...newArticle, coverImage: '', ...article?.content }
  const form = useZodForm(writeArticleSchema, {
    defaultValues: {
      content: {
        ...initial,
        seo: initial.seo ?? emptyPageSeo,
        bodyMarkdown: articleMarkdown(initial),
      },
      published: article?.published ?? false,
      sortOrder: article?.sortOrder ?? 0,
    },
  })
  const { blocker, afterSave } = useContentNavigationGuard(
    form.formState.isDirty || uploading,
  )
  const submit = form.handleSubmit(async (input) => {
    if (uploading) return
    setError(null)
    setNotice(false)
    if (!input.content.coverImage) {
      setError('Загрузите обложку статьи.')
      return
    }
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
      {(save.data?.content.slug ?? article?.content.slug) && (
        <p className="text-sm break-all text-muted-foreground">
          Адрес статьи: /journal/
          {save.data?.content.slug ?? article?.content.slug}/
        </p>
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
                <ArticleCoverField
                  value={field.value.coverImage}
                  onUploadingChange={setUploading}
                  onChange={(coverImage) =>
                    form.setValue(
                      'content',
                      { ...form.getValues('content'), coverImage },
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                />
                <TextField
                  label="Описание обложки"
                  description="Кратко опишите изображение для людей, использующих экранный диктор."
                  value={field.value.coverAlt}
                  onChange={(event) =>
                    field.onChange({
                      ...field.value,
                      coverAlt: event.target.value,
                    })
                  }
                />
                <div className="grid min-w-0 gap-6 xl:grid-cols-2">
                  <RichTextEditor
                    label="Текст статьи"
                    value={field.value.bodyMarkdown ?? ''}
                    onChange={(value) =>
                      field.onChange({ ...field.value, bodyMarkdown: value })
                    }
                  />
                  <ArticlePreview
                    article={{
                      ...field.value,
                      slug:
                        save.data?.content.slug ?? article?.content.slug ?? '',
                    }}
                  />
                </div>
                <section className="space-y-4 border-t pt-4">
                  <h2 className="text-lg font-semibold">SEO статьи</h2>
                  <SeoFields
                    value={field.value.seo ?? emptyPageSeo}
                    fallback={{
                      title: `${field.value.title} — Юля Валишина`,
                      description: field.value.description,
                      ogImage: ['art', 'landscape'].includes(
                        field.value.coverImage,
                      )
                        ? undefined
                        : field.value.coverImage,
                      ogImageAlt: field.value.coverAlt,
                    }}
                    url={
                      field.value.slug
                        ? `/journal/${field.value.slug}/`
                        : undefined
                    }
                    onChange={(next) =>
                      field.onChange({ ...field.value, seo: next })
                    }
                  />
                </section>
                <details className="space-y-4 border-t pt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Карточки и дополнительные блоки
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
          Статья сохранена в черновике. Нажмите «Опубликовать сохранённое»,
          чтобы обновить сайт.
        </p>
      )}
      <Button
        type="submit"
        disabled={uploading}
        isLoading={save.isPending}
        loadingLabel="Сохраняем"
      >
        Сохранить статью
      </Button>
    </form>
  )
}
