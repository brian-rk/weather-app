import { Drop } from '@phosphor-icons/react'
import { SkyIcon } from './SkyIcon'
import { describe, round, weekday, type Forecast } from '../lib/weather'

export function WeekCard({ forecast }: { forecast: Forecast }) {
  const d = forecast.daily
  const lo = Math.min(...d.min)
  const hi = Math.max(...d.max)
  const span = hi - lo || 1
  const pct = (t: number) => ((t - lo) / span) * 100
  const now = forecast.current.temperature

  return (
    <section className="week" aria-labelledby="week-title">
      <header className="section-head">
        <h2 id="week-title">7-day forecast</h2>
      </header>
      {/* Keyed on the data so the bars grow in again for a new place. */}
      <ol className="week-list" key={d.max.join(',')}>
        {d.time.map((date, i) => {
          const cond = describe(d.code[i])
          const rain = d.precipitation[i] ?? 0
          return (
            <li key={date} className="week-row">
              <span className="week-day">{i === 0 ? 'Today' : weekday(date, 'short')}</span>
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
                <span className="sr-only">Low </span>
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
                <span className="sr-only">High </span>
                {round(d.max[i])}°
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
