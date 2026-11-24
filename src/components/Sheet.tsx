import { useEffect, useId, useState, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { usePopover } from './usePopover'
import { t } from '../lib/i18n'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  /** Which edge it swings from on desktop; phones always use a bottom sheet. */
  side?: 'left' | 'right'
  icon?: ReactNode
  children: ReactNode
  className?: string
}

const CLOSE_MS = 260

/**
 * Non-modal side panel shared by every panel. It swings open from its edge
 * like a door, and stays mounted briefly after closing so it can swing shut.
 */
export function Sheet({ open, onClose, title, side = 'left', icon, children, className }: Props) {
  const ref = usePopover<HTMLElement>(open, onClose)
  const titleId = useId()
  // Keep the last-open side and content visible while the closing swing plays.
  const [closing, setClosing] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const [lastSide, setLastSide] = useState(side)
  if (open && side !== lastSide) setLastSide(side)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) setClosing(true)
  }
  useEffect(() => {
    if (!closing) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tm = window.setTimeout(() => setClosing(false), reduced ? 0 : CLOSE_MS)
    return () => window.clearTimeout(tm)
  }, [closing])

  if (!open && !closing) return null
  return (
    <aside
      ref={ref}
      className={['sheet', `sheet--${open ? side : lastSide}`, closing && !open ? 'is-closing' : '', className].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-hidden={!open || undefined}
      inert={!open || undefined}
    >
      <header className="sheet-head">
        <h2 id={titleId}>
          {icon}
          {title}
        </h2>
        <button type="button" className="icon-btn" onClick={onClose}>
          <X size={18} />
          <span className="sr-only">
            {t('Close')} {title.toLowerCase()}
          </span>
        </button>
      </header>
      <div className="sheet-body">{children}</div>
    </aside>
  )
}
