import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { useCms } from '@/entities/site-content'
import {
  ContentFields,
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

const pageLabels = {
  home: 'Главная',
  about: 'Обо мне',
  coaching: 'Коучинг',
  contacts: 'Контакты',
  journal: 'Журнал',
} as const
const blockLabels: Record<string, string> = {
  hero: 'Первый экран',
  concerns: 'Запросы',
  about: 'Знакомство',
  approach: 'Подход',
  pricing: 'Форматы и стоимость',
  process: 'Как проходит работа',
  boundaries: 'Границы работы',
  cases: 'Истории',
  art: 'Арт-практика',
  products: 'Другие форматы',
  articles: 'Статьи',
  faq: 'Частые вопросы',
  contact: 'Форма знакомства',
  history: 'Моя история',
  cta: 'Приглашение',
  requests: 'С чем можно прийти',
  details: 'Способы связи',
}
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
  const [snapshot, setSnapshot] = useState(initial)
  const [content, setContent] = useState<CmsDocumentDto>(initial.content)
  const [page, setPage] = useState<keyof typeof pageLabels>('home')
  const [selected, setSelected] = useState('hero')
  const [global, setGlobal] = useState<'site' | 'contacts' | 'socials' | null>(
    null,
  )
  const [expanded, setExpanded] = useState(false)
  const [panel, setPanel] = useState<'pages' | 'blocks' | 'fields' | 'preview'>(
    'pages',
  )
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [dirty, setDirty] = useState(false)
  const { save, publish, pending } = useCmsActions()
  const blocker = useBlocker(dirty)
  const drag = useRef<string | null>(null)
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
  function move(id: string, destination: number) {
    const from = current.blocks.findIndex((b) => b.id === id)
    if (
      from <= 0 ||
      destination <= 0 ||
      destination >= current.blocks.length ||
      from === destination
    )
      return
    const next = [...current.blocks]
    next.splice(destination, 0, ...next.splice(from, 1))
    blocks(next)
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
    if (!parsed.success) {
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
        contacts: 'Контакты',
        socials: 'Социальные сети',
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
            disabled={!dirty || pending}
            onClick={saveDraft}
          >
            Сохранить черновик
          </Button>
          <Button variant="outline" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Вернуться к редактированию' : 'Предпросмотр'}
          </Button>
          <Button
            disabled={
              dirty ||
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
      {!expanded && (
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
      )}
      <div
        className={
          expanded
            ? ''
            : 'grid min-w-0 items-start gap-5 xl:grid-cols-[220px_minmax(0,1fr)_320px]'
        }
      >
        {!expanded && (
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
                  variant={page === key && !global ? 'secondary' : 'ghost'}
                  className="justify-start"
                  aria-current={page === key && !global ? 'page' : undefined}
                  onClick={() => {
                    setPage(key as keyof typeof pageLabels)
                    setSelected('hero')
                    setGlobal(null)
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
              {current.blocks.map((b, i) => (
                <div
                  key={b.id}
                  draggable={i > 0 && !pending}
                  onDragStart={() => {
                    drag.current = b.id
                  }}
                  onDragOver={(e) => {
                    if (i > 0) e.preventDefault()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (drag.current) move(drag.current, i)
                    drag.current = null
                  }}
                  className="rounded-md border p-2"
                >
                  <div className="flex items-start gap-2">
                    <Button
                      size="sm"
                      variant={
                        b.id === selected && !global ? 'secondary' : 'ghost'
                      }
                      className="h-auto min-h-9 flex-1 justify-start text-left whitespace-normal"
                      onClick={() => {
                        setSelected(b.id)
                        setGlobal(null)
                        setPanel('fields')
                      }}
                    >
                      {blockLabels[b.id]}
                    </Button>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label={'Показывать: ' + blockLabels[b.id]}
                      checked={b.enabled}
                      disabled={i === 0 || pending}
                      className="mt-2 size-4 accent-primary"
                      onChange={(e) =>
                        blocks(
                          current.blocks.map((a) =>
                            a.id === b.id
                              ? { ...a, enabled: e.target.checked }
                              : a,
                          ),
                        )
                      }
                    />
                  </div>
                  {i > 0 && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={i === 1 || pending}
                        aria-label={'Выше: ' + blockLabels[b.id]}
                        onClick={() => move(b.id, i - 1)}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={i === current.blocks.length - 1 || pending}
                        aria-label={'Ниже: ' + blockLabels[b.id]}
                        onClick={() => move(b.id, i + 1)}
                      >
                        ↓
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <nav
              aria-label="Общие настройки"
              className={
                panel === 'pages' ? 'grid gap-1' : 'hidden gap-1 xl:grid'
              }
            >
              {(['site', 'contacts', 'socials'] as const).map((key) => (
                <Button
                  key={key}
                  variant={global === key ? 'secondary' : 'ghost'}
                  className="justify-start"
                  onClick={() => {
                    setGlobal(key)
                    setPanel('fields')
                  }}
                >
                  {
                    {
                      site: 'Настройки сайта',
                      contacts: 'Контакты',
                      socials: 'Социальные сети',
                    }[key]
                  }
                </Button>
              ))}
            </nav>
          </aside>
        )}
        <div
          className={
            expanded || panel === 'preview'
              ? 'min-w-0'
              : 'hidden min-w-0 xl:block'
          }
        >
          <CmsPreview content={content} page={page} />
        </div>
        {!expanded && (
          <aside
            className={
              'min-w-0 space-y-5 rounded-lg border p-4' +
              (panel === 'fields' ? '' : ' hidden xl:block')
            }
          >
            <h2 className="text-lg font-semibold">{heading}</h2>
            {!global && !block.enabled && (
              <p className="text-sm text-muted-foreground">
                Секция скрыта. Её содержимое сохранится.
              </p>
            )}
            <fieldset disabled={pending} className="min-w-0 space-y-5">
              {global ? (
                <ContentFields
                  value={content[global] as unknown as ContentValue}
                  onChange={(next) => {
                    const updated = { ...content, [global]: next }
                    if (global === 'contacts')
                      updated.socials = content.socials.map((link) =>
                        link.id === 'telegram'
                          ? { ...link, url: updated.contacts.telegramUrl }
                          : link,
                      )
                    if (global === 'socials')
                      updated.contacts = {
                        ...content.contacts,
                        telegramUrl:
                          updated.socials.find((link) => link.id === 'telegram')
                            ?.url ?? null,
                      }
                    change(updated)
                  }}
                />
              ) : field ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Общие тексты обновятся на всех страницах, где используются.
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
              ) : block.id === 'faq' ? (
                <ContentFields
                  value={content.faq as unknown as ContentValue}
                  field="faq"
                  onChange={(next) =>
                    change({
                      ...content,
                      faq: next as unknown as CmsDocumentDto['faq'],
                    })
                  }
                />
              ) : block.id === 'details' ? (
                <ContentFields
                  value={content.contacts as unknown as ContentValue}
                  onChange={(next) =>
                    change({
                      ...content,
                      contacts: next as unknown as CmsDocumentDto['contacts'],
                    })
                  }
                />
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
                      Форматы и стоимость редактируются в разделе «Программы».
                    </p>
                  )}
                  {block.id === 'articles' && (
                    <p className="text-sm text-muted-foreground">
                      Тексты и порядок статей редактируются в разделе «Статьи».
                    </p>
                  )}
                </>
              )}
            </fieldset>
          </aside>
        )}
      </div>
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
