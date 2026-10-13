import {
  DragDropProvider,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { move } from '@dnd-kit/helpers'
import { Accessibility, defaultPreset } from '@dnd-kit/dom'
import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers'
import { GripVertical, LockKeyhole } from 'lucide-react'
import type { CmsBlockDto } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui'
import { blockLabels } from '../model/section-labels'

type Props = {
  blocks: CmsBlockDto[]
  selected: string
  pending: boolean
  onSelect: (id: string) => void
  onChange: (blocks: CmsBlockDto[]) => void
}

const sectionName = (id: string | number | undefined) =>
  blockLabels[String(id)] ?? 'Секция'
const plugins = defaultPreset.plugins.map((plugin) =>
  plugin === Accessibility
    ? Accessibility.configure({
        screenReaderInstructions: {
          draggable:
            'Чтобы переместить секцию, нажмите пробел или Enter на ручке. Используйте стрелки вверх и вниз. Нажмите пробел или Enter, чтобы завершить, или Escape, чтобы отменить.',
        },
        announcements: {
          dragstart: ({ operation }: DragStartEvent) =>
            `Перемещение: ${sectionName(operation.source?.id)}.`,
          dragover: ({ operation }: DragOverEvent) =>
            operation.target
              ? `${sectionName(operation.source?.id)}: новая позиция рядом с секцией «${sectionName(operation.target.id)}».`
              : undefined,
          dragend: ({ operation, canceled }: DragEndEvent) =>
            canceled
              ? 'Перемещение отменено. Порядок секций сохранён.'
              : `Перемещение секции «${sectionName(operation.source?.id)}» завершено.`,
        },
      })
    : plugin,
)
const modifiers = [RestrictToVerticalAxis]

function SectionContent({
  block,
  fixed,
  selected,
  pending,
  onSelect,
  onToggle,
}: {
  block: CmsBlockDto
  fixed?: boolean
  selected: boolean
  pending: boolean
  onSelect: () => void
  onToggle: (enabled: boolean) => void
}) {
  return (
    <>
      {fixed && (
        <span
          className="flex size-11 shrink-0 items-center justify-center text-muted-foreground xl:size-8"
          title="Первый экран закреплён"
          aria-label="Первый экран закреплён"
        >
          <LockKeyhole className="size-4" aria-hidden="true" />
        </span>
      )}
      <Button
        size="sm"
        variant={selected ? 'secondary' : 'ghost'}
        className="h-auto min-h-11 min-w-0 flex-1 justify-start px-2 text-left whitespace-normal xl:min-h-9"
        aria-pressed={selected}
        onClick={onSelect}
      >
        {blockLabels[block.id]}
      </Button>
      <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center xl:w-6">
        <input
          type="checkbox"
          role="switch"
          aria-label={'Показывать: ' + blockLabels[block.id]}
          checked={block.enabled}
          disabled={fixed || pending}
          className="size-4 accent-primary"
          onChange={(event) => onToggle(event.target.checked)}
        />
      </label>
    </>
  )
}

function SortableSection({
  block,
  index,
  selected,
  pending,
  onSelect,
  onToggle,
}: {
  block: CmsBlockDto
  index: number
  selected: boolean
  pending: boolean
  onSelect: () => void
  onToggle: (enabled: boolean) => void
}) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: block.id,
    index,
    disabled: pending,
  })
  return (
    <li
      ref={ref}
      className={cn(
        'flex min-w-0 items-center rounded-md border border-transparent bg-background',
        isDragSource && 'border-dashed border-primary/40 bg-muted/50',
      )}
    >
      <button
        ref={handleRef}
        type="button"
        disabled={pending}
        aria-label={'Переместить секцию: ' + blockLabels[block.id]}
        title="Потяните для перемещения. Пробел и стрелки — с клавиатуры."
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:cursor-default disabled:opacity-50 xl:size-8"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <SectionContent
        block={block}
        selected={selected}
        pending={pending}
        onSelect={onSelect}
        onToggle={onToggle}
      />
    </li>
  )
}

export function SectionList({
  blocks,
  selected,
  pending,
  onSelect,
  onChange,
}: Props) {
  const [first, ...sortable] = blocks
  const toggle = (id: string, enabled: boolean) =>
    onChange(
      blocks.map((block) => (block.id === id ? { ...block, enabled } : block)),
    )
  return (
    <DragDropProvider
      plugins={plugins}
      modifiers={modifiers}
      onDragEnd={(event) => {
        if (event.canceled || !first) return
        const next = move(sortable, event)
        if (next.some((block, index) => block.id !== sortable[index]?.id))
          onChange([first, ...next])
      }}
    >
      <ol aria-label="Порядок секций" className="grid gap-1">
        {first && (
          <li className="flex min-w-0 items-center">
            <SectionContent
              block={first}
              fixed
              selected={selected === first.id}
              pending={pending}
              onSelect={() => onSelect(first.id)}
              onToggle={() => {}}
            />
          </li>
        )}
        {sortable.map((block, index) => (
          <SortableSection
            key={block.id}
            block={block}
            index={index}
            selected={selected === block.id}
            pending={pending}
            onSelect={() => onSelect(block.id)}
            onToggle={(enabled) => toggle(block.id, enabled)}
          />
        ))}
      </ol>
      <DragOverlay className="rounded-md border bg-background shadow-lg">
        {(source) => (
          <div className="flex min-h-11 items-center gap-2 px-3 text-sm font-medium">
            <GripVertical
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            {sectionName(source.id)}
          </div>
        )}
      </DragOverlay>
    </DragDropProvider>
  )
}
