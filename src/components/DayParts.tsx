import { useState } from 'react'
import { Thermometer, Umbrella, Wind } from '@phosphor-icons/react'
import { SkyIcon } from './SkyIcon'
import { describe, hourIndex, round, weekday, type Forecast, type Units } from '../lib/weather'
import { usePrefs, WIND_LABEL } from '../lib/prefs'

type Metric = 'temp' | 'wind' | 'rain'

const PARTS = [
  { label: 'Morning', hour: 8, from: 5, to: 12 },
  { label: 'Afternoon', hour: 14, from: 12, to: 17 },
  { label: 'Evening', hour: 18, from: 17, to: 21 },
  { label: 'Night', hour: 22, from: 21, to: 29 },
] as const

const METRICS: { id: Metric; label: string; icon: typeof Thermometer; question: string }[] = [
  { id: 'temp', label: 'Temperature', icon: Thermometer, question: 'How is the temperature {day}?' },
  { id: 'wind', label: 'Wind', icon: Wind, question: 'How windy is it {day}?' },
  { id: 'rain', label: 'Rain chance', icon: Umbrella, question: 'Will it rain {day}?' },
]

export function DayParts({ forecast }: { forecast: Forecast; units: Units }) {
  const prefs = usePrefs()
  const future = (forecast.view?.day ?? 0) > 0
  const [metric, setMetric] = useState<Metric>('temp')
  const today = forecast.current.time.slice(0, 10)
  const nowHour = Number(forecast.current.time.slice(11, 13))
  const current = METRICS.find((m) => m.id === metric)!

  const parts = PARTS.map((p) => {
    const i = hourIndex(forecast, today, p.hour)
    const h = forecast.hourly
    const value =
      i < 0 ? null : metric === 'temp' ? h.temperature[i] : metric === 'wind' ? h.wind[i] : h.precipitation[i]
    return {
      ...p,
      value,
      sky: i < 0 ? 'cloudy' : describe(h.code[i]).sky,
      isDay: i < 0 ? true : h.isDay[i] === 1,
      now: !future && ((nowHour >= p.from && nowHour < p.to) || (p.label === 'Night' && nowHour < 5)),
    }
  })

  const values = parts.map((p) => p.value ?? 0)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const suffix = metric === 'temp' ? '°' : metric === 'wind' ? ` ${WIND_LABEL[prefs.wind]}` : '%'

  return (
    <section className="dayparts" aria-labelledby="dayparts-title">
      <header className="dayparts-head">
        <h2 id="dayparts-title">{current.question.replace('{day}', future ? `on ${weekday(today)}` : 'today')}</h2>
        <div className="metric-switch" role="radiogroup" aria-label="Metric">
          {METRICS.map((m) => {
            const Icon = m.icon
            const on = m.id === metric
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={on}
                className="metric-btn"
                onClick={() => setMetric(m.id)}
                title={m.label}
              >
                <Icon size={18} weight={on ? 'fill' : 'regular'} />
                <span className="sr-only">{m.label}</span>
              </button>
            )
          })}
        </div>
      </header>

      <ol className="parts">
        {parts.map((p) => {
          const lift = p.value == null ? 0 : (p.value - lo) / span
          return (
            <li key={p.label} className={p.now ? 'part part--now' : 'part'}>
              <div className="part-track">
                <span className="part-bubble" style={{ bottom: `calc(${lift * 70}% + 4px)` }}>
                  <SkyIcon sky={p.sky} isDay={p.isDay} size={20} weight={p.now ? 'fill' : 'duotone'} />
                </span>
              </div>
              <p className="part-value">
                {p.value == null ? '--' : round(p.value)}
                <small>{suffix}</small>
              </p>
              <p className="part-label">{p.label}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
