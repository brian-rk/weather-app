import { Drop } from '@phosphor-icons/react'
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
  const pct = (t: number) => ((t - lo) / span) * 100
  const now = forecast.current.temperature

  return (
    <section className="week" aria-labelledby="week-title">
      <header className="section-head">
        <h2 id="week-title">{t('7-day forecast')}</h2>
      </header>
      {/* Keyed on the data so the bars grow in again for a new place. */}
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
    </section>
  )
}
