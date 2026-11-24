import type { PointerEvent } from 'react'
import { CloudRain, Drop, MapPin, ShareNetwork, Star } from '@phosphor-icons/react'
import { WeatherArt } from './WeatherArt'
import { SkyFx, WindGusts } from './SkyFx'
import { Odometer } from './Odometer'
import { TomorrowScene } from './TomorrowScene'
import { outfitFor } from '../lib/outfit'
import { useCountUp } from '../lib/useCountUp'
import { toCelsius, toKmh, usePrefs } from '../lib/prefs'
import {
  aqiLabel,
  describe,
  formatVisibility,
  round,
  shortDate,
  weekday,
  type AirQuality,
  type Forecast,
  type Place,
  type Snapshot,
  type Units,
} from '../lib/weather'
import { t } from '../lib/i18n'

/* ---------------------------------------------------------------- Now */

/** Tilt the illustration toward the pointer (CSS variables, no re-render). */
function tilt(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  e.currentTarget.style.setProperty('--tilt-x', `${(-y * 10).toFixed(2)}deg`)
  e.currentTarget.style.setProperty('--tilt-y', `${(x * 14).toFixed(2)}deg`)
  // Layer offsets for the parallax depth (-0.5 to 0.5).
  e.currentTarget.style.setProperty('--px', x.toFixed(3))
  e.currentTarget.style.setProperty('--py', y.toFixed(3))
}
function untilt(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty('--tilt-x', '0deg')
  e.currentTarget.style.setProperty('--tilt-y', '0deg')
  e.currentTarget.style.setProperty('--px', '0')
  e.currentTarget.style.setProperty('--py', '0')
}

export function NowCard({
  place,
  forecast,
  units,
  saved,
  onToggleSave,
  onShare,
}: {
  place: Place
  forecast: Forecast
  units: Units
  saved: boolean
  onToggleSave: () => void
  onShare: () => void
}) {
  const prefs = usePrefs()
  const c = forecast.current
  const cond = describe(c.code)
  const future = (forecast.view?.day ?? 0) > 0
  const mood = !c.isDay ? 'night' : cond.sky === 'clear' || cond.sky === 'partly' ? 'day' : 'grey'
  // Roughly a fresh breeze (Beaufort 4) and up.
  const kmh = toKmh(c.wind, prefs.wind)
  const breezy = kmh >= 20
  const when = future ? shortDate(c.time.slice(0, 10)) : t('Now')

  return (
    <section className={`card now now--${mood}`} aria-labelledby="now-title" onPointerMove={tilt} onPointerLeave={untilt}>
      <div className="now-sky" aria-hidden="true">
        <span className={`sky-layer sky-day ${mood === 'day' ? 'is-on' : ''}`} />
        <span className={`sky-layer sky-grey ${mood === 'grey' ? 'is-on' : ''}`} />
        <span className={`sky-layer sky-night ${mood === 'night' ? 'is-on' : ''}`} />
      </div>
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
          title={saved ? t('Remove {place} from saved', { place: place.name }) : t('Save {place}', { place: place.name })}
        >
          <Star size={18} weight={saved ? 'fill' : 'regular'} />
          <span className="sr-only">{saved ? t('Remove {place} from saved cities', { place: place.name }) : t('Save {place}', { place: place.name })}</span>
        </button>
        <button type="button" className="save-btn" onClick={onShare} title={t('Share this forecast')}>
          <ShareNetwork size={18} />
          <span className="sr-only">{t('Share the forecast for {place}', { place: place.name })}</span>
        </button>
      </div>

      <div className="now-head">
        <h2 id="now-title">{t('Weather')}</h2>
        <p className="muted">
          {when} · {cond.label}
        </p>
      </div>

      <div className="now-art-wrap">
        <WeatherArt sky={cond.sky} isDay={c.isDay} className="now-art float" />
      </div>

      <div className="now-temp">
        <p className="temp-xl">
          <Odometer value={c.temperature} />
          <span>°{units === 'metric' ? 'C' : 'F'}</span>
        </p>
        <p className="muted">
          {future ? t('Low {low}° · feels like {feels}° at midday', { low: round(forecast.daily.min[0]), feels: round(c.feelsLike) }) : t('Feels like {feels}°', { feels: round(c.feelsLike) })}
        </p>
      </div>

      <dl className="now-stats">
        <div className="stat stat--lime">
          <dt>{t('Visibility')}</dt>
          <dd>{formatVisibility(c.visibility, units)}</dd>
        </div>
        <div className="stat">
          <dt>{t('Humidity')}</dt>
          <dd>{round(c.humidity)}%</dd>
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
        <p>{t('Save cities with the star on the weather card to compare them here.')}</p>
      </div>
    )
  }
  return (
    <ul className="cities" aria-label={t('Other cities')}>
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
                <small>{cond?.label ?? t('Loading')}</small>
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
  if (v < 10) return t('low')
  if (v < 50) return t('moderate')
  return t('high')
}

