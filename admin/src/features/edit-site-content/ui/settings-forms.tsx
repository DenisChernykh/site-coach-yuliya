import { HomeSections } from './home-sections'
import { ContactFields } from './contact-fields'
import { isSocialUrl, networks } from '../model/social-networks'
import { useState, type ReactNode } from 'react'
import type { z } from 'zod'
import {
  contactsSchema,
  siteSchema,
  homeSchema,
  faqSchema,
  socialsSchema,
  type ContactDetailsDto,
  type SiteSettingsDto,
  type HomePageDto,
  type FaqItemDto,
  type SocialLinkDto,
} from '@/shared/api'
import { Alert, AlertDescription, Button } from '@/shared/ui'
import { ContentFields } from './content-fields'
import { useContentNavigationGuard } from '../model/use-content-navigation-guard'
import type { ContentValue } from '../model/content-fields'
import { contentError } from '../model/errors'
import {
  useSaveContacts,
  useSaveSite,
  useSaveHome,
  useSaveFaq,
  useSaveSocials,
} from '../model/mutations'

function SettingsForm<T>({
  initial,
  schema,
  onSave,
  pending,
  renderFields,
  wide = false,
}: {
  initial: T
  schema: z.ZodType<T>
  onSave: (input: T) => Promise<unknown>
  pending: boolean
  renderFields?: (
    value: ContentValue,
    onChange: (value: ContentValue) => void,
  ) => ReactNode
  wide?: boolean
}) {
  const [value, setValue] = useState(initial as ContentValue)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { blocker } = useContentNavigationGuard(dirty)
  return (
    <form
      className={`${wide ? 'max-w-5xl' : 'max-w-3xl'} space-y-6`}
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)
        setSaved(false)
        const result = schema.safeParse(value)
        if (!result.success) {
          setError('Проверьте заполненные поля и ссылки.')
          return
        }
        try {
          await onSave(result.data)
          setDirty(false)
          setSaved(true)
        } catch (failure) {
          setError(contentError(failure))
        }
      }}
    >
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
      <fieldset disabled={pending}>
        {(() => {
          const change = (next: ContentValue) => {
            setValue(next)
            setDirty(true)
            setSaved(false)
          }
          return renderFields ? (
            renderFields(value, change)
          ) : (
            <ContentFields value={value} onChange={change} />
          )
        })()}
      </fieldset>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <p role="status" className="text-sm text-muted-foreground">
          Изменения сохранены в черновике. Нажмите «Опубликовать сохранённое»,
          чтобы обновить сайт.
        </p>
      )}
      <Button type="submit" isLoading={pending} loadingLabel="Сохраняем">
        Сохранить изменения
      </Button>
    </form>
  )
}
export function ContactsForm({
  initial,
  socials,
}: {
  initial: ContactDetailsDto
  socials: SocialLinkDto[]
}) {
  const save = useSaveContacts()
  const initialValue = {
    ...initial,
    links: Object.entries(networks).map(([id, label]) => ({
      id: id as SocialLinkDto['id'],
      label,
      url:
        socials.find((link) => link.id === id)?.url ??
        (id === 'telegram' ? initial.telegramUrl : null),
    })),
  }
  return (
    <SettingsForm
      initial={initialValue}
      renderFields={(value, onChange) => (
        <ContactFields
          value={value}
          onChange={onChange}
          savedLinks={initialValue.links}
        />
      )}
      schema={contactsSchema.refine(
        ({ links, telegramUrl }) =>
          (telegramUrl === null || isSocialUrl(telegramUrl)) &&
          (!links ||
            links.every((link) => link.url === null || isSocialUrl(link.url))),
      )}
      onSave={save.mutateAsync}
      pending={save.isPending}
    />
  )
}
export function SiteForm({ initial }: { initial: SiteSettingsDto }) {
  const save = useSaveSite()
  return (
    <SettingsForm
      initial={initial}
      schema={siteSchema}
      onSave={save.mutateAsync}
      pending={save.isPending}
    />
  )
}
export function HomeForm({ initial }: { initial: HomePageDto }) {
  const save = useSaveHome()
  return (
    <SettingsForm
      initial={initial}
      schema={homeSchema}
      wide
      renderFields={(value, onChange) => (
        <HomeSections value={value} onChange={onChange} />
      )}
      onSave={save.mutateAsync}
      pending={save.isPending}
    />
  )
}
export function FaqForm({ initial }: { initial: FaqItemDto[] }) {
  const save = useSaveFaq()
  return (
    <SettingsForm
      initial={{ items: initial }}
      schema={faqSchema}
      onSave={({ items }) => save.mutateAsync(items)}
      pending={save.isPending}
    />
  )
}
export function SocialsForm({ initial }: { initial: SocialLinkDto[] }) {
  const save = useSaveSocials()
  return (
    <SettingsForm
      initial={{ links: initial }}
      schema={socialsSchema}
      onSave={({ links }) => save.mutateAsync(links)}
      pending={save.isPending}
    />
  )
}
