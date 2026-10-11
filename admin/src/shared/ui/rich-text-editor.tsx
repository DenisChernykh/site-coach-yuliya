import { lazy, Suspense } from 'react'
const Editor = lazy(async () => ({
  default: (await import('./rich-text-editor-implementation'))
    .RichTextEditorImplementation,
}))
export function RichTextEditor(props: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <Suspense fallback={<p>Загружаем редактор…</p>}>
      <Editor {...props} />
    </Suspense>
  )
}
