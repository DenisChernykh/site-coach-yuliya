import { useId, useRef, type ComponentProps, type ReactNode } from 'react'
import { X } from 'lucide-react'
import {
  Field,
  FieldDescription,
  FieldLabel,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui'

export function ContactInput({
  label,
  value,
  onChange,
  description,
  status,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'id'> & {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  description?: ReactNode
  status?: ReactNode
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  return (
    <Field className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {status}
      </div>
      <InputGroup>
        <InputGroupInput
          {...props}
          ref={input}
          id={id}
          value={value ?? ''}
          aria-describedby={description ? `${id}-description` : undefined}
          onChange={(event) => onChange(event.target.value || null)}
        />
        {value && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label={`Очистить ${label}`}
              onClick={() => {
                onChange(null)
                input.current?.focus()
              }}
            >
              <X aria-hidden="true" />
              Очистить
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      {description && (
        <FieldDescription id={`${id}-description`} className="break-words">
          {description}
        </FieldDescription>
      )}
    </Field>
  )
}
