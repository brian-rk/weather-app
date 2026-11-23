import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ArrowsLeftRight, Plus, Table, X } from '@phosphor-icons/react'
import { Sheet } from './Sheet'
import { SkyIcon } from './SkyIcon'
import { Search } from './Search'
import { t, formatDay } from '../lib/i18n'
import { WIND_LABEL, usePrefs } from '../lib/prefs'
import { describe, fetchCompare, round, type CompareData, type Place, type Units } from '../lib/weather'

type Metric = 'max' | 'min' | 'rain' | 'wind'
const MAX_CITIES = 3

type Props = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  place: Place
  saved: Place[]
  units: Units
  onOpenPlace: (p: Place) => void
}

/* ----------------------------------------------------------- Chart */

type Series = { id: string; name: string; values: number[] }

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function CompareChart({ series, labels, suffix }: { series: Series[]; labels: string[]; suffix: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = 230
  const L = 34 // y-axis labels
  const R = 78 // room for direct labels
  const T = 14
  const B = 30
  const all = series.flatMap((s) => s.values)
  const lo = Math.floor(Math.min(...all))
  const hi = Math.ceil(Math.max(...all))
  const span = hi - lo || 1
  const n = labels.length
  const x = (i: number) => L + ((width - L - R) * i) / Math.max(n - 1, 1)
  const y = (v: number) => T + (H - T - B) * (1 - (v - lo) / span)
  const ticks = [lo, Math.round((lo + hi) / 2), hi]

  // Direct labels at the line ends, nudged apart so they never overlap.
  const ends = series
    .map((s, i) => ({ i, y: y(s.values[n - 1]) }))
    .sort((a, b) => a.y - b.y)
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 15) ends[k].y = ends[k - 1].y + 15

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    if (!width) return
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - L) / (width - L - R)) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const d = e.key === 'ArrowRight' ? 1 : -1
    setHover((h) => Math.max(0, Math.min(n - 1, (h ?? (d > 0 ? -1 : n)) + d)))
  }

  return (
    <div
      ref={ref}
      className="cmp-chart"
      tabIndex={0}
      role="group"
      aria-label={t('Comparison chart. Use the left and right arrow keys to read each day.')}
      onPointerMove={pick}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKey}
      onBlur={() => setHover(null)}
    >
      {width > 0 && (
        <svg width={width} height={H} aria-hidden="true">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={width - R} y1={y(v)} y2={y(v)} className="cmp-grid" />
              <text x={L - 8} y={y(v) + 4} className="cmp-axis" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {labels.map((l, i) => (
            <text key={l + i} x={x(i)} y={H - 8} className="cmp-axis" textAnchor="middle">
              {l}
            </text>
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="cmp-cross" />}
          {series.map((s, si) => (
            <g key={s.id} className={`cmp-series cmp-series--${si + 1}`}>
              <path
                d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')}
                className="cmp-line"
                pathLength={1}
              />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5.5 : 4} className="cmp-dot" />
              ))}
            </g>
          ))}
          {ends.map(({ i, y: ly }) => (
            <g key={series[i].id} className={`cmp-series cmp-series--${i + 1}`}>
              <circle cx={width - R + 10} cy={ly} r={4} className="cmp-dot" />
              <text x={width - R + 18} y={ly + 4} className="cmp-end">
                {series[i].name.length > 9 ? `${series[i].name.slice(0, 8)}…` : series[i].name}
              </text>
            </g>
          ))}
        </svg>
      )}
      {hover != null && width > 0 && (
        <div className="cmp-tip" style={{ left: Math.min(Math.max(x(hover), 90), width - 90) }} role="status">
          <strong>{labels[hover]}</strong>
          {series.map((s, si) => (
            <span key={s.id}>
              <i className={`cmp-swatch cmp-series--${si + 1}`} aria-hidden="true" />
              {s.name}
              <b>
                {round(s.values[hover])}
                {suffix}
              </b>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------- Panel */

export function ComparePanel({ open, onClose, side, place, saved, units, onOpenPlace }: Props) {
  const prefs = usePrefs()
  const [picked, setPicked] = useState<Place[]>(() => [place, ...saved.filter((p) => p.id !== place.id)].slice(0, MAX_CITIES))
  const [data, setData] = useState<CompareData[] | null>(null)
  const [error, setError] = useState(false)
  const [metric, setMetric] = useState<Metric>('max')
  const [table, setTable] = useState(false)
  const [adding, setAdding] = useState(false)

  const ids = picked.map((p) => p.id).join('|')
  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    setError(false)
    fetchCompare(picked, units, prefs.wind, ctrl.signal)
      .then(setData)
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(true)
      })
    return () => ctrl.abort()
    // Refetch when the set of cities or units change.
  }, [open, ids, units, prefs.wind]) // eslint-disable-line react-hooks/exhaustive-deps

  const metrics: { id: Metric; label: string; suffix: string }[] = [
    { id: 'max', label: t('High'), suffix: '°' },
    { id: 'min', label: t('Low'), suffix: '°' },
    { id: 'rain', label: t('Rain chance'), suffix: '%' },
    { id: 'wind', label: t('Wind'), suffix: ` ${WIND_LABEL[prefs.wind]}` },
  ]
  const m = metrics.find((x) => x.id === metric)!
  const ready = data && data.length === picked.length
  const labels = ready ? data[0].daily.time.map((d, i) => (i === 0 ? t('Today') : formatDay(d, 'short'))) : []
  const series: Series[] = ready
    ? picked.map((p, i) => ({ id: p.id, name: p.name, values: data[i].daily[metric] }))
    : []

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Compare cities')}
      side={side}
      className="sheet--wide"
      icon={<ArrowsLeftRight size={20} weight="duotone" aria-hidden="true" />}
    >
      <ul className="cmp-cities">
        {picked.map((p, i) => {
          const d = data?.[i]
          const cond = d ? describe(d.current.code) : null
          return (
            <li key={p.id} className={`cmp-city cmp-series--${i + 1}`}>
              <i className="cmp-swatch" aria-hidden="true" />
              <button type="button" className="cmp-city-name" onClick={() => onOpenPlace(p)} title={t('Open {place}', { place: p.name })}>
                <strong>{p.name}</strong>
                <small>{cond ? `${round(d!.current.temperature)}° · ${cond.label}` : t('Loading')}</small>
              </button>
              {d && cond && <SkyIcon sky={cond.sky} isDay={d.current.isDay} size={22} weight="duotone" />}
              {picked.length > 1 && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setPicked((list) => list.filter((x) => x.id !== p.id))}
                >
                  <X size={14} />
                  <span className="sr-only">{t('Remove {place}', { place: p.name })}</span>
                </button>
              )}
            </li>
          )
        })}
        {picked.length < MAX_CITIES && (
          <li className="cmp-add">
            {adding ? (
              <Search
                onSelect={(p) => {
                  if (!picked.some((x) => x.id === p.id)) setPicked((list) => [...list, p])
                  setAdding(false)
                }}
              />
            ) : (
              <button type="button" className="btn-ghost" onClick={() => setAdding(true)}>
                <Plus size={16} aria-hidden="true" /> {t('Add a city')}
              </button>
            )}
          </li>
        )}
      </ul>

      <div className="cmp-toolbar">
        <div className="seg" role="radiogroup" aria-label={t('Measure')}>
          {metrics.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={metric === x.id} onClick={() => setMetric(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn-ghost btn-ghost--small" aria-pressed={table} onClick={() => setTable((v) => !v)}>
          <Table size={16} aria-hidden="true" /> {table ? t('Show chart') : t('Show table')}
        </button>
      </div>

      {error && <p className="field-error">{t("Couldn't load the comparison. Check your connection.")}</p>}
      {!ready && !error && <span className="skeleton cmp-skeleton" />}
      {ready &&
        (table ? (
          <div className="cmp-table-wrap">
            <table className="cmp-table">
              <caption className="sr-only">
                {m.label}, {t('next 7 days')}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t('Day')}</th>
                  {picked.map((p) => (
                    <th key={p.id} scope="col">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labels.map((l, i) => (
                  <tr key={l + i}>
                    <th scope="row">{l}</th>
                    {series.map((s) => (
                      <td key={s.id}>
                        {round(s.values[i])}
                        {m.suffix}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CompareChart key={metric} series={series} labels={labels} suffix={m.suffix} />
        ))}
    </Sheet>
  )
}
