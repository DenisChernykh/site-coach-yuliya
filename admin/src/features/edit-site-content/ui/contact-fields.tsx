import type { SocialLinkDto } from '@/shared/api'
import { TextField } from '@/shared/ui'
import type { ContentValue } from '../model/content-fields'
import { ContentFields } from './content-fields'

import { networks } from '../model/social-networks'

export function ContactFields({
  value,
  onChange,
}: {
  value: ContentValue
  onChange: (value: ContentValue) => void
}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const links = value.links as unknown as SocialLinkDto[]
  return (
    <div className="space-y-8">
      <ContentFields
        value={{
          email: value.email,
          phone: value.phone,
          address: value.address,
        }}
        onChange={(next) => onChange({ ...value, ...(next as object) })}
      />
      <fieldset className="space-y-4 border-t pt-5">
        <legend className="pr-2 text-base font-medium">
          Социальные сети и мессенджеры
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map((link) => (
            <TextField
              key={link.id}
              label={networks[link.id]}
              type="url"
              placeholder="https://…"
              value={link.url ?? ''}
              onChange={(event) => {
                const url = event.target.value || null
                onChange({
                  ...value,
                  ...(link.id === 'telegram' ? { telegramUrl: url } : {}),
                  links: links.map((item) =>
                    item.id === link.id ? { ...item, url } : item,
                  ),
                })
              }}
            />
          ))}
        </div>
      </fieldset>
    </div>
  )
}
