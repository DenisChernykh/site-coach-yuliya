import { useSidebar } from '@/shared/ui'

export function SidebarResize({
  width,
  onChange,
}: {
  width: number
  onChange: (width: number) => void
}) {
  const { state, isMobile } = useSidebar()
  if (isMobile || state === 'collapsed') return null
  return (
    <div
      role="separator"
      aria-label="Ширина навигации"
      aria-orientation="vertical"
      aria-valuemin={200}
      aria-valuemax={400}
      aria-valuenow={width}
      tabIndex={0}
      className="absolute inset-y-0 -right-1 z-30 hidden w-2 cursor-col-resize touch-none hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:outline-none md:block"
      onDoubleClick={() => onChange(256)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          onChange(width + (event.key === 'ArrowLeft' ? -16 : 16))
        } else if (event.key === 'Home') {
          event.preventDefault()
          onChange(200)
        } else if (event.key === 'End') {
          event.preventDefault()
          onChange(400)
        }
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          onChange(event.clientX)
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId)
      }}
    />
  )
}
