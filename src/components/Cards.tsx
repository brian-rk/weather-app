import { CloudRain, Drop, MapPin, Star } from '@phosphor-icons/react'
import { WeatherArt } from './WeatherArt'
import { SkyFx, WindGusts } from './SkyFx'
import { useCountUp } from '../lib/useCountUp'
import {
  aqiLabel,
  describe,
  formatVisibility,
  round,
  weekday,
  type AirQuality,
  type Forecast,
  type Place,
  type Snapshot,
  type Units,
} from '../lib/weather'

/* ---------------------------------------------------------------- Now */

export function NowCard({
  place,
  forecast,
  units,
  saved,
  onToggleSave,
}: {
  place: Place
  forecast: Forecast
  units: Units
  saved: boolean
  onToggleSave: () => void
}) {
  const c = forecast.current
  const cond = describe(c.code)
  const mood = !c.isDay ? 'night' : cond.sky === 'clear' || cond.sky === 'partly' ? 'day' : 'grey'
  const temp = useCountUp(c.temperature)
  // Roughly a fresh breeze (Beaufort 4) and up.
  const kmh = units === 'metric' ? c.wind : c.wind * 1.609
  const breezy = kmh >= 20

  return (
    <section className={`card now now--${mood}`} aria-labelledby="now-title">
      <div className="now-puffs" aria-hidden="true" />
      <SkyFx sky={cond.sky} tone="light" />
      {breezy && <WindGusts kmh={kmh} />}
      <div className="place-row">
        <p className="place-pill">
          <MapPin size={18} weight="regular" aria-hidden="true" />
          <span className="place-name">
            {place.name}
            {place.region && `, ${place.region.split(', ').pop()}`}
          </span>
        </p>
        <button
          type="button"
          className="save-btn"
          aria-pressed={saved}
          onClick={onToggleSave}
          title={saved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
        >
          <Star size={18} weight={saved ? 'fill' : 'regular'} />
          <span className="sr-only">{saved ? `Remove ${place.name} from saved cities` : `Save ${place.name}`}</span>
        </button>
      </div>

      <div className="now-head">
        <h2 id="now-title">{cond.label}</h2>
        <p className="muted">Now</p>
      </div>

      <WeatherArt sky={cond.sky} isDay={c.isDay} className="now-art float" />

      <div className="now-temp">
        <p className="temp-xl">
          {round(temp)}
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
        <p>Save cities with the star on the weather card to compare them here.</p>
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
                <WeatherArt sky={cond.sky} isDay={s.isDay} className="city-art" still />
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

function pollenLevel(v: number) {
  if (v < 10) return 'low'
  if (v < 50) return 'moderate'
  return 'high'
}

export function AirCard({ air, isDay, sky }: { air: AirQuality | null | undefined; isDay: boolean; sky: Forecast['current']['code'] }) {
  const cond = describe(sky)
  const aqi = air?.aqi ?? null
  const pct = aqi == null ? 0 : Math.min(aqi / 300, 1)
  const fmt = (v: number | null) => (v == null ? '--' : v < 10 ? v.toFixed(1) : String(Math.round(v)))
  return (
    <section className="card air" aria-labelledby="air-title">
      <div className="air-stars" aria-hidden="true" />
      <div className="air-copy">
        <h2 id="air-title">Air quality</h2>
        {air === undefined ? (
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
        {air && (
          <dl className="air-parts">
            <div>
              <dt>PM2.5</dt>
              <dd>{fmt(air.pm25)}</dd>
            </div>
            <div>
              <dt>PM10</dt>
              <dd>{fmt(air.pm10)}</dd>
            </div>
            <div>
              <dt>Ozone</dt>
              <dd>{fmt(air.ozone)}</dd>
            </div>
            <div>
              <dt>NO₂</dt>
              <dd>{fmt(air.no2)}</dd>
            </div>
          </dl>
        )}
        {air?.pollen && (
          <p className="air-pollen">
            Pollen:{' '}
            {air.pollen.length === 0
              ? 'none right now'
              : air.pollen
                  .slice(0, 2)
                  .map((p) => `${p.name} ${pollenLevel(p.value)}`)
                  .join(', ')}
          </p>
        )}
      </div>
      <WeatherArt sky={cond.sky} isDay={isDay} className="air-art float" />
    </section>
  )
}

/* ----------------------------------------------------------- Tomorrow */

export function TomorrowCard({ place, forecast, units }: { place: Place; forecast: Forecast; units: Units }) {
  const d = forecast.daily
  const cond = describe(d.code[1])
  const wet = cond.sky === 'rain' || cond.sky === 'drizzle' || cond.sky === 'storm' || cond.sky === 'snow'
  const high = useCountUp(d.max[1])
  return (
    <section className={`card tomorrow ${wet ? 'tomorrow--wet' : 'tomorrow--dry'}`} aria-labelledby="tomorrow-title">
      <SkyFx sky={cond.sky} tone="lime" />
      <div className="tomorrow-head">
        <p className="muted">Tomorrow, {weekday(d.time[1])}</p>
        <h2 id="tomorrow-title">{place.name}</h2>
      </div>

      <WeatherArt sky={cond.sky} isDay className="tomorrow-art float" />

      <div className="tomorrow-foot">
        <p className="temp-lg">
          {round(high)}°{units === 'metric' ? 'C' : 'F'}
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

