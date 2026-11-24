import { useEffect, useState, type KeyboardEvent } from 'react'
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Sheet } from './Sheet'
import { SkyIcon } from './SkyIcon'
import { describe, round, type Forecast } from '../lib/weather'
import { formatDay, t } from '../lib/i18n'

type Props = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  forecast: Forecast | null
  selected: number
  onSelect: (day: number) => void
}

const WEEKS_PER_PAGE = 2
const TURN_MS = 720

// 2024-01-01 was a Monday; format a week from there in the active language.
const weekdays = () => Array.from({ length: 7 }, (_, i) => formatDay(`2024-01-0${i + 1}`, 'short'))

function weekdayOf(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** Calendar cells (null = padding) grouped into pages of two weeks. */
function paginate(days: string[]) {
  const lead = days.length ? weekdayOf(days[0]) : 0
  const cells: (number | null)[] = [...Array(lead).fill(null), ...days.map((_, i) => i)]
  while (cells.length % 7) cells.push(null)
  const pages: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7 * WEEKS_PER_PAGE) pages.push(cells.slice(i, i + 7 * WEEKS_PER_PAGE))
  return pages
}

type Turn = { from: number; to: number; dir: 'next' | 'prev' }

/** 16-day forecast as a paper calendar: two weeks per page, turned like a page. */
export function CalendarPanel({ open, onClose, side, forecast, selected, onSelect }: Props) {
  const days = forecast?.daily.time ?? []
  const pages = paginate(days)
  const pageOf = (day: number) => Math.max(0, pages.findIndex((p) => p.includes(day)))
  const [page, setPage] = useState(() => pageOf(selected))
  const [turn, setTurn] = useState<Turn | null>(null)

  // Opening the calendar shows the page holding the viewed day.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setPage(pageOf(selected))
  }

  useEffect(() => {
    if (!turn) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tm = window.setTimeout(() => setTurn(null), reduced ? 0 : TURN_MS)
    return () => window.clearTimeout(tm)
  }, [turn])

  const go = (dir: 'next' | 'prev') => {
    const to = dir === 'next' ? page + 1 : page - 1
    if (to < 0 || to >= pages.length || turn) return
    setTurn({ from: page, to, dir })
    setPage(to)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'PageDown' || (e.key === 'ArrowRight' && e.altKey)) {
      e.preventDefault()
      go('next')
    } else if (e.key === 'PageUp' || (e.key === 'ArrowLeft' && e.altKey)) {
      e.preventDefault()
      go('prev')
    }
  }

  const months = [
    ...new Set((pages[page] ?? []).filter((c): c is number => c !== null).map((i) => formatDay(days[i], 'month'))),
  ]

  const renderPage = (p: number, className: string) => {
    const current = className === 'cal-page--current'
    return (
      <div className={`cal-page ${className}`} aria-hidden={current ? undefined : true}>
        <div className="cal-head" role="row">
          {weekdays().map((w) => (
            <span key={w} role="columnheader">
              {w}
            </span>
          ))}
        </div>
        <div className="cal-grid" role="row">
          {(pages[p] ?? []).map((i, k) => {
            if (i === null) return <span key={`pad-${k}`} className="cal-pad" aria-hidden="true" />
            const iso = days[i]
            const cond = describe(forecast!.daily.code[i])
            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                tabIndex={current ? 0 : -1}
                className={['cal-day', i === 0 ? 'is-today' : '', i === selected ? 'is-selected' : ''].join(' ')}
                aria-selected={i === selected}
                aria-label={`${formatDay(iso, 'date')}: ${cond.label}, ${t('High')} ${round(forecast!.daily.max[i])}°, ${t('Low')} ${round(forecast!.daily.min[i])}°`}
                onClick={() => {
                  onSelect(i)
                  onClose()
                }}
                style={{ animationDelay: `${(k % 14) * 22}ms` }}
              >
                <span className="cal-num">{Number(iso.slice(8, 10))}</span>
                <SkyIcon sky={cond.sky} isDay size={20} weight="duotone" />
                <span className="cal-temps">
                  {round(forecast!.daily.max[i])}°<small>{round(forecast!.daily.min[i])}°</small>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Forecast calendar')}
      side={side}
      icon={<CalendarBlank size={20} weight="duotone" aria-hidden="true" />}
    >
      {!forecast ? (
        <p className="sheet-empty">{t('The calendar appears once the forecast has loaded.')}</p>
      ) : (
        <>
          <div className="cal-nav">
            <button type="button" className="icon-btn" onClick={() => go('prev')} disabled={page === 0}>
              <CaretLeft size={18} />
              <span className="sr-only">{t('Previous weeks')}</span>
            </button>
            <p className="cal-month" aria-live="polite">
              {months.join(' · ')}
              <small>{t('Page {n} of {total}', { n: page + 1, total: pages.length })}</small>
            </p>
            <button type="button" className="icon-btn" onClick={() => go('next')} disabled={page >= pages.length - 1}>
              <CaretRight size={18} />
              <span className="sr-only">{t('Next weeks')}</span>
            </button>
          </div>

          <div className="cal-book" role="grid" aria-label={t('16-day forecast')} onKeyDown={onKey}>
            {/* Underneath: the page being revealed (next) or the page being covered (prev). */}
            {turn
              ? renderPage(turn.dir === 'next' ? turn.to : turn.from, 'cal-page--under')
              : renderPage(page, 'cal-page--current')}
            {/* On top: the page that turns over. */}
            {turn && renderPage(turn.dir === 'next' ? turn.from : turn.to, `cal-page--flap cal-page--turn-${turn.dir}`)}
          </div>

          <p className="sheet-hint">{t('Pick a day to see it across the dashboard.')}</p>
          {selected > 0 && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                onSelect(0)
                onClose()
              }}
            >
              {t('Back to today')}
            </button>
          )}
        </>
      )}
    </Sheet>
  )
}
