import { CalendarBlank } from '@phosphor-icons/react'
import { Sheet } from './Sheet'
import { SkyIcon } from './SkyIcon'
import { describe, round, type Forecast } from '../lib/weather'

type Props = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  forecast: Forecast | null
  selected: number
  onSelect: (day: number) => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return { day: d, weekday: (date.getUTCDay() + 6) % 7, month: date.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }) }
}

/** 16-day forecast laid out as a calendar; picking a day shows it across the dashboard. */
export function CalendarPanel({ open, onClose, side, forecast, selected, onSelect }: Props) {
  const days = forecast?.daily.time ?? []
  const lead = days.length ? parts(days[0]).weekday : 0
  const months = [...new Set(days.map((d) => parts(d).month))]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Forecast calendar"
      side={side}
      icon={<CalendarBlank size={20} weight="duotone" aria-hidden="true" />}
    >
      {!forecast ? (
        <p className="sheet-empty">The calendar appears once the forecast has loaded.</p>
      ) : (
        <>
          <p className="sheet-hint">
            {months.join(' and ')}. Pick a day to see it across the dashboard.
          </p>
          <div className="cal" role="grid" aria-label="16-day forecast">
            <div className="cal-head" role="row">
              {WEEKDAYS.map((w) => (
                <span key={w} role="columnheader">
                  {w}
                </span>
              ))}
            </div>
            <div className="cal-grid" role="row">
              {Array.from({ length: lead }, (_, i) => (
                <span key={`pad-${i}`} className="cal-pad" aria-hidden="true" />
              ))}
              {days.map((iso, i) => {
                const cond = describe(forecast.daily.code[i])
                const p = parts(iso)
                return (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    className={['cal-day', i === 0 ? 'is-today' : '', i === selected ? 'is-selected' : ''].join(' ')}
                    aria-selected={i === selected}
                    aria-label={`${iso}: ${cond.label}, high ${round(forecast.daily.max[i])}, low ${round(forecast.daily.min[i])}`}
                    onClick={() => {
                      onSelect(i)
                      onClose()
                    }}
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <span className="cal-num">{p.day}</span>
                    <SkyIcon sky={cond.sky} isDay size={20} weight="duotone" />
                    <span className="cal-temps">
                      {round(forecast.daily.max[i])}°<small>{round(forecast.daily.min[i])}°</small>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          {selected > 0 && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                onSelect(0)
                onClose()
              }}
            >
              Back to today
            </button>
          )}
        </>
      )}
    </Sheet>
  )
}
