import type { ContactDetailsDto, SocialLinkDto } from '@/shared/api'
import { Check, ExternalLink } from 'lucide-react'
import { Badge } from '@/shared/ui'
import { ContactInput } from './contact-input'

import {
  isSocialUrl,
  networkExamples,
  networks,
} from '../model/social-networks'

type ContactContent = ContactDetailsDto & { links: SocialLinkDto[] }

export function ContactFields({
  value,
  onChange,
  savedLinks,
  wide = false,
}: {
  value: ContactContent
  onChange: (value: ContactContent) => void
  savedLinks: SocialLinkDto[]
  wide?: boolean
}) {
  const links = value.links
  const filledLinks = links.filter((link) => isSocialUrl(link.url))
  return (
    <div className="space-y-8">
      <div className={wide ? 'grid gap-4 md:grid-cols-3' : 'space-y-4'}>
        {(['email', 'phone', 'address'] as const).map((field) => (
          <ContactInput
            key={field}
            label={
              { email: 'Email', phone: 'Телефон', address: 'Адрес' }[field]
            }
            type={
              field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'
            }
            maxLength={{ email: 254, phone: 80, address: 500 }[field]}
            value={value[field]}
            onChange={(next) => onChange({ ...value, [field]: next })}
          />
        ))}
      </div>
      <fieldset className="space-y-4 border-t pt-5">
        <legend className="pr-2 text-base font-medium">
          Социальные сети и мессенджеры
        </legend>
        <p className="text-sm text-muted-foreground">
          Вставьте полную ссылку с https://, а не только имя пользователя или
          номер телефона. Пустые ссылки на сайте не выводятся. Изменения
          появятся после публикации черновика и обновления сайта.
        </p>
        <div className="space-y-2 border-l-2 border-primary bg-muted/40 p-3">
          <p role="status" className="text-sm font-medium">
            Заполнено ссылок: {filledLinks.length} из {links.length}
          </p>
          {filledLinks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Предпросмотр ссылок для вывода на сайте:
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {filledLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
                    aria-label={`Открыть ссылку ${networks[link.id]}`}
                  >
                    {networks[link.id]}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Добавьте ссылку, чтобы включить соцсеть в вывод на сайте.
            </p>
          )}
        </div>
        <div className={wide ? 'grid gap-5 md:grid-cols-2' : 'grid gap-4'}>
          {links.map((link) => {
            const valid = isSocialUrl(link.url)
            const changed =
              (savedLinks.find((saved) => saved.id === link.id)?.url ??
                null) !== link.url
            const invalid = Boolean(link.url) && !valid
            return (
              <ContactInput
                key={link.id}
                label={networks[link.id]}
                type="url"
                placeholder={networkExamples[link.id]}
                maxLength={link.id === 'telegram' ? 500 : 10000}
                pattern="https://.+"
                aria-invalid={invalid || undefined}
                description={
                  <>
                    {invalid && (
                      <span className="block text-destructive">
                        Укажите полную ссылку с https:// и адресом сайта.
                      </span>
                    )}
                    Пример: {networkExamples[link.id]}
                    {link.id === 'whatsapp' && (
                      <span className="block">
                        Номер с кодом страны, без +, пробелов и скобок.
                      </span>
                    )}
                    {(link.id === 'max' || link.id === 'viber') && (
                      <span className="block">
                        Скопируйте ссылку целиком через «Поделиться» в
                        приложении.
                      </span>
                    )}
                  </>
                }
                status={
                  <Badge
                    variant={invalid ? 'destructive' : 'outline'}
                    className={
                      invalid
                        ? undefined
                        : changed
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : valid
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                            : 'text-muted-foreground'
                    }
                  >
                    {valid && !changed && <Check aria-hidden="true" />}
                    {invalid
                      ? 'Проверьте ссылку'
                      : changed
                        ? link.url
                          ? 'Не сохранено'
                          : 'Будет скрыто'
                        : valid
                          ? 'Вывод включён'
                          : 'Не выводится'}
                  </Badge>
                }
                value={link.url}
                onChange={(url) => {
                  onChange({
                    ...value,
                    ...(link.id === 'telegram' ? { telegramUrl: url } : {}),
                    links: links.map((item) =>
                      item.id === link.id ? { ...item, url } : item,
                    ),
                  })
                }}
              />
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
