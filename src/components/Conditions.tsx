import { ArrowDownRight, ArrowRight, ArrowUpRight } from '@phosphor-icons/react'
import { formatClock, formatPressureIn, toKmh, usePrefs, WIND_LABEL } from '../lib/prefs'
import {
  compass,
  formatDuration,
  minutesOfDay,
  nowIndex,
  round,
  uvLevel,
  type Forecast,
  type Units,
} from '../lib/weather'

/* ---------------------------------------------------------------- Sun */

function Sun({ forecast }: { forecast: Forecast }) {
  const { clock: fmt } = usePrefs()
  const clock = (iso: string) => formatClock(iso, fmt)
  const d = forecast.daily
  const rise = minutesOfDay(d.sunrise[0])
  const set = minutesOfDay(d.sunset[0])
  const now = minutesOfDay(forecast.current.time)
  const up = now >= rise && now <= set
  const t = Math.min(Math.max((now - rise) / (set - rise || 1), 0), 1)

  // Half-ellipse from (12,70) to (148,70) peaking at y=14.
  const angle = Math.PI * (1 - t)
  const sx = 80 + 68 * Math.cos(angle)
  const sy = 70 - 56 * Math.sin(angle)

  // Change versus yesterday, estimated from today's day-to-day trend.
  const delta = d.daylight.length > 1 ? Math.round((d.daylight[1] - d.daylight[0]) / 60) : 0
  const trend =
    delta === 0
      ? 'About the same as yesterday'
      : `${Math.abs(delta)} min ${delta > 0 ? 'longer' : 'shorter'} than yesterday`

  return (
    <div className="cond">
      <h3>Sun</h3>
      <svg viewBox="0 0 160 82" className="sun-arc" aria-hidden="true">
        <path d="M12 70 A68 56 0 0 1 148 70" className="sun-track" />
        {up && (
          <path
            d={`M12 70 A68 56 0 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)}`}
            className="sun-done"
            pathLength={1}
          />
        )}
        <line x1="4" x2="156" y1="70" y2="70" className="sun-horizon" />
        <circle cx={up ? sx : now < rise ? 12 : 148} cy={up ? sy : 70} r={7} className={up ? 'sun-dot' : 'sun-dot is-down'} />
      </svg>
      <div className="sun-times">
        <p>
          <small>Sunrise</small>
          {clock(d.sunrise[0])}
        </p>
        <p>
          <small>Sunset</small>
          {clock(d.sunset[0])}
        </p>
      </div>
      <p className="cond-note">
        {formatDuration(d.daylight[0])} of daylight. {trend}.
      </p>
    </div>
  )
}

/* ----------------------------------------------------------------- UV */

function Uv({ forecast }: { forecast: Forecast }) {
  const { clock: fmt } = usePrefs()
  const uv = forecast.current.uv
  const peak = forecast.daily.uvMax[0]
  const level = uvLevel(uv)
  const today = forecast.current.time.slice(0, 10)
  const strong = forecast.hourly.time
    .map((time, i) => ({ time, uv: forecast.hourly.uv[i] }))
    .filter((p) => p.time.startsWith(today) && p.uv >= 3)
  const protect =
    strong.length > 0
      ? `Protect yourself ${formatClock(strong[0].time, fmt)} to ${formatClock(`${strong.at(-1)!.time.slice(0, 11)}${String(Number(strong.at(-1)!.time.slice(11, 13)) + 1).padStart(2, '0')}:00`, fmt)}.`
      : null

  return (
    <div className="cond">
      <h3>UV index</h3>
      <p className="cond-value">
        {round(uv)}
        <span>{level.label}</span>
      </p>
      <div className="uv-scale" aria-hidden="true">
        <span style={{ left: `${Math.min(uv / 11, 1) * 100}%` }} />
      </div>
      <p className="cond-note">
        {protect ?? level.advice} Peak today {round(peak)}.
      </p>
    </div>
  )
}

/* --------------------------------------------------------------- Wind */

function Wind({ forecast }: { forecast: Forecast; units: Units }) {
  const prefs = usePrefs()
  const c = forecast.current
  const unit = WIND_LABEL[prefs.wind]
  return (
    <div className="cond">
      <h3>Wind</h3>
      <div className="wind-row">
        <p className="cond-value">
          {round(c.wind)}
          <span>{unit}</span>
        </p>
        <svg viewBox="0 0 80 80" className="compass" aria-hidden="true">
          <circle cx="40" cy="40" r="34" className="compass-ring" />
          {['N', 'E', 'S', 'W'].map((l, i) => {
            const a = (i * Math.PI) / 2
            return (
              <text key={l} x={40 + Math.sin(a) * 25} y={40 - Math.cos(a) * 25 + 3.5} className="compass-label">
                {l}
              </text>
            )
          })}
          {/* Arrow points where the wind is blowing to. */}
          <g transform={`rotate(${c.windDirection + 180} 40 40)`}>
            {/* Sways around the true direction; stronger wind, quicker sway. */}
            <g
              className="compass-needle"
              style={{ animationDuration: `${Math.max(0.9, 4 - toKmh(c.wind, prefs.wind) / 12)}s` }}
            >
              <path d="M40 18 L46 32 L40 29 L34 32 Z" className="compass-arrow" />
              <line x1="40" y1="29" x2="40" y2="58" className="compass-tail" />
            </g>
          </g>
        </svg>
      </div>
      <p className="cond-note">
        Blowing from the {compass(c.windDirection)}
        <br />
        Gusts up to {round(c.gusts)} {unit}
      </p>
    </div>
  )
}

/* ----------------------------------------------------------- Pressure */

function Pressure({ forecast }: { forecast: Forecast; units: Units }) {
  const prefs = usePrefs()
  const i = nowIndex(forecast)
  const series = forecast.hourly.pressure.slice(i, i + 13)
  const ahead = series[3] ?? series.at(-1) ?? forecast.current.pressure
  const diff = ahead - forecast.current.pressure
  const trend = diff > 1 ? 'Rising' : diff < -1 ? 'Falling' : 'Steady'
  const Icon = trend === 'Rising' ? ArrowUpRight : trend === 'Falling' ? ArrowDownRight : ArrowRight
  const hint =
    trend === 'Rising' ? 'Usually means settling weather.' : trend === 'Falling' ? 'Often comes before unsettled weather.' : 'No big change expected.'

  const lo = Math.min(...series)
  const hi = Math.max(...series)
  const span = hi - lo || 1
  const pts = series.map((p, k) => `${(k / Math.max(series.length - 1, 1)) * 150 + 5},${34 - ((p - lo) / span) * 26}`).join(' ')

  return (
    <div className="cond">
      <h3>Pressure</h3>
      <p className="cond-value">
        {formatPressureIn(forecast.current.pressure, prefs.pressure)}
      </p>
      <p className={`pressure-trend is-${trend.toLowerCase()}`}>
        <Icon size={16} weight="bold" aria-hidden="true" /> {trend} over the next 3 h
      </p>
      <svg viewBox="0 0 160 40" className="pressure-spark" aria-hidden="true" preserveAspectRatio="none">
        <polyline points={pts} />
      </svg>
      <p className="cond-note">{hint}</p>
    </div>
  )
}

export function Conditions({ forecast, units }: { forecast: Forecast; units: Units }) {
  return (
    <section className="conditions" aria-labelledby="conditions-title">
      <h2 id="conditions-title" className="sr-only">
        Today's conditions
      </h2>
      <Sun forecast={forecast} />
      <Uv forecast={forecast} />
      <Wind forecast={forecast} units={units} />
      <Pressure forecast={forecast} units={units} />
    </section>
  )
}
