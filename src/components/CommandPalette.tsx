import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { MagnifyingGlass, MapPin, Star } from '@phosphor-icons/react'
import { searchPlaces, type Place } from '../lib/weather'
import { t } from '../lib/i18n'

export type Command = {
  id: string
  label: string
  /** Extra words that should match, e.g. "dark night theme". */
  keywords?: string
  hint?: string
  icon: ReactNode
  run: () => void
}

type Item = { key: string; label: string; sub?: string; icon: ReactNode; run: () => void; group: string }

type Props = {
  open: boolean
  onClose: () => void
  commands: Command[]
  saved: Place[]
  onPickPlace: (p: Place) => void
}

/** Simple fuzzy match: every query character appears in order. Returns a score (lower is better) or -1. */
function score(text: string, q: string) {
  const s = text.toLowerCase()
  if (!q) return 0
  const direct = s.indexOf(q)
  if (direct >= 0) return direct
  let i = 0
  let gaps = 0
  for (const ch of q) {
    const at = s.indexOf(ch, i)
    if (at < 0) return -1
    gaps += at - i
    i = at + 1
  }
  return 50 + gaps
}

/** Ctrl/⌘+K launcher: jump to cities, panels and settings from the keyboard. */
export function CommandPalette({ open, onClose, commands, saved, onPickPlace }: Props) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const q = query.trim().toLowerCase()

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    setPlaces([])
    const prev = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => inputRef.current?.focus())
    return () => prev?.focus()
  }, [open])

  useEffect(() => {
    if (!open || q.length < 2) return
    const ctrl = new AbortController()
    const tm = window.setTimeout(() => {
      searchPlaces(q, ctrl.signal)
        .then(setPlaces)
        .catch(() => {})
    }, 200)
    return () => {
      window.clearTimeout(tm)
      ctrl.abort()
    }
  }, [open, q])

  const items = useMemo<Item[]>(() => {
    const out: Item[] = []
    const savedHits = saved
      .map((p) => ({ p, s: score(`${p.name} ${p.region}`, q) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s)
      .slice(0, 5)
    for (const { p } of savedHits)
      out.push({ key: `saved-${p.id}`, label: p.name, sub: p.region, icon: <Star size={18} weight="fill" />, run: () => onPickPlace(p), group: t('Saved cities') })
    if (q.length >= 2)
      for (const p of places.filter((p) => !saved.some((s) => s.id === p.id)).slice(0, 5))
        out.push({ key: `geo-${p.id}`, label: p.name, sub: p.region, icon: <MapPin size={18} />, run: () => onPickPlace(p), group: t('Places') })
    const cmds = commands
      .map((c) => ({ c, s: score(`${c.label} ${c.keywords ?? ''}`, q) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s)
    for (const { c } of cmds) out.push({ key: c.id, label: c.label, sub: c.hint, icon: c.icon, run: c.run, group: t('Actions') })
    return out
  }, [q, places, saved, commands, onPickPlace])

  if (!open) return null

  const runItem = (it: Item) => {
    onClose()
    // Let the palette close (and focus return) before the action opens anything.
    requestAnimationFrame(it.run)
  }

  let lastGroup = ''
  return (
    <div className="palette-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t('Command palette')}>
        <div className="palette-input">
          <MagnifyingGlass size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
            placeholder={t('Search cities or type a command')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter' && items[active]) {
                e.preventDefault()
                runItem(items[active])
              } else if (e.key === 'Escape') {
                onClose()
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" id={listId} role="listbox" aria-label={t('Results')}>
          {items.length === 0 && <li className="palette-empty">{t('Nothing matches "{q}".', { q: query })}</li>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null
            lastGroup = it.group
            return (
              <li key={it.key} role="presentation">
                {header && (
                  <p className="palette-group" aria-hidden="true">
                    {header}
                  </p>
                )}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className="palette-item"
                  style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
                  onPointerMove={() => setActive(i)}
                  onClick={() => runItem(it)}
                >
                  <span className="palette-icon" aria-hidden="true">
                    {it.icon}
                  </span>
                  <span className="palette-text">
                    <strong>{it.label}</strong>
                    {it.sub && <small>{it.sub}</small>}
                  </span>
                  {i === active && <kbd aria-hidden="true">↵</kbd>}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="palette-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t('to move')}
          </span>
          <span>
            <kbd>↵</kbd> {t('to open')}
          </span>
          <span>
            <kbd>Ctrl</kbd>
            <kbd>K</kbd> {t('to toggle')}
          </span>
        </p>
      </div>
    </div>
  )
}
