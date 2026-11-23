import { useEffect, useState } from 'react'
import { ChatCircleText } from '@phosphor-icons/react'
import { Sheet } from './Sheet'
import { t } from '../lib/i18n'

type Props = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  lines: string[]
  placeName: string
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A short chat-style briefing; messages arrive one by one with a typing indicator. */
export function BriefingPanel({ open, onClose, side, lines, placeName }: Props) {
  const [shown, setShown] = useState(0)
  const key = lines.join('|')

  useEffect(() => {
    if (!open) return
    if (reduced()) {
      setShown(lines.length)
      return
    }
    setShown(0)
    let n = 0
    const t = window.setInterval(() => {
      n += 1
      setShown(n)
      if (n >= lines.length) window.clearInterval(t)
    }, 520)
    return () => window.clearInterval(t)
    // Restart only when the panel opens or the content changes.
  }, [open, key]) // eslint-disable-line react-hooks/exhaustive-deps

  const typing = shown < lines.length

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Daily briefing')}
      side={side}
      icon={<ChatCircleText size={20} weight="duotone" aria-hidden="true" />}
    >
      <p className="sheet-hint">{t('Nimbus on {place}, generated from the latest forecast.', { place: placeName })}</p>
      <ol className="chat" aria-live="polite">
        {lines.slice(0, shown).map((line, i) => (
          <li key={`${i}-${line}`} className="chat-msg">
            {i === 0 && <span className="chat-avatar" aria-hidden="true" />}
            <p>{line}</p>
          </li>
        ))}
        {typing && (
          <li className="chat-msg chat-typing" aria-label={t('Writing')}>
            <p>
              <span />
              <span />
              <span />
            </p>
          </li>
        )}
      </ol>
    </Sheet>
  )
}
