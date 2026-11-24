import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { Cube, Drop, ListBullets } from '@phosphor-icons/react'
import { SkyIcon } from './SkyIcon'
import { describe, round, weekday, type Forecast } from '../lib/weather'
import { t } from '../lib/i18n'

export function WeekCard({
  forecast,
  selected = 0,
  onSelect,
}: {
  forecast: Forecast
  selected?: number
  onSelect?: (day: number) => void
}) {
  const d = forecast.daily
  const lo = Math.min(...d.min.slice(0, 7))
  const hi = Math.max(...d.max.slice(0, 7))
  const span = hi - lo || 1
  const pct = (v: number) => ((v - lo) / span) * 100
  const now = forecast.current.temperature
  const [view, setView] = useState<'list' | '3d'>('list')

  return (
    <section className="week" aria-labelledby="week-title">
      <header className="section-head">
        <h2 id="week-title">{t('7-day forecast')}</h2>
        <button
          type="button"
          className="icon-btn week-view-btn"
          aria-pressed={view === '3d'}
          onClick={() => setView((v) => (v === 'list' ? '3d' : 'list'))}
          title={view === 'list' ? t('Show in 3D') : t('Show as list')}
        >
          {view === 'list' ? <Cube size={18} /> : <ListBullets size={18} />}
          <span className="sr-only">{view === 'list' ? t('Show in 3D') : t('Show as list')}</span>
        </button>
      </header>
      {view === '3d' ? (
        <Week3D forecast={forecast} lo={lo} span={span} selected={selected} onSelect={onSelect} />
      ) : (
      /* Keyed on the data so the bars grow in again for a new place. */
      <ol className="week-list" key={d.max.slice(0, 7).join(',')}>
        {d.time.slice(0, 7).map((date, i) => {
          const cond = describe(d.code[i])
          const rain = d.precipitation[i] ?? 0
          return (
            <li key={date} className={selected > 0 && i === selected ? 'week-row is-selected' : 'week-row'}>
              <button
                type="button"
                className="week-hit"
                onClick={() => onSelect?.(i === selected ? 0 : i)}
                aria-pressed={i === selected}
              >
                <span className="sr-only">{t('Show {day} on the dashboard', { day: i === 0 ? t('today') : weekday(date) })}</span>
              </button>
              <span className="week-day">{i === 0 ? t('Today') : weekday(date, 'short')}</span>
              <span className="week-icon" title={cond.label}>
                <SkyIcon sky={cond.sky} isDay size={22} weight="duotone" />
                <span className="sr-only">{cond.label}</span>
              </span>
              <span className={rain >= 20 ? 'week-rain' : 'week-rain is-dry'}>
                {rain >= 20 && (
                  <>
                    <Drop size={12} weight="fill" aria-hidden="true" />
                    {rain}%
                  </>
                )}
              </span>
              <span className="week-min">
                <span className="sr-only">{t('Low')} </span>
                {round(d.min[i])}°
              </span>
              <span className="week-range" aria-hidden="true">
                <span
                  className="week-fill"
                  style={{
                    left: `${pct(d.min[i])}%`,
                    right: `${100 - pct(d.max[i])}%`,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
                {i === 0 && now >= d.min[0] && now <= d.max[0] && (
                  <span className="week-now" style={{ left: `${pct(now)}%` }} />
                )}
              </span>
              <span className="week-max">
                <span className="sr-only">{t('High')} </span>
                {round(d.max[i])}°
              </span>
            </li>
          )
        })}
      </ol>
      )}
    </section>
  )
}

/* ------------------------------------------------------------ 3D view */

const BAR_AREA = 150 // px of height for the coldest-to-warmest span

/**
 * The week as 3D columns: each runs from the day's low to its high.
 * Drag (or use the arrow keys) to tilt the scene; click a column to show that day.
 */
function Week3D({
  forecast,
  lo,
  span,
  selected,
  onSelect,
}: {
  forecast: Forecast
  lo: number
  span: number
  selected: number
  onSelect?: (day: number) => void
}) {
  const d = forecast.daily
  const [angle, setAngle] = useState({ rx: -16, ry: -26 })
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null)
  const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button')) return
    drag.current = { x: e.clientX, y: e.clientY, ...angle }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current
    if (!g) return
    setAngle({ rx: clamp(g.rx - (e.clientY - g.y) * 0.3, -50, 0), ry: clamp(g.ry + (e.clientX - g.x) * 0.4, -60, 60) })
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: [0, -6], ArrowRight: [0, 6], ArrowUp: [-4, 0], ArrowDown: [4, 0] }[e.key]
    if (!step) return
    e.preventDefault()
    setAngle((a) => ({ rx: clamp(a.rx + step[0], -50, 0), ry: clamp(a.ry + step[1], -60, 60) }))
  }

  return (
    <div
      className="w3d-stage"
      tabIndex={0}
      role="group"
      aria-label={t('3D view of the week. Drag or use the arrow keys to tilt.')}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onDoubleClick={() => setAngle({ rx: -16, ry: -26 })}
      onKeyDown={onKey}
    >
      <div className="w3d-scene" style={{ '--rx': `${angle.rx}deg`, '--ry': `${angle.ry}deg` } as CSSProperties}>
        <div className="w3d-floor" aria-hidden="true" />
        {d.time.slice(0, 7).map((date, i) => {
          const bottom = ((d.min[i] - lo) / span) * BAR_AREA
          const height = Math.max(((d.max[i] - d.min[i]) / span) * BAR_AREA, 10)
          const cond = describe(d.code[i])
          const label = i === 0 ? t('Today') : weekday(date, 'short')
          return (
            <button
              key={date}
              type="button"
              className={`w3d-col ${selected > 0 && i === selected ? 'is-selected' : ''}`}
              style={{ '--i': i, '--b': `${bottom}px`, '--h': `${height}px` } as CSSProperties}
              onClick={() => onSelect?.(i === selected ? 0 : i)}
              aria-label={`${label}: ${cond.label}, ${t('High')} ${round(d.max[i])}°, ${t('Low')} ${round(d.min[i])}°`}
            >
              <span className="w3d-box" aria-hidden="true">
                <i className="f f-front" />
                <i className="f f-back" />
                <i className="f f-left" />
                <i className="f f-right" />
                <i className="f f-top" />
                <i className="f f-bottom" />
              </span>
              <span className="w3d-max" aria-hidden="true">{round(d.max[i])}°</span>
              <span className="w3d-min" aria-hidden="true">{round(d.min[i])}°</span>
              <span className="w3d-day" aria-hidden="true">
                <SkyIcon sky={cond.sky} isDay size={16} weight="duotone" />
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
