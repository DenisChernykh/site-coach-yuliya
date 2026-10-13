import {
  useContacts,
  useSite,
  useSeo,
  useHome,
  useFaq,
  useSocials,
} from '@/entities/site-content'
import {
  ContactsForm,
  SiteForm,
  SeoForm,
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
  const socials = useSocials()
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Контакты и социальные сети</h1>
      {query.isPending || socials.isPending ? (
        <p>Загружаем…</p>
      ) : query.isError || socials.isError ? (
        failure
      ) : (
        <ContactsForm initial={query.data!} socials={socials.data!} />
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
export function SeoPage() {
  const query = useSeo()
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">SEO</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Заголовки и описания для поиска, превью ссылок и индексация. После
        сохранения сайт обновляется через очередь публикации.
      </p>
      {query.isPending ? (
        <p>Загружаем…</p>
      ) : query.isError ? (
        failure
      ) : (
        <SeoForm initial={query.data} />
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
