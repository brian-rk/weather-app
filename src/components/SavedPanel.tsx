import { useEffect, useState } from 'react'
import { CaretDown, CaretUp, DotsSixVertical, Star, Trash } from '@phosphor-icons/react'
import { SkyIcon } from './SkyIcon'
import { Sheet } from './Sheet'
import { describe, fetchSnapshots, round, type Place, type Snapshot, type Units } from '../lib/weather'
import { t } from '../lib/i18n'

export const MAX_SAVED = 12

type Props = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  saved: Place[]
  current: Place
  units: Units
  onOpenPlace: (p: Place) => void
  onChange: (next: Place[]) => void
}

export function SavedPanel({ open, onClose, side, saved, current, units, onOpenPlace, onChange }: Props) {
  const [snaps, setSnaps] = useState<Record<string, Snapshot>>({})
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const ids = saved.map((p) => p.id).join('|')
  useEffect(() => {
    if (!open || saved.length === 0) return
    const ctrl = new AbortController()
    fetchSnapshots(saved, units, ctrl.signal)
      .then((list) => setSnaps(Object.fromEntries(list.map((s, i) => [saved[i].id, s]))))
      .catch(() => {})
    return () => ctrl.abort()
    // Re-fetch only when the set of cities or units changes, not on reorder.
  }, [open, ids, units]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const isSaved = saved.some((p) => p.id === current.id)
  const full = saved.length >= MAX_SAVED

  const move = (from: number, to: number) => {
    if (to < 0 || to >= saved.length || from === to) return
    const next = [...saved]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('Saved cities')} side={side}>

      {!isSaved && (
        <button
          type="button"
          className="sheet-add"
          disabled={full}
          onClick={() => onChange([current, ...saved])}
          data-autofocus
        >
          <Star size={18} weight="fill" aria-hidden="true" />
          <span>
            {t('Save {place}', { place: current.name })}
            {full && <small>{t('You can save up to {n}. Remove one first.', { n: MAX_SAVED })}</small>}
          </span>
        </button>
      )}

      {saved.length === 0 ? (
        <p className="sheet-empty">
          {t("No saved cities yet. Save the city you're viewing with the star on its card, or from here.")}
        </p>
      ) : (
        <>
          <p className="sheet-hint">{t('Drag to reorder. The first two appear on the dashboard.')}</p>
          <ol className="saved-list">
            {saved.map((p, i) => {
              const s = snaps[p.id]
              const cond = s ? describe(s.code) : null
              const classes = ['saved-item', dragging === i ? 'is-dragging' : '', over === i && dragging !== i ? 'is-over' : '']
                .filter(Boolean)
                .join(' ')
              return (
                <li
                  key={p.id}
                  className={classes}
                  draggable
                  onDragStart={(e) => {
                    setDragging(i)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', String(i))
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setOver(i)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragging !== null) move(dragging, i)
                    setDragging(null)
                    setOver(null)
                  }}
                  onDragEnd={() => {
                    setDragging(null)
                    setOver(null)
                  }}
                >
                  <span className="saved-grip" aria-hidden="true">
                    <DotsSixVertical size={18} weight="bold" />
                  </span>
                  <button
                    type="button"
                    className="saved-open"
                    onClick={() => {
                      onOpenPlace(p)
                      onClose()
                    }}
                    aria-current={p.id === current.id ? 'true' : undefined}
                  >
                    <strong>{p.name}</strong>
                    <small>{p.region || t('Saved spot')}</small>
                  </button>
                  <span className="saved-now">
                    {s && cond ? (
                      <>
                        <SkyIcon sky={cond.sky} isDay={s.isDay} size={18} weight="duotone" />
                        {round(s.temperature)}°
                      </>
                    ) : (
                      <span className="skeleton-line short" />
                    )}
                  </span>
                  <span className="saved-actions">
                    <button type="button" className="icon-btn" onClick={() => move(i, i - 1)} disabled={i === 0}>
                      <CaretUp size={16} />
                      <span className="sr-only">{t('Move {place} up', { place: p.name })}</span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => move(i, i + 1)}
                      disabled={i === saved.length - 1}
                    >
                      <CaretDown size={16} />
                      <span className="sr-only">{t('Move {place} down', { place: p.name })}</span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => onChange(saved.filter((x) => x.id !== p.id))}
                    >
                      <Trash size={16} />
                      <span className="sr-only">{t('Remove {place}', { place: p.name })}</span>
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </Sheet>
  )
}
