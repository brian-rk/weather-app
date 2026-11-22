import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { ShareNetwork } from '@phosphor-icons/react'
import { Sidebar } from './components/Sidebar'
import { Search } from './components/Search'
import { DayParts } from './components/DayParts'
import { HourlyChart } from './components/HourlyChart'
import { WeekCard } from './components/WeekCard'
import { Conditions } from './components/Conditions'
import { SavedPanel, MAX_SAVED } from './components/SavedPanel'
import { ThemeMenu } from './components/ThemeMenu'
import { AirCard, CityList, ErrorCard, NowCard, TomorrowCard } from './components/Cards'
import { useTheme, type ThemeSetting } from './lib/theme'
import {
  DEFAULT_PLACE,
  DEFAULT_SAVED,
  fetchAirQuality,
  fetchForecast,
  fetchSnapshots,
  placeFromSearch,
  placeToSearch,
  reverseGeocode,
  timeAgo,
  type AirQuality,
  type Forecast,
  type Place,
  type Snapshot,
  type Units,
} from './lib/weather'

// MapLibre is the heaviest dependency; keep it out of the first paint.
const MapCard = lazy(() => import('./components/MapCard').then((m) => ({ default: m.MapCard })))

const AUTO_REFRESH_MS = 15 * 60 * 1000
const STALE_ON_RETURN_MS = 10 * 60 * 1000

