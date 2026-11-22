import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { SkyIcon } from './SkyIcon'
import { describe, nowIndex, round, type Forecast, type Units } from '../lib/weather'

const HOURS = 25 // now + next 24
const HEIGHT = 210
const PAD_X = 22
const TEMP_TOP = 34
const TEMP_BOTTOM = 112
const BAR_TOP = 126
const BAR_BOTTOM = 172

/** Catmull-Rom through the points, expressed as cubic Béziers. */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export function HourlyChart({ forecast, units }: { forecast: Forecast; units: Units }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const start = nowIndex(forecast)
  const h = forecast.hourly
  const hours = Array.from({ length: HOURS }, (_, k) => start + k)
    .filter((i) => i < h.time.length)
    .map((i, k) => ({
      k,
      time: h.time[i],
      temp: h.temperature[i],
      rain: h.precipitation[i] ?? 0,
      sky: describe(h.code[i]).sky,
      label: describe(h.code[i]).label,
      isDay: h.isDay[i] === 1,
    }))

  const temps = hours.map((p) => p.temp)
  const lo = Math.min(...temps)
  const hi = Math.max(...temps)
  const span = hi - lo || 1
  const step = width > 0 ? (width - PAD_X * 2) / Math.max(hours.length - 1, 1) : 0
  const x = (k: number) => PAD_X + k * step
  const y = (t: number) => TEMP_BOTTOM - ((t - lo) / span) * (TEMP_BOTTOM - TEMP_TOP)
  const pts = hours.map((p) => [x(p.k), y(p.temp)] as [number, number])
  const line = smoothPath(pts)
  const area = line && `${line} L${x(hours.length - 1)},${TEMP_BOTTOM + 8} L${x(0)},${TEMP_BOTTOM + 8} Z`
  const barW = Math.max(Math.min(step * 0.55, 14), 3)
  const sel = active == null ? null : hours[active]
  const marks = hours.filter((p) => p.k % 3 === 0)
  const unit = units === 'metric' ? 'C' : 'F'

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    if (!step) return
    const rect = e.currentTarget.getBoundingClientRect()
    const k = Math.round((e.clientX - rect.left - PAD_X) / step)
    setActive(Math.max(0, Math.min(hours.length - 1, k)))
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const d = e.key === 'ArrowRight' ? 1 : -1
      setActive((a) => Math.max(0, Math.min(hours.length - 1, (a ?? -d) + d)))
    } else if (e.key === 'Escape') {
      setActive(null)
    }
  }

  return (
    <section className="hourly" aria-labelledby="hourly-title">
      <header className="section-head">
        <h2 id="hourly-title">Next 24 hours</h2>
        <ul className="legend" aria-hidden="true">
          <li>
            <span className="legend-line" /> Temperature
          </li>
          <li>
            <span className="legend-bar" /> Chance of rain
          </li>
        </ul>
      </header>

      <div
        ref={wrapRef}
        className="hourly-plot"
        tabIndex={0}
        role="group"
        aria-label="Hourly temperature and rain chance. Use the left and right arrow keys to inspect each hour."
        onPointerMove={pick}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} aria-hidden="true">
            <defs>
              <linearGradient id="hourly-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <line x1={PAD_X} x2={width - PAD_X} y1={BAR_BOTTOM} y2={BAR_BOTTOM} className="hourly-base" />

            {hours.map((p) => {
              const bh = (p.rain / 100) * (BAR_BOTTOM - BAR_TOP)
              return (
                <rect
                  key={p.time}
                  x={x(p.k) - barW / 2}
                  y={BAR_BOTTOM - bh}
                  width={barW}
                  height={Math.max(bh, p.rain > 0 ? 2 : 0)}
                  rx={Math.min(3, barW / 2)}
                  className={sel?.k === p.k ? 'hourly-bar is-active' : 'hourly-bar'}
                />
              )
            })}

            {/* Keyed so the line redraws itself when the place or units change. */}
            <path key={`a-${start}-${units}-${hours[0]?.temp}`} d={area} fill="url(#hourly-area)" className="hourly-area" />
            <path key={`l-${start}-${units}-${hours[0]?.temp}`} d={line} className="hourly-line" pathLength={1} />

            {marks.map((p) => (
              <text key={p.time} x={x(p.k)} y={y(p.temp) - 12} className="hourly-temp">
                {round(p.temp)}°
              </text>
            ))}

            {sel && (
              <g>
                <line x1={x(sel.k)} x2={x(sel.k)} y1={TEMP_TOP - 20} y2={BAR_BOTTOM} className="hourly-guide" />
                <circle cx={x(sel.k)} cy={y(sel.temp)} r={5.5} className="hourly-dot" />
              </g>
            )}
            {!sel && <circle cx={x(0)} cy={y(hours[0]?.temp ?? 0)} r={5} className="hourly-dot" />}
          </svg>
        )}

        <ol className="hourly-ticks" aria-hidden="true">
          {marks.map((p) => (
            <li key={p.time} style={{ left: x(p.k) }}>
              <SkyIcon sky={p.sky} isDay={p.isDay} size={18} weight="duotone" />
              <span>{p.k === 0 ? 'Now' : p.time.slice(11, 16)}</span>
            </li>
          ))}
        </ol>

        {sel && (
          <div
            className="hourly-tip"
            style={{ left: Math.min(Math.max(x(sel.k), 70), width - 70) }}
            role="status"
          >
            <strong>{sel.k === 0 ? 'Now' : sel.time.slice(11, 16)}</strong>
            <span>
              {round(sel.temp)}°{unit} · {sel.label}
            </span>
            <span>{sel.rain}% chance of rain</span>
          </div>
        )}
      </div>
    </section>
  )
}
