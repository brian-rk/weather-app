import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Search } from './components/Search'
import { DayParts } from './components/DayParts'
import { AirCard, CityList, ErrorCard, NowCard, TomorrowCard } from './components/Cards'
import {
  DEFAULT_PLACE,
  DEFAULT_SAVED,
  fetchAirQuality,
  fetchForecast,
  fetchSnapshots,
  type Forecast,
  type Place,
  type Snapshot,
  type Units,
} from './lib/weather'

// Leaflet is the heaviest dependency; keep it out of the first paint.
const MapCard = lazy(() => import('./components/MapCard').then((m) => ({ default: m.MapCard })))

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage full or disabled: keep in memory */
    }
  }, [key, value])
  return [value, setValue] as const
}

function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function App() {
  const [place, setPlace] = usePersisted<Place>('nimbus.place', DEFAULT_PLACE)
  const [saved, setSaved] = usePersisted<Place[]>('nimbus.saved', DEFAULT_SAVED)
  const [units, setUnits] = usePersisted<Units>('nimbus.units', 'metric')

  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aqi, setAqi] = useState<number | null | undefined>(undefined)
  const [snaps, setSnaps] = useState<(Snapshot | undefined)[]>([])
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const others = saved.filter((p) => p.id !== place.id).slice(0, 2)

  // Main forecast + air quality for the active place.
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    setAqi(undefined)
    fetchForecast(place, units, ctrl.signal)
      .then((f) => {
        setForecast(f)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return
        setError(e.message || 'Network error')
        setLoading(false)
      })
    fetchAirQuality(place, ctrl.signal)
      .then(setAqi)
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setAqi(null)
      })
    return () => ctrl.abort()
  }, [place, units, nonce])

  // Snapshots for the comparison cities.
  const othersKey = others.map((p) => p.id).join('|')
  useEffect(() => {
    const ctrl = new AbortController()
    setSnaps([])
    fetchSnapshots(others, units, ctrl.signal)
      .then(setSnaps)
      .catch(() => {})
    return () => ctrl.abort()
  }, [othersKey, units, nonce])

  /** Make `next` active; the place we leave becomes a quick-compare city. */
  const select = useCallback(
    (next: Place) => {
      if (next.id === place.id) return
      setSaved((list) => {
        const without = list.filter((p) => p.id !== next.id && p.id !== place.id)
        return [place, ...without].slice(0, 6)
      })
      setPlace(next)
    },
    [place, setPlace, setSaved],
  )

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setNotice('Location is not available in this browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        select({
          id: `geo-${pos.coords.latitude.toFixed(2)},${pos.coords.longitude.toFixed(2)}`,
          name: 'Your location',
          region: '',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      () => {
        setLocating(false)
        setNotice('Location permission was denied. Search for your city instead.')
      },
      { timeout: 10000, maximumAge: 600000 },
    )
  }

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(t)
  }, [notice])

  const [today] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }))
  const [hello] = useState(greeting)
  const ready = forecast && !loading

  return (
    <div className="shell">
      <Sidebar
        mapExpanded={mapExpanded}
        onToggleMap={() => setMapExpanded((v) => !v)}
        onLocate={locate}
        locating={locating}
        onRefresh={() => setNonce((n) => n + 1)}
        refreshing={loading}
      />

      <main className="main">
        <header className="topbar">
          <div className="hello">
            <p className="muted">{hello}</p>
            <h1>{today}</h1>
          </div>
          <Search onSelect={select} />
          <div className="units" role="radiogroup" aria-label="Units">
            {(['metric', 'imperial'] as const).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={units === u}
                onClick={() => setUnits(u)}
              >
                °{u === 'metric' ? 'C' : 'F'}
              </button>
            ))}
          </div>
        </header>

        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        <div className={`grid ${mapExpanded ? 'grid--map' : ''}`} aria-busy={loading}>
          {error && !forecast ? (
            <div className="area-now">
              <ErrorCard message={error} onRetry={() => setNonce((n) => n + 1)} />
            </div>
          ) : (
            <div className="area-now">
              {forecast ? (
                <NowCard place={place} forecast={forecast} units={units} />
              ) : (
                <div className="card skeleton skeleton-card" />
              )}
            </div>
          )}

          <div className="area-map">
            <Suspense fallback={<div className="card skeleton skeleton-card" />}>
              <MapCard
                place={place}
                forecast={forecast}
                units={units}
                expanded={mapExpanded}
                onToggleExpanded={() => setMapExpanded((v) => !v)}
              />
            </Suspense>
          </div>

          <div className="area-side">
            <CityList places={others} snapshots={snaps} units={units} onSelect={select} />
            <AirCard
              aqi={aqi}
              isDay={forecast?.current.isDay ?? true}
              sky={forecast?.current.code ?? 2}
            />
          </div>

          <div className="area-day">
            {ready ? <DayParts forecast={forecast} units={units} /> : <div className="skeleton skeleton-card" />}
          </div>

          <div className="area-tomorrow">
            {forecast ? (
              <TomorrowCard place={place} forecast={forecast} units={units} />
            ) : (
              <div className="card skeleton skeleton-card" />
            )}
          </div>
        </div>

        <footer className="credit">
          Forecast data by <a href="https://open-meteo.com/">Open-Meteo</a>
          {error && forecast && <span> · Last refresh failed, showing earlier data</span>}
        </footer>
      </main>
    </div>
  )
}