function usePersisted<T>(key: string, initial: T, override?: T | null) {
  const [value, setValue] = useState<T>(() => {
    if (override != null) return override
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

/** Data tagged with the place + units it was loaded for, so stale data never shows under a new city. */
type Tagged<T> = { key: string; data: T }

export default function App() {
  // A shared link (?city=…&lat=…&lon=…) wins over whatever was stored.
  const [fromUrl] = useState(() => placeFromSearch(window.location.search))
  const [place, setPlace] = usePersisted<Place>('nimbus.place', DEFAULT_PLACE, fromUrl.place)
  const [saved, setSaved] = usePersisted<Place[]>('nimbus.saved', DEFAULT_SAVED)
  const [units, setUnits] = usePersisted<Units>('nimbus.units', 'metric', fromUrl.units)
  const [themeSetting, setThemeSetting] = usePersisted<ThemeSetting>('nimbus.theme', 'system')

  const key = `${place.id}|${units}`
  const [forecastState, setForecastState] = useState<Tagged<Forecast> | null>(null)
  const [airState, setAirState] = useState<Tagged<AirQuality | null> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [snaps, setSnaps] = useState<(Snapshot | undefined)[]>([])
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [mapExpanded, setMapExpanded] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [savedOpen, setSavedOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const savedBtn = useRef<HTMLButtonElement>(null)
  const themeBtn = useRef<HTMLButtonElement>(null)

  // Only show data that belongs to the current place and units.
  const forecast = forecastState?.key === key ? forecastState.data : null
  const air = airState?.key === key ? airState.data : undefined
  const isSaved = saved.some((p) => p.id === place.id)
  const others = saved.filter((p) => p.id !== place.id).slice(0, 2)
  const dark = useTheme(themeSetting, forecast ? forecast.current.isDay : null)

  // Main forecast + air quality. Refreshes keep the old data on screen.
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    fetchForecast(place, units, ctrl.signal)
      .then((data) => {
        setForecastState({ key, data })
        setUpdatedAt(Date.now())
        setLoading(false)
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return
        setError(e.message || 'Network error')
        setLoading(false)
      })
    fetchAirQuality(place, ctrl.signal)
      .then((data) => setAirState({ key, data }))
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setAirState({ key, data: null })
      })
    return () => ctrl.abort()
  }, [place, units, nonce, key])

  // Snapshots for the comparison cities.
  const othersKey = others.map((p) => p.id).join('|')
  useEffect(() => {
    const ctrl = new AbortController()
    fetchSnapshots(others, units, ctrl.signal)
      .then(setSnaps)
      .catch(() => {})
    return () => ctrl.abort()
    // `others` is derived from othersKey; listing it would refetch every render.
  }, [othersKey, units, nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep "Updated … ago" current, refresh every 15 minutes, and catch up
  // when the tab comes back after a while.
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000)
    const auto = window.setInterval(() => setNonce((n) => n + 1), AUTO_REFRESH_MS)
    return () => {
      window.clearInterval(tick)
      window.clearInterval(auto)
    }
  }, [])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setNow(Date.now())
      if (updatedAt && Date.now() - updatedAt > STALE_ON_RETURN_MS) setNonce((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [updatedAt])

  // Mirror the current place in the address bar so it can be bookmarked or shared.
  useEffect(() => {
    const next = placeToSearch(place, units)
    if (window.location.search !== next) window.history.replaceState(null, '', next)
  }, [place, units])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(t)
  }, [notice])

  const select = useCallback((next: Place) => setPlace(next), [setPlace])

  const toggleSave = () => {
    if (isSaved) {
      setSaved((list) => list.filter((p) => p.id !== place.id))
      setNotice(`Removed ${place.name} from saved cities.`)
    } else if (saved.length >= MAX_SAVED) {
      setNotice(`You can save up to ${MAX_SAVED} cities. Remove one from Saved first.`)
    } else {
      setSaved((list) => [...list, place])
      setNotice(`Saved ${place.name}.`)
    }
  }

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}${placeToSearch(place, units)}`
    const touch = window.matchMedia('(pointer: coarse)').matches
    try {
      if (touch && navigator.share) {
        await navigator.share({ title: `Weather in ${place.name}`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setNotice(`Link to ${place.name} copied.`)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return // share sheet dismissed
      setNotice(`Couldn't copy automatically. The address bar has the link to ${place.name}.`)
    }
  }

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setNotice('Location is not available in this browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const spot = await reverseGeocode(latitude, longitude).catch(() => null)
        setLocating(false)
        select({
          ...(spot ?? { region: '' }),
          id: `geo-${latitude.toFixed(2)},${longitude.toFixed(2)}`,
          name: spot?.name ?? 'Your location',
          latitude,
          longitude,
        } as Place)
      },
      () => {
        setLocating(false)
        setNotice('Location permission was denied. Search for your city instead.')
      },
      { timeout: 10000, maximumAge: 600000 },
    )
  }

  const [today] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }))
  const [hello] = useState(greeting)
  const status = loading ? (forecast ? 'Updating' : 'Loading') : updatedAt ? `Updated ${timeAgo(now - updatedAt)}` : ''

  return (
    <div className="shell">
      <Sidebar
        mapExpanded={mapExpanded}
        onToggleMap={() => setMapExpanded((v) => !v)}
        onLocate={locate}
        locating={locating}
        onRefresh={() => setNonce((n) => n + 1)}
        refreshing={loading}
        savedOpen={savedOpen}
        onToggleSaved={() => {
          setThemeOpen(false)
          setSavedOpen((v) => !v)
        }}
        savedRef={savedBtn}
        themeOpen={themeOpen}
        onToggleTheme={() => {
          setSavedOpen(false)
          setThemeOpen((v) => !v)
        }}
        themeRef={themeBtn}
      />

      <SavedPanel
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        trigger={savedBtn}
        saved={saved}
        current={place}
        units={units}
        onOpenPlace={select}
        onChange={setSaved}
      />
      <ThemeMenu
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        trigger={themeBtn}
        value={themeSetting}
        onChange={setThemeSetting}
      />

      <main className="main">
        <header className="topbar">
          <div className="hello">
            <p className="muted">
              {hello}
              {status && (
                <span className="status" aria-live="polite">
                  {' '}
                  · {status}
                </span>
              )}
            </p>
            <h1>{today}</h1>
          </div>
          <Search onSelect={select} />
          <div className="topbar-actions">
            <button type="button" className="icon-btn icon-btn--soft" onClick={share} title="Share this forecast">
              <ShareNetwork size={18} />
              <span className="sr-only">Share the forecast for {place.name}</span>
            </button>
            <div className="units" role="radiogroup" aria-label="Units">
              {(['metric', 'imperial'] as const).map((u) => (
                <button key={u} type="button" role="radio" aria-checked={units === u} onClick={() => setUnits(u)}>
                  °{u === 'metric' ? 'C' : 'F'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        <div className={`grid ${mapExpanded ? 'grid--map' : ''}`} aria-busy={loading}>
          <div className="area-now">
            {error && !forecast ? (
              <ErrorCard message={error} onRetry={() => setNonce((n) => n + 1)} />
            ) : forecast ? (
              <NowCard place={place} forecast={forecast} units={units} saved={isSaved} onToggleSave={toggleSave} />
            ) : (
              <div className="card skeleton skeleton-card" />
            )}
          </div>

          <div className="area-map">
            <Suspense fallback={<div className="card skeleton skeleton-card" />}>
              <MapCard
                place={place}
                forecast={forecast}
                units={units}
                expanded={mapExpanded}
                onToggleExpanded={() => setMapExpanded((v) => !v)}
                onPick={select}
                dark={dark}
              />
            </Suspense>
          </div>

          <div className="area-side">
            <CityList places={others} snapshots={snaps} units={units} onSelect={select} />
            <AirCard air={air} isDay={forecast?.current.isDay ?? true} sky={forecast?.current.code ?? 2} />
          </div>

          <div className="area-day">
            {forecast ? <DayParts forecast={forecast} units={units} /> : <div className="skeleton skeleton-card" />}
          </div>

          <div className="area-tomorrow">
            {forecast ? (
              <TomorrowCard place={place} forecast={forecast} units={units} />
            ) : (
              <div className="card skeleton skeleton-card" />
            )}
          </div>

          <div className="area-hourly">
            {forecast ? <HourlyChart forecast={forecast} units={units} /> : <div className="skeleton skeleton-card" />}
          </div>

          <div className="area-week">
            {forecast ? <WeekCard forecast={forecast} /> : <div className="skeleton skeleton-card" />}
          </div>

          <div className="area-cond">
            {forecast ? <Conditions forecast={forecast} units={units} /> : <div className="skeleton skeleton-card" />}
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