export function AirCard({
  air,
  isDay,
  sky,
  humidity,
}: {
  air: AirQuality | null | undefined
  isDay: boolean
  sky: Forecast['current']['code']
  humidity: number | null
}) {
  const cond = describe(sky)
  const aqi = air?.aqi ?? null
  const pct = aqi == null ? 0 : Math.min(aqi / 300, 1)
  const fmt = (v: number | null) => (v == null ? '--' : v < 10 ? v.toFixed(1) : String(Math.round(v)))
  return (
    <section className="card air" aria-labelledby="air-title">
      <div className="air-stars" aria-hidden="true" />
      <div className="air-copy">
        <h2 id="air-title">{t('Humidity')}</h2>
        {air === undefined ? (
          <span className="skeleton-line on-dark" />
        ) : (
          <>
            <p className="air-label">{aqi === null ? t('No air sensor nearby') : `${aqiLabel(aqi)} · AQI ${aqi}`}</p>
            <p className="air-value">
              {humidity == null ? '--' : round(humidity)}
              <small>%</small>
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
              <dt>{t('Ozone')}</dt>
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
            {t('Pollen:')}{' '}
            {air.pollen.length === 0
              ? t('none right now')
              : air.pollen
                  .slice(0, 2)
                  .map((p) => `${t(p.name)} ${pollenLevel(p.value)}`)
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
  const future = (forecast.view?.day ?? 0) > 0
  const outfit = outfitFor(cond.sky, toCelsius(d.max[1], units))
  return (
    <section
      className={`card tomorrow ${wet ? 'tomorrow--wet' : 'tomorrow--dry'}`}
      aria-labelledby="tomorrow-title"
      onPointerMove={tilt}
      onPointerLeave={untilt}
    >
      <SkyFx sky={cond.sky} tone="lime" />
      <div className="tomorrow-head">
        <p className="muted">{future ? t('Next day, {day}', { day: weekday(d.time[1]) }) : t('Tomorrow, {day}', { day: weekday(d.time[1]) })}</p>
        <h2 id="tomorrow-title">{place.name}</h2>
      </div>

      <TomorrowScene outfit={outfit} className="tomorrow-scene" />

      <div className="tomorrow-foot">
        <p className="temp-lg">
          {round(high)}°{units === 'metric' ? 'C' : 'F'}
          <span> / {round(d.min[1])}°</span>
        </p>
        <p className="tomorrow-meta">
          {cond.label}
          <span>
            <Drop size={14} aria-hidden="true" /> {t('{n}% chance', { n: d.precipitation[1] ?? 0 })}
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
        <h2>{t("The forecast didn't load")}</h2>
        <p className="muted">{message}. {t('Your saved cities are still here.')}</p>
      </div>
      <button type="button" className="btn-primary" onClick={onRetry}>
        {t('Try again')}
      </button>
    </section>
  )
}

