import { useEffect, useRef, type RefObject } from 'react'

/**
 * Shared behaviour for non-modal panels: close on Escape or an outside click,
 * move focus into the panel when it opens, and hand focus back to whatever
 * opened it when it closes.
 */
export function usePopover<T extends HTMLElement>(open: boolean, onClose: () => void, ignore?: RefObject<HTMLElement | null>) {
  const ref = useRef<T>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const panel = ref.current
    const target =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>('button:not(:disabled), [href], input')
    target?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (panel?.contains(t) || ignore?.current?.contains(t)) return
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      // Only return focus if it would otherwise be lost inside the closed panel.
      if (!document.activeElement || document.activeElement === document.body || panel?.contains(document.activeElement)) {
        opener?.focus()
      }
    }
  }, [open, ignore])

  return ref
}
