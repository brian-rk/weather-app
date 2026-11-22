import { useId, type RefObject } from 'react'
import { Check } from '@phosphor-icons/react'
import { usePopover } from './usePopover'
import { THEME_OPTIONS, type ThemeSetting } from '../lib/theme'

type Props = {
  open: boolean
  onClose: () => void
  trigger: RefObject<HTMLElement | null>
  value: ThemeSetting
  onChange: (t: ThemeSetting) => void
}

export function ThemeMenu({ open, onClose, trigger, value, onChange }: Props) {
  const ref = usePopover<HTMLDivElement>(open, onClose, trigger)
  const titleId = useId()
  if (!open) return null
  return (
    <div ref={ref} className="menu" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <h2 id={titleId} className="menu-title">
        Appearance
      </h2>
      <div role="radiogroup" aria-labelledby={titleId} className="menu-options">
        {THEME_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className="menu-option"
            onClick={() => onChange(o.id)}
            data-autofocus={value === o.id ? '' : undefined}
          >
            <span>
              <strong>{o.label}</strong>
              <small>{o.hint}</small>
            </span>
            {value === o.id && <Check size={16} weight="bold" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}
