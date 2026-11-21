import { CloudRain, Drop, MapPin } from '@phosphor-icons/react'
import { WeatherArt } from './WeatherArt'
import {
  aqiLabel,
  describe,
  formatVisibility,
  round,
  weekday,
  type Forecast,
  type Place,
  type Snapshot,
  type Units,
} from '../lib/weather'

/* ---------------------------------------------------------------- Now */

export function NowCard({ place, forecast, units }: { place: Place; forecast: Forecast; units: Units }) {
  const c = forecast.current
  const cond = describe(c.code)
  const mood = !c.isDay ? 'night' : cond.sky === 'clear' || cond.sky === 'partly' ? 'day' : 'grey'

  return (
    <section className={`card now now--${mood}`} aria-labelledby="now-title">
      <div className="now-puffs" aria-hidden="true" />
      <p className="place-pill">
        <MapPin size={18} weight="regular" aria-hidden="true" />
        {place.name}
        {place.region && `, ${place.region.split(', ').pop()}`}
      </p>

      <div className="now-head">
        <h2 id="now-title">{cond.label}</h2>
        <p className="muted">Now</p>
      </div>

      <WeatherArt sky={cond.sky} isDay={c.isDay} className="now-art float" />

      <div className="now-temp">
        <p className="temp-xl">
          {round(c.temperature)}
          <span>°{units === 'metric' ? 'C' : 'F'}</span>
        </p>
        <p className="muted">Feels like {round(c.feelsLike)}°</p>
      </div>

      <dl className="now-stats">
        <div className="stat stat--lime">
          <dt>Visibility</dt>
          <dd>{formatVisibility(c.visibility, units)}</dd>
        </div>
        <div className="stat">
          <dt>Humidity</dt>
          <dd>{c.humidity}%</dd>
        </div>
      </dl>
    </section>
  )
}

/* ------------------------------------------------------------- Cities */

export function CityList({
  places,
  snapshots,
  units,
  onSelect,
}: {
  places: Place[]
  snapshots: (Snapshot | undefined)[]
  units: Units
  onSelect: (p: Place) => void
}) {
  if (places.length === 0) {
    return (
      <div className="city city--empty">
        <p>Search a city above. The one you leave moves down here for quick comparison.</p>
      </div>
    )
  }
  return (
    <ul className="cities" aria-label="Other cities">
      {places.map((p, i) => {
        const s = snapshots[i]
        const cond = s ? describe(s.code) : null
        return (
          <li key={p.id}>
            <button type="button" className="city" onClick={() => onSelect(p)}>
              {cond && s ? (
                <WeatherArt sky={cond.sky} isDay={s.isDay} className="city-art" />
              ) : (
                <span className="city-art skeleton" />
              )}
              <span className="city-name">
                <strong>{p.name}</strong>
                <small>{cond?.label ?? 'Loading'}</small>
              </span>
              <span className="city-range">
                {s ? (
                  <>
                    {round(s.max)}°{units === 'metric' ? 'C' : 'F'} / {round(s.min)}°
                  </>
                ) : (
                  <span className="skeleton-line short" />
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/* ---------------------------------------------------------------- Air */

export function AirCard({ aqi, isDay, sky }: { aqi: number | null | undefined; isDay: boolean; sky: Forecast['current']['code'] }) {
  const cond = describe(sky)
  const pct = aqi == null ? 0 : Math.min(aqi / 300, 1)
  return (
    <section className="card air" aria-labelledby="air-title">
      <div className="air-stars" aria-hidden="true" />
      <div className="air-copy">
        <h2 id="air-title">Air quality</h2>
        {aqi === undefined ? (
          <span className="skeleton-line on-dark" />
        ) : aqi === null ? (
          <p className="air-label">No sensor reading nearby</p>
        ) : (
          <>
            <p className="air-label">{aqiLabel(aqi)}</p>
            <p className="air-value">
              {aqi} <small>US AQI</small>
            </p>
          </>
        )}
        <div className="air-meter" aria-hidden="true">
          <span style={{ transform: `scaleX(${pct})` }} />
        </div>
      </div>
      <WeatherArt sky={cond.sky} isDay={isDay} className="air-art float" />
    </section>
  )
}

/* ----------------------------------------------------------- Tomorrow */

export function TomorrowCard({ place, forecast, units }: { place: Place; forecast: Forecast; units: Units }) {
  const d = forecast.daily
  const cond = describe(d.code[1])
  const wet = cond.sky === 'rain' || cond.sky === 'drizzle' || cond.sky === 'storm'
  return (
    <section className={`card tomorrow ${wet ? 'tomorrow--wet' : 'tomorrow--dry'}`} aria-labelledby="tomorrow-title">
      {wet && <div className="rain" aria-hidden="true" />}
      <div className="tomorrow-head">
        <p className="muted">Tomorrow, {weekday(d.time[1])}</p>
        <h2 id="tomorrow-title">{place.name}</h2>
      </div>

      <WeatherArt sky={cond.sky} isDay className="tomorrow-art float" />

      <div className="tomorrow-foot">
        <p className="temp-lg">
          {round(d.max[1])}°{units === 'metric' ? 'C' : 'F'}
          <span> / {round(d.min[1])}°</span>
        </p>
        <p className="tomorrow-meta">
          {cond.label}
          <span>
            <Drop size={14} aria-hidden="true" /> {d.precipitation[1] ?? 0}% chance
          </span>
        </p>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------- Errors */

export function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="card error-card" role="alert">
      <CloudRain size={40} weight="duotone" aria-hidden="true" />
      <div>
        <h2>The forecast didn't load</h2>
        <p className="muted">{message}. Your saved cities are still here.</p>
      </div>
      <button type="button" className="btn-primary" onClick={onRetry}>
        Try again
      </button>
    </section>
  )
}

