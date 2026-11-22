import { useId, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { usePopover } from './usePopover'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  /** Which edge it slides from on desktop; phones always use a bottom sheet. */
  side?: 'left' | 'right'
  icon?: ReactNode
  children: ReactNode
  className?: string
}

/** Non-modal side panel shared by Saved, Briefing, Calendar, Alerts, Planner and Settings. */
export function Sheet({ open, onClose, title, side = 'left', icon, children, className }: Props) {
  const ref = usePopover<HTMLElement>(open, onClose)
  const titleId = useId()
  if (!open) return null
  return (
    <aside
      ref={ref}
      className={['sheet', `sheet--${side}`, className].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <header className="sheet-head">
        <h2 id={titleId}>
          {icon}
          {title}
        </h2>
        <button type="button" className="icon-btn" onClick={onClose}>
          <X size={18} />
          <span className="sr-only">Close {title.toLowerCase()}</span>
        </button>
      </header>
      <div className="sheet-body">{children}</div>
    </aside>
  )
}
