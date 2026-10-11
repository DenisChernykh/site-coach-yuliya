import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

export function useContentNavigationGuard(dirty: boolean) {
  const allowed = useRef(false)
  const blocker = useBlocker(() => dirty && !allowed.current)
  useEffect(() => {
    if (!dirty) return
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', prevent)
    return () => window.removeEventListener('beforeunload', prevent)
  }, [dirty])
  function afterSave(action: () => void) {
    allowed.current = true
    try {
      action()
    } finally {
      allowed.current = false
    }
  }
  return { blocker, afterSave }
}
