import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { useEffect, useState } from 'react'
import { Button } from './button'
import { TextField } from './text-field'

export function RichTextEditorImplementation({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const [link, setLink] = useState('')
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: false },
      }),
      Markdown,
    ],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': label,
        'aria-multiline': 'true',
        class: 'article-editor min-h-80 px-5 py-4 outline-none',
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getMarkdown()),
  })
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive('bold'),
            italic: current.isActive('italic'),
            heading: current.isActive('heading', { level: 2 }),
            bullet: current.isActive('bulletList'),
            ordered: current.isActive('orderedList'),
            quote: current.isActive('blockquote'),
          }
        : null,
  })
  useEffect(() => {
    if (editor && value !== editor.getMarkdown()) {
      editor.commands.setContent(value, {
        contentType: 'markdown',
        emitUpdate: false,
      })
    }
  }, [editor, value])
  if (!editor) return <p>Загружаем редактор…</p>
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="overflow-hidden rounded-md border">
        <div
          className="flex flex-wrap gap-1 border-b bg-muted/40 p-2"
          role="toolbar"
          aria-label="Форматирование статьи"
        >
          <Button
            type="button"
            variant={state?.bold ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={state?.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            Жирный
          </Button>
          <Button
            type="button"
            variant={state?.italic ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={state?.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            Курсив
          </Button>
          <Button
            type="button"
            variant={state?.heading ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={state?.heading}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            Заголовок
          </Button>
          <Button
            type="button"
            variant={state?.bullet ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={state?.bullet}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Список
          </Button>
          <Button
            type="button"
            variant={state?.ordered ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={state?.ordered}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            Нумерация
          </Button>
          <Button
            type="button"
            variant={state?.quote ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={state?.quote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            Цитата
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
          >
            Отменить
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
          >
            Повторить
          </Button>
        </div>
        <EditorContent editor={editor} />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <TextField
            label="Ссылка для выделенного текста"
            placeholder="https://…"
            value={link}
            onChange={(event) => setLink(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!/^https:\/\/\S+$/u.test(link)}
          onClick={() => {
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: link })
              .run()
            setLink('')
          }}
        >
          Добавить ссылку
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          Убрать ссылку
        </Button>
      </div>
    </div>
  )
}
