import {
  useContacts,
  useSite,
  useHome,
  useFaq,
  useSocials,
} from '@/entities/site-content'
import {
  ContactsForm,
  SiteForm,
  HomeForm,
  FaqForm,
  SocialsForm,
} from '@/features/edit-site-content'
import { Alert, AlertDescription } from '@/shared/ui'
const failure = (
  <Alert variant="destructive">
    <AlertDescription>
      Не удалось загрузить данные. Обновите страницу.
    </AlertDescription>
  </Alert>
)
export function ContactsPage() {
  const query = useContacts()
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Контакты</h1>
      {query.isPending ? (
        <p>Загружаем…</p>
      ) : query.isError ? (
        failure
      ) : (
        <ContactsForm initial={query.data} />
      )}
    </section>
  )
}
export function SitePage() {
  const query = useSite()
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Настройки сайта</h1>
      {query.isPending ? (
        <p>Загружаем…</p>
      ) : query.isError ? (
        failure
      ) : (
        <SiteForm initial={query.data} />
      )}
    </section>
  )
}
export function HomePage() {
  const query = useHome()
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Главная страница</h1>
      {query.isPending ? (
        <p>Загружаем…</p>
      ) : query.isError ? (
        failure
      ) : (
        <HomeForm initial={query.data} />
      )}
    </section>
  )
}
export function FaqPage() {
  const query = useFaq()
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Частые вопросы</h1>
      {query.isPending ? (
        <p>Загружаем…</p>
      ) : query.isError ? (
        failure
      ) : (
        <FaqForm initial={query.data} />
      )}
    </section>
  )
}
export function SocialsPage() {
  const query = useSocials()
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Социальные сети</h1>
      {query.isPending ? (
        <p>Загружаем…</p>
      ) : query.isError ? (
        failure
      ) : (
        <SocialsForm initial={query.data} />
      )}
    </section>
  )
}
