import { useCallback, useEffect, useRef, useState } from 'react'
import { useCms } from '@/entities/site-content'
import type {
  ArticleDto,
  CmsDocumentDto,
  CmsPageContentDto,
} from '@/shared/api'
import { Button } from '@/shared/ui'

export function CmsPreview({
  content,
  page,
  article,
}: {
  content: CmsDocumentDto
  page: string
  article?: ArticleDto
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [mobile, setMobile] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const sequence = useRef(0)
  const url = new URL(
    import.meta.env.VITE_CMS_PREVIEW_URL ||
      (import.meta.env.DEV
        ? 'http://127.0.0.1:4321/cms-preview/'
        : '/cms-preview/'),
    window.location.origin,
  )
  const origin = url.origin
  const value = useRef({ content, page, article })
  useEffect(() => {
    value.current = { content, page, article }
  }, [content, page, article])
  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: 'cms:document', ...value.current, sequence: ++sequence.current },
      origin,
    )
  }, [origin])
  useEffect(() => {
    const timeout = window.setTimeout(() => setError(true), 10000)
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== origin ||
        event.source !== frame.current?.contentWindow
      )
        return
      if (event.data?.type === 'cms:ready') {
        window.clearTimeout(timeout)
        setReady(true)
        setError(false)
        send()
      }
      if (
        event.data?.type === 'cms:rendered' &&
        event.data.sequence === sequence.current
      )
        setError(false)
    }
    window.addEventListener('message', receive)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('message', receive)
    }
  }, [origin, send])
  useEffect(() => {
    if (!ready) return
    const timeout = window.setTimeout(send, 200)
    return () => window.clearTimeout(timeout)
  }, [content, page, article, ready, send])
  return (
    <section className="min-w-0 space-y-3" aria-label="Превью страницы">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Изменения видны здесь до сохранения
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={!mobile ? 'secondary' : 'ghost'}
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
          >
            По ширине окна
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mobile ? 'secondary' : 'ghost'}
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
          >
            Телефон
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm">
          Не удалось открыть превью. Сохраните черновик и проверьте соединение с
          сайтом.
        </p>
      )}
      <div className="flex justify-start overflow-auto rounded-lg border bg-muted p-2 xl:justify-center">
        <iframe
          ref={frame}
          title="Предпросмотр сайта Юлии"
          src={url.href}
          referrerPolicy="origin"
          onLoad={() => {
            if (ready) send()
          }}
          style={{
            width: mobile ? 390 : '100%',
            minWidth: mobile ? 390 : undefined,
          }}
          className="h-[72svh] min-h-96 border-0 bg-white"
        />
      </div>
    </section>
  )
}
export function ArticlePreview({ article }: { article: ArticleDto }) {
  const query = useCms()
  return query.data ? (
    <CmsPreview content={query.data.content} page="article" article={article} />
  ) : (
    <p className="text-sm text-muted-foreground">Загружаем превью…</p>
  )
}
export function PagePreview({
  content,
  page,
}: {
  content: CmsPageContentDto
  page: string
}) {
  const query = useCms()
  return query.data ? (
    <CmsPreview content={{ ...query.data.content, ...content }} page={page} />
  ) : null
}
