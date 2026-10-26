import { useId } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { ContentImageField } from './content-image-field'
import { ArticleCoverField } from './article-cover-field'
import { reorderStoryItem } from '../model/story-upload'
import {
  Button,
  Field,
  FieldLabel,
  TextField,
  TextareaField,
} from '@/shared/ui'
import {
  blankItem,
  itemTemplates,
  labelFor,
  navigationLinkDescription,
  type ContentValue,
} from '../model/content-fields'
type Props = {
  value: ContentValue
  onChange: (value: ContentValue) => void
  field?: string
  onUploadingChange?: (busy: boolean) => void
}
const orderedFields = [
  'id',
  'name',
  'profession',
  'title',
  'eyebrow',
  'description',
  'headingLines',
  'meetingNote',
  'paragraphs',
  'quote',
  'steps',
  'request',
  'exploration',
  'result',
  'details',
  'price',
  'priceNote',
  'features',
  'question',
  'answer',
  'email',
  'phone',
  'address',
  'actionLabel',
]
const fieldOrder = (key: string) =>
  orderedFields.includes(key)
    ? orderedFields.indexOf(key)
    : orderedFields.length
const longFields = new Set([
  'description',
  'intro',
  'summary',
  'quote',
  'quoteNote',
  'review',
  'answer',
  'body',
  'text',
  'ctaDescription',
  'previewDescription',
  'listingDescription',
])
const nullableFields = new Set([
  'email',
  'phone',
  'address',
  'telegramUrl',
  'url',
])
function newItem(template: ContentValue): ContentValue {
  const item = structuredClone(template)
  if (item && typeof item === 'object' && !Array.isArray(item) && 'id' in item)
    item.id = crypto.randomUUID()
  return item
}

export function ContentFields({
  value,
  onChange,
  field = '',
  onUploadingChange,
}: Props) {
  const id = useId()
  if (field === 'id') return null
  if (Array.isArray(value)) {
    const objectItems =
      value.some((item) => item !== null && typeof item === 'object') ||
      field in itemTemplates
    if (!objectItems)
      return (
        <TextareaField
          label={labelFor(field)}
          description="Каждый пункт или абзац — с новой строки."
          rows={Math.max(3, Math.min(8, value.length + 1))}
          value={value.join('\n')}
          onChange={(event) =>
            onChange(
              event.target.value === '' ? [] : event.target.value.split('\n'),
            )
          }
        />
      )
    return (
      <fieldset className="space-y-4 border-t pt-4">
        <legend className="pr-2 text-sm font-semibold">
          {labelFor(field)}
        </legend>
        {value.map((item, index) => (
          <details className="space-y-3 border-l pl-4" key={index} open>
            <summary className="mb-3 cursor-pointer text-sm">
              {item && typeof item === 'object' && !Array.isArray(item)
                ? String(
                    item.title ||
                      item.question ||
                      item.label ||
                      `${labelFor(field)} ${index + 1}`,
                  )
                : `${labelFor(field)} ${index + 1}`}
            </summary>
            <ContentFields
              value={
                item &&
                typeof item === 'object' &&
                !Array.isArray(item) &&
                itemTemplates[field]
                  ? {
                      ...(itemTemplates[field] as Record<string, ContentValue>),
                      ...item,
                      ...(field === 'caseStudies'
                        ? { enabled: item.enabled ?? true }
                        : {}),
                    }
                  : item
              }
              onUploadingChange={onUploadingChange}
              onChange={(next) =>
                onChange(
                  value.map((current, i) => (i === index ? next : current)),
                )
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Поднять пункт ${index + 1}`}
                disabled={index === 0}
                onClick={() => onChange(reorderStoryItem(value, index, -1))}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Опустить пункт ${index + 1}`}
                disabled={index === value.length - 1}
                onClick={() => onChange(reorderStoryItem(value, index, 1))}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Удалить пункт
              </Button>
            </div>
          </details>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...value,
              newItem(itemTemplates[field] ?? blankItem(value[0] ?? '')),
            ])
          }
        >
          Добавить пункт
        </Button>
      </fieldset>
    )
  }
  if (value !== null && typeof value === 'object')
    return (
      <div className="space-y-4">
        {Object.entries(value)
          .sort(([a], [b]) => fieldOrder(a) - fieldOrder(b))
          .map(([key, child]) => (
            <ContentFields
              key={key}
              field={key}
              onUploadingChange={onUploadingChange}
              value={child}
              onChange={(next) => onChange({ ...value, [key]: next })}
            />
          ))}
      </div>
    )
  if (typeof value === 'boolean')
    return (
      <Field>
        <FieldLabel htmlFor={id} className="flex items-center gap-3">
          <input
            id={id}
            type="checkbox"
            className="size-4 accent-primary"
            checked={value}
            onChange={(event) => onChange(event.target.checked)}
          />
          {labelFor(field)}
        </FieldLabel>
      </Field>
    )
  if (field === 'coverImage')
    return (
      <ArticleCoverField
        value={String(value ?? '')}
        onChange={onChange}
        onUploadingChange={onUploadingChange ?? (() => undefined)}
      />
    )
  if (['image', 'reviewImage', 'ogImage', 'defaultImage'].includes(field))
    return (
      <ContentImageField
        value={String(value ?? '')}
        label={labelFor(field)}
        onChange={onChange}
        onUploadingChange={onUploadingChange}
        clearable={field !== 'defaultImage'}
      />
    )
  const help =
    field === 'href'
      ? navigationLinkDescription(String(value ?? ''))
      : field === 'slug' || field === 'id'
        ? 'Латинские буквы, цифры и дефисы.'
        : undefined
  return longFields.has(field) ? (
    <TextareaField
      label={labelFor(field)}
      rows={4}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.target.value)}
    />
  ) : (
    <TextField
      label={labelFor(field)}
      description={help}
      type={
        typeof value === 'number'
          ? 'number'
          : field === 'email'
            ? 'email'
            : 'text'
      }
      min={typeof value === 'number' ? 0 : undefined}
      value={value === null ? '' : String(value)}
      onChange={(event) =>
        onChange(
          typeof value === 'number'
            ? Number(event.target.value)
            : event.target.value === '' && nullableFields.has(field)
              ? null
              : event.target.value,
        )
      }
    />
  )
}
