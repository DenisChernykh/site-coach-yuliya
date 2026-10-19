import { useEffect, useState } from 'react'
import { useBlocker, useSearchParams } from 'react-router'
import { Tabs } from '@base-ui/react/tabs'
import { FileText, Settings, ContactRound, CirclePlay } from 'lucide-react'
import { useCms } from '@/entities/site-content'
import {
  ContentFields,
  StoriesEditor,
  ContactFields,
  contactLinks,
  isSocialUrl,
  CmsPreview,
  useCmsActions,
  contentError,
  type ContentValue,
} from '@/features/edit-site-content'
import {
  cmsDraftSchema,
  isProblemCode,
  type CmsBlockDto,
  type CmsDocumentDto,
  type CmsPageContentDto,
  type CmsWorkspaceDto,
} from '@/shared/api'
import {
  Alert,
  AlertDescription,
  Button,
  TextField,
  TextareaField,
} from '@/shared/ui'
import { blockLabels } from '../model/section-labels'
import { SectionList } from './section-list'

const pageLabels = {
  home: 'Главная',
  about: 'Обо мне',
  coaching: 'Коучинг',
  contacts: 'Контакты',
  journal: 'Журнал',
} as const
const homeFields: Record<string, keyof CmsPageContentDto['home']> = {
  hero: 'hero',
  concerns: 'concerns',
  about: 'about',
  approach: 'approach',
  process: 'process',
  cases: 'caseStudies',
  art: 'artPractice',
  products: 'products',
}
function PageEditor({ initial }: { initial: CmsWorkspaceDto }) {
  const source = useCms()
  const [params] = useSearchParams()
  const initialPage =
    initial.content.pages.find((p) => p.key === params.get('page')) ??
    initial.content.pages.find((p) => p.key === 'home')!
  const initialSection =
    initialPage.blocks.find((b) => b.id === params.get('section'))?.id ?? 'hero'
  const initialSettings =
    params.get('settings') === 'stories'
      ? 'stories'
      : params.get('settings') === 'site'
        ? 'site'
        : params.get('settings') === 'contacts'
          ? 'contacts'
          : null
  const [snapshot, setSnapshot] = useState(initial)
  const [content, setContent] = useState<CmsDocumentDto>(initial.content)
  const [page, setPage] = useState<keyof typeof pageLabels>(initialPage.key)
  const [selected, setSelected] = useState(initialSection)
  const [global, setGlobal] = useState<'site' | 'contacts' | 'stories' | null>(
    initialSettings,
  )
  const [expanded, setExpanded] = useState(false)
  const [panel, setPanel] = useState<'pages' | 'blocks' | 'fields' | 'preview'>(
    initialSettings || params.has('section') ? 'fields' : 'pages',
  )
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { save, publish, pending } = useCmsActions()
  const blocker = useBlocker(dirty)
  const links = contactLinks(content.contacts, content.socials)
  const savedLinks = contactLinks(
    snapshot.content.contacts,
    snapshot.content.socials,
  )
  const contactFields = (
    <ContactFields
      wide={global === 'contacts'}
      value={{ ...content.contacts, links }}
      savedLinks={savedLinks}
      onChange={(next) => {
        const { links: socials, ...contacts } = next
        change({
          ...content,
          contacts: {
            ...contacts,
            telegramUrl:
              socials.find((link) => link.id === 'telegram')?.url ?? null,
          },
          socials,
        })
      }}
    />
  )
  useEffect(() => {
    if (!dirty) return
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', prevent)
    return () => window.removeEventListener('beforeunload', prevent)
  }, [dirty])
  const current = content.pages.find((p) => p.key === page)!
  const block =
    current.blocks.find((b) => b.id === selected) ?? current.blocks[0]!
  function change(next: CmsDocumentDto) {
    setContent(next)
    setDirty(true)
    setNotice('')
    setError('')
    setConflict(false)
  }
  function blocks(next: CmsBlockDto[]) {
    change({
      ...content,
      pages: content.pages.map((p) =>
        p.key === page ? { ...p, blocks: next } : p,
      ),
    })
  }
  async function saveDraft() {
    const parsed = cmsDraftSchema.safeParse({
      revision: snapshot.revision,
      content: {
        site: content.site,
        contacts: content.contacts,
        home: content.home,
        faq: content.faq,
        socials: content.socials,
        pages: content.pages,
      },
    })
    if (
      !parsed.success ||
      (content.contacts.telegramUrl !== null &&
        !isSocialUrl(content.contacts.telegramUrl)) ||
      content.socials.some(
        (link) => link.url !== null && !isSocialUrl(link.url),
      )
    ) {
      setError('Проверьте заполненные поля и ссылки.')
      return
    }
    try {
      const result = await save.mutateAsync(parsed.data)
      setSnapshot(result)
      setContent(result.content)
      setDirty(false)
      setNotice('Черновик сохранён. На сайте пока прежняя версия.')
    } catch (failure) {
      setConflict(isProblemCode(failure, 'CONFLICT'))
      setError(
        isProblemCode(failure, 'CONFLICT')
          ? 'Черновик изменён в другой вкладке. Ваши правки остались в форме. Скопируйте их и загрузите свежий черновик.'
          : contentError(failure),
      )
    }
  }
  const field =
    !global &&
    (page === 'home'
      ? homeFields[block.id]
      : page === 'about' && ['hero', 'history'].includes(block.id)
        ? 'about'
        : block.id === 'approach'
          ? 'approach'
          : block.id === 'process'
            ? 'process'
            : undefined)
  const heading = global
    ? {
        site: 'Настройки сайта',
        contacts: 'Контакты и социальные сети',
        stories: 'Сторис',
      }[global]
    : blockLabels[block.id]
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Редактор сайта</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dirty
              ? 'Есть несохранённые изменения'
              : snapshot.revision === snapshot.publishedRevision
                ? 'Контент передан в публикацию'
                : 'Есть сохранённый черновик'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!dirty || pending || uploading}
            onClick={saveDraft}
          >
            Сохранить черновик
          </Button>
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Вернуться к редактированию' : 'Предпросмотр'}
          </Button>
          <Button
            disabled={
              dirty ||
              uploading ||
              pending ||
              snapshot.revision === snapshot.publishedRevision
            }
            onClick={async () => {
              try {
                const result = await publish.mutateAsync(snapshot.revision)
                setSnapshot(result)
                setNotice(
                  'Публикация поставлена в очередь. Дождитесь успешного обновления сайта.',
                )
              } catch (failure) {
                setError(contentError(failure))
              }
            }}
          >
            Опубликовать
          </Button>
        </div>
      </div>
      {blocker.state === 'blocked' && (
        <Alert>
          <AlertDescription>
            Есть несохранённые изменения.
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={() => blocker.reset()}>
                Продолжить редактирование
              </Button>
              <Button variant="destructive" onClick={() => blocker.proceed()}>
                Уйти без сохранения
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            {conflict && (
              <Button
                variant="outline"
                className="mt-3"
                onClick={async () => {
                  if (
                    !window.confirm(
                      'Заменить несохранённые правки сохранённым черновиком?',
                    )
                  )
                    return
                  const result = await source.refetch()
                  if (result.data) {
                    setSnapshot(result.data)
                    setContent(result.data.content)
                    setDirty(false)
                    setError('')
                    setConflict(false)
                    setNotice('Загружен свежий черновик.')
                  }
                }}
              >
                Загрузить свежий черновик
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <Tabs.Root
        value={global ?? 'pages'}
        onValueChange={(value) => {
          if (uploading) return
          if (value === 'pages') setGlobal(null)
          else if (value === 'site' || value === 'contacts') setGlobal(value)
          else if (value === 'stories') {
            setGlobal('stories')
            setPage('home')
          }
        }}
        className="min-w-0 space-y-5"
      >
        {!expanded && (
          <Tabs.List
            aria-label="Разделы редактора сайта"
            className="flex flex-wrap gap-x-2 border-b"
          >
            {(
              [
                ['pages', 'Страницы', FileText],
                ['stories', 'Сторис', CirclePlay],
                ['site', 'Настройки сайта', Settings],
                ['contacts', 'Контакты и соцсети', ContactRound],
              ] as const
            ).map(([key, label, Icon]) => (
              <Tabs.Tab
                key={key}
                value={key}
                className="inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:border-primary data-active:text-foreground"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        )}
        {expanded ? (
          <CmsPreview content={content} page={page} />
        ) : (
          <>
            <Tabs.Panel value="pages" className="min-w-0 space-y-5">
              <nav
                aria-label="Панели редактора"
                className="flex flex-wrap gap-1 xl:hidden"
              >
                {Object.entries({
                  pages: 'Страницы',
                  blocks: 'Секции',
                  fields: 'Правки',
                  preview: 'Превью',
                }).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={panel === key ? 'secondary' : 'ghost'}
                    aria-pressed={panel === key}
                    onClick={() => setPanel(key as typeof panel)}
                  >
                    {label}
                  </Button>
                ))}
              </nav>
              <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
                <aside
                  className={
                    'space-y-5 rounded-lg border p-3' +
                    (panel === 'pages' || panel === 'blocks'
                      ? ''
                      : ' hidden xl:block')
                  }
                >
                  <nav
                    aria-label="Страницы сайта"
                    className={
                      panel === 'pages' ? 'grid gap-1' : 'hidden gap-1 xl:grid'
                    }
                  >
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                      СТРАНИЦЫ
                    </p>
                    {Object.entries(pageLabels).map(([key, label]) => (
                      <Button
                        key={key}
                        variant={page === key ? 'secondary' : 'ghost'}
                        className="justify-start"
                        aria-current={page === key ? 'page' : undefined}
                        onClick={() => {
                          setPage(key as keyof typeof pageLabels)
                          setSelected('hero')
                          setPanel('blocks')
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </nav>
                  <nav
                    aria-label="Секции страницы"
                    className={
                      panel === 'blocks' ? 'grid gap-2' : 'hidden gap-2 xl:grid'
                    }
                  >
                    <p className="px-2 text-xs font-semibold text-muted-foreground">
                      СЕКЦИИ
                    </p>
                    <p className="px-2 text-xs leading-relaxed text-muted-foreground">
                      Перетаскивайте за ⋮⋮. Переключатель скрывает секцию.
                    </p>
                    <SectionList
                      key={page}
                      blocks={current.blocks}
                      selected={selected}
                      pending={pending}
                      onSelect={(id) => {
                        setSelected(id)
                        setPanel('fields')
                      }}
                      onChange={blocks}
                    />
                  </nav>
                </aside>
                <div
                  className={
                    panel === 'preview' ? 'min-w-0' : 'hidden min-w-0 xl:block'
                  }
                >
                  <CmsPreview content={content} page={page} />
                </div>
                <aside
                  className={
                    'min-w-0 space-y-5 rounded-lg border p-4' +
                    (panel === 'fields' ? '' : ' hidden xl:block')
                  }
                >
                  <h2 className="text-lg font-semibold">{heading}</h2>
                  {!block.enabled && (
                    <p className="text-sm text-muted-foreground">
                      Секция скрыта. Её содержимое сохранится.
                    </p>
                  )}
                  <fieldset disabled={pending} className="min-w-0 space-y-5">
                    {field ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Общие тексты обновятся на всех страницах, где
                          используются.
                        </p>
                        <ContentFields
                          key={page + '-' + field}
                          value={content.home[field] as unknown as ContentValue}
                          field={field}
                          onChange={(next) =>
                            change({
                              ...content,
                              home: { ...content.home, [field]: next },
                            })
                          }
                        />
                      </>
                    ) : block.id === 'stories' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Обложки, фото, видео и порядок слайдов.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setGlobal('stories')
                            setPage('home')
                          }}
                        >
                          Редактировать сторис
                        </Button>
                        <TextField
                          label="Заголовок секции"
                          value={block.title ?? ''}
                          placeholder="Знакомство в историях"
                          onChange={(event) =>
                            blocks(
                              current.blocks.map((item) =>
                                item.id === block.id
                                  ? { ...item, title: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                    ) : block.id === 'faq' ? (
                      <ContentFields
                        value={content.faq as unknown as ContentValue}
                        field="items"
                        onChange={(next) =>
                          change({
                            ...content,
                            faq: next as unknown as CmsDocumentDto['faq'],
                          })
                        }
                      />
                    ) : block.id === 'details' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Контакты и ссылки общие для всех страниц сайта.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setGlobal('contacts')}
                        >
                          Открыть контакты и соцсети
                        </Button>
                      </div>
                    ) : (
                      <>
                        <TextField
                          label="Заголовок секции"
                          placeholder="Текущий заголовок"
                          value={block.title ?? ''}
                          onChange={(e) =>
                            blocks(
                              current.blocks.map((b) =>
                                b.id === block.id
                                  ? { ...b, title: e.target.value }
                                  : b,
                              ),
                            )
                          }
                        />
                        <TextField
                          label="Подпись над заголовком"
                          value={block.eyebrow ?? ''}
                          onChange={(e) =>
                            blocks(
                              current.blocks.map((b) =>
                                b.id === block.id
                                  ? { ...b, eyebrow: e.target.value }
                                  : b,
                              ),
                            )
                          }
                        />
                        {block.id === 'hero' && (
                          <TextareaField
                            label="Описание"
                            value={block.description ?? ''}
                            onChange={(e) =>
                              blocks(
                                current.blocks.map((b) =>
                                  b.id === block.id
                                    ? { ...b, description: e.target.value }
                                    : b,
                                ),
                              )
                            }
                          />
                        )}
                        {block.id === 'pricing' && (
                          <p className="text-sm text-muted-foreground">
                            Форматы и стоимость редактируются в разделе
                            «Программы».
                          </p>
                        )}
                        {block.id === 'articles' && (
                          <p className="text-sm text-muted-foreground">
                            Тексты и порядок статей редактируются в разделе
                            «Статьи».
                          </p>
                        )}
                      </>
                    )}
                  </fieldset>
                </aside>
              </div>
            </Tabs.Panel>
            <Tabs.Panel value="stories" className="min-w-0">
              <div className="max-w-5xl py-2">
                <StoriesEditor
                  value={content.home.stories ?? []}
                  disabled={pending}
                  onUploadingChange={setUploading}
                  onChange={(stories) =>
                    change({ ...content, home: { ...content.home, stories } })
                  }
                />
                <p className="mt-6 text-sm text-muted-foreground">
                  Проверьте результат кнопкой «Предпросмотр», затем сохраните
                  черновик и опубликуйте.
                </p>
              </div>
            </Tabs.Panel>
            <Tabs.Panel value="site" className="min-w-0">
              <div className="max-w-4xl space-y-6 py-2">
                <div>
                  <h2 className="text-lg font-semibold">Настройки сайта</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Имя, описание и меню используются на всём сайте.
                  </p>
                </div>
                <fieldset disabled={pending} className="min-w-0">
                  <ContentFields
                    value={content.site as unknown as ContentValue}
                    onChange={(next) =>
                      change({
                        ...content,
                        site: next as unknown as CmsDocumentDto['site'],
                      })
                    }
                  />
                </fieldset>
              </div>
            </Tabs.Panel>
            <Tabs.Panel value="contacts" className="min-w-0">
              <div className="max-w-5xl space-y-6 py-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    Контакты и социальные сети
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Контактные данные и ссылки используются на всех страницах
                    сайта.
                  </p>
                </div>
                <fieldset disabled={pending} className="min-w-0">
                  {contactFields}
                </fieldset>
              </div>
            </Tabs.Panel>
          </>
        )}
      </Tabs.Root>
    </div>
  )
}
export function SiteEditorPage() {
  const query = useCms()
  if (query.isPending) return <p>Загружаем редактор…</p>
  if (query.isError)
    return <p role="alert">Не удалось загрузить черновик сайта.</p>
  return <PageEditor initial={query.data} />
}
