import { useId, type ComponentProps } from 'react'
import { Field, FieldLabel } from './field'
type Props = ComponentProps<'select'> & {
  label: string
  options: Record<string, string>
}
export function SelectField({
  label,
  options,
  id: providedId,
  ...props
}: Props) {
  const generated = useId()
  const id = providedId ?? generated
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        {...props}
        id={id}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  )
}
