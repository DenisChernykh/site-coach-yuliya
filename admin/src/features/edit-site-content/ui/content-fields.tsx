import { useId } from 'react'
import {
  Button,
  Field,
  FieldLabel,
  SelectField,
  TextField,
  TextareaField,
} from '@/shared/ui'
import {
  blankItem,
  itemTemplates,
  labelFor,
  type ContentValue,
} from '../model/content-fields'
type Props = {
  value: ContentValue
  onChange: (value: ContentValue) => void
  field?: string
  lockedId?: boolean
}
const longFields = new Set([
  'description',
  'intro',
  'summary',
  'quote',
  'quoteNote',
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
export function ContentFields({
  value,
  onChange,
  field = '',
  lockedId = false,
}: Props) {
  const id = useId()
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
              {labelFor(field)} {index + 1}
            </summary>
            <ContentFields
              value={item}
              onChange={(next) =>
                onChange(
                  value.map((current, i) => (i === index ? next : current)),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              Удалить пункт
            </Button>
          </details>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...value,
              structuredClone(
                itemTemplates[field] ?? blankItem(value[0] ?? ''),
              ),
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
        {Object.entries(value).map(([key, child]) => (
          <ContentFields
            key={key}
            field={key}
            value={child}
            lockedId={lockedId}
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
  if (field === 'topic')
    return (
      <SelectField
        label="Тема"
        options={{
          'finding-work': 'Поиск своего дела',
          'showing-up': 'Проявленность',
        }}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  const help =
    field === 'slug' || field === 'id'
      ? 'Латинские буквы, цифры и дефисы.'
      : field === 'coverImage'
        ? 'Встроенные обложки: art или landscape. Можно указать https:// ссылку или путь /images/…'
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
      readOnly={lockedId && field === 'id'}
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
