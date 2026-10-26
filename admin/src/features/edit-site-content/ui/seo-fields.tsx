import { useState } from 'react'
import { Link } from 'react-router'
import type { PageSeoDto, SeoSettingsDto } from '@/shared/api'
import { SelectField, TextField, TextareaField } from '@/shared/ui'
import { ContentImageField } from './content-image-field'
import { firstSeoText } from '../model/seo'

export function SeoFields({
  value,
  onChange,
  fallback,
  url,
  uploading,
  onUploadingChange,
}: {
  value: PageSeoDto
  onChange: (value: PageSeoDto) => void
  fallback?: Partial<PageSeoDto>
  url?: string
  uploading: boolean
  onUploadingChange: (busy: boolean) => void
}) {
  const title = firstSeoText(value.title, fallback?.title, 'Заголовок страницы')
  const description = firstSeoText(
    value.description,
    fallback?.description,
    'Описание страницы',
  )
  return (
    <div className="space-y-5">
      <TextField
        label="SEO-заголовок"
        description={`${value.title.length} из 120 символов. Пустое поле использует заголовок страницы или название сайта.`}
        maxLength={120}
        placeholder={fallback?.title}
        value={value.title}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
      />
      <TextareaField
        label="SEO-описание"
        description={`${value.description.length} из 320 символов. Пустое поле использует описание страницы или сайта.`}
        rows={3}
        maxLength={320}
        placeholder={fallback?.description}
        value={value.description}
        onChange={(event) =>
          onChange({ ...value, description: event.target.value })
        }
      />
      <div
        aria-label="Пример в поиске"
        className="space-y-1 rounded-lg border bg-background p-4"
      >
        <p className="text-xs text-muted-foreground">Пример в поиске</p>
        {url && (
          <p className="text-xs break-all text-muted-foreground">{url}</p>
        )}
        <p className="text-lg font-medium text-primary">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <details className="space-y-4 rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Превью в социальных сетях
        </summary>
        <div className="space-y-4 pt-4">
          <TextField
            label="Заголовок для соцсетей"
            description="Пустое поле использует SEO-заголовок."
            maxLength={120}
            placeholder={title}
            value={value.ogTitle}
            onChange={(event) =>
              onChange({ ...value, ogTitle: event.target.value })
            }
          />
          <TextareaField
            label="Описание для соцсетей"
            description="Пустое поле использует SEO-описание."
            rows={3}
            maxLength={320}
            placeholder={description}
            value={value.ogDescription}
            onChange={(event) =>
              onChange({ ...value, ogDescription: event.target.value })
            }
          />
          <ContentImageField
            label="Изображение для соцсетей"
            fallback={fallback?.ogImage}
            value={value.ogImage}
            onChange={(ogImage) => onChange({ ...value, ogImage })}
            disabled={uploading}
            onUploadingChange={onUploadingChange}
          />
          <TextField
            label="Описание изображения для соцсетей"
            maxLength={300}
            placeholder={fallback?.ogImageAlt}
            value={value.ogImageAlt}
            onChange={(event) =>
              onChange({ ...value, ogImageAlt: event.target.value })
            }
          />
        </div>
      </details>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={value.noIndex}
          onChange={(event) =>
            onChange({ ...value, noIndex: event.target.checked })
          }
        />
        Скрыть эту страницу от поисковых систем
      </label>
    </div>
  )
}

const pages = {
  home: { label: 'Главная', path: '/' },
  about: { label: 'Обо мне', path: '/about/' },
  coaching: { label: 'Коучинг', path: '/coaching/' },
  contacts: { label: 'Контакты', path: '/contacts/' },
  journal: { label: 'Журнал', path: '/journal/' },
  privacy: { label: 'Конфиденциальность', path: '/privacy/' },
} as const

export function SeoSettingsFields({
  value,
  onChange,
  uploading,
  onUploadingChange,
}: {
  value: SeoSettingsDto
  onChange: (value: SeoSettingsDto) => void
  uploading: boolean
  onUploadingChange: (busy: boolean) => void
}) {
  const [page, setPage] = useState<keyof typeof pages>('home')
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Общие настройки</h2>
        <TextField
          label="Название сайта"
          value={value.siteName}
          maxLength={120}
          onChange={(event) =>
            onChange({ ...value, siteName: event.target.value })
          }
        />
        <TextField
          label="Основной адрес сайта"
          value={value.siteUrl ?? ''}
          maxLength={500}
          placeholder="https://ваш-домен.ru"
          description="Домен с https://, без пути. Используется для canonical, ссылок превью и sitemap.xml. До его заполнения сайт закрыт от индексации."
          onChange={(event) =>
            onChange({ ...value, siteUrl: event.target.value.trim() || null })
          }
        />
        <ContentImageField
          label="Общее изображение для соцсетей"
          value={value.defaultImage}
          clearable={false}
          disabled={uploading}
          onUploadingChange={onUploadingChange}
          onChange={(defaultImage) => onChange({ ...value, defaultImage })}
        />
        <TextField
          label="Описание общего изображения"
          value={value.defaultImageAlt}
          maxLength={300}
          onChange={(event) =>
            onChange({ ...value, defaultImageAlt: event.target.value })
          }
        />
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={value.allowIndexing}
            onChange={(event) =>
              onChange({ ...value, allowIndexing: event.target.checked })
            }
          />
          Разрешить индексацию сайта
        </label>
      </section>
      <section className="space-y-5 border-t pt-6">
        <h2 className="text-lg font-semibold">SEO страниц</h2>
        <SelectField
          label="Страница"
          disabled={uploading}
          value={page}
          options={Object.fromEntries(
            Object.entries(pages).map(([key, item]) => [key, item.label]),
          )}
          onChange={(event) =>
            setPage(event.target.value as keyof typeof pages)
          }
        />
        <p className="text-sm text-muted-foreground">{pages[page].path}</p>
        <SeoFields
          key={page}
          uploading={uploading}
          onUploadingChange={onUploadingChange}
          value={value.pages[page]}
          fallback={{
            title: value.siteName,
            ogImage: value.defaultImage,
            ogImageAlt: value.defaultImageAlt,
          }}
          url={
            value.siteUrl
              ? `${value.siteUrl.replace(/\/$/u, '')}${pages[page].path}`
              : undefined
          }
          onChange={(next) =>
            onChange({ ...value, pages: { ...value.pages, [page]: next } })
          }
        />
      </section>
      <p className="text-sm text-muted-foreground">
        SEO отдельных статей редактируется в разделе{' '}
        <Link className="text-primary underline" to="/articles">
          «Статьи»
        </Link>
        .
      </p>
    </div>
  )
}
