import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Sidebar, type NavId } from './components/Sidebar'
import { Header } from './components/Header'
import { DayParts } from './components/DayParts'
import { HourlyChart } from './components/HourlyChart'
import { WeekCard } from './components/WeekCard'
import { Conditions } from './components/Conditions'
import { SavedPanel, MAX_SAVED } from './components/SavedPanel'
import { BriefingPanel } from './components/BriefingPanel'
import { CalendarPanel } from './components/CalendarPanel'
import { AlertsPanel } from './components/AlertsPanel'
import { PlannerPanel } from './components/PlannerPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { AirCard, CityList, ErrorCard, NowCard, TomorrowCard } from './components/Cards'
import { useTheme, type ThemeSetting } from './lib/theme'
import { DEFAULT_PREFS, PrefsContext, unitsOf, type Prefs } from './lib/prefs'
import { detectLang, setLang, t } from './lib/i18n'
import { SharePanel } from './components/SharePanel'
import { ComparePanel } from './components/ComparePanel'
import { CommandPalette, type Command } from './components/CommandPalette'
import {
  ArrowClockwise,
  ArrowsLeftRight,
  BellSimple,
  CalendarBlank,
  ChatCircleText,
  Crosshair,
  GearSix,
  ListChecks,
  MapTrifold,
  Moon,
  ShareNetwork,
  SidebarSimple,
  Star,
  Sun,
  Thermometer,
  Translate,
} from '@phosphor-icons/react'
import { LANGUAGES } from './lib/i18n'
import { briefing, computeAlerts, planDay } from './lib/insights'
import {
  DEFAULT_PLACE,
  DEFAULT_SAVED,
  fetchAirQuality,
  fetchForecast,
  fetchSnapshots,
  forecastForDay,
  placeFromSearch,
  placeToSearch,
  reverseGeocode,
  shortDate,
  timeAgo,
  type AirQuality,
  type Forecast,
  type Place,
  type Snapshot,
  type Units,
} from './lib/weather'

// MapLibre is the heaviest dependency; keep it out of the first paint.
const MapCard = lazy(() => import('./components/MapCard').then((m) => ({ default: m.MapCard })))

const STALE_ON_RETURN_MS = 10 * 60 * 1000

type PanelId = 'briefing' | 'calendar' | 'alerts' | 'planner' | 'compare' | 'share' | 'saved' | 'settings'
type Panel = { id: PanelId; side: 'left' | 'right' } | null

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function usePersisted<T>(key: string, initial: T | (() => T), override?: T | null) {
  const [value, setValue] = useState<T>(() => {
    if (override != null) return override
    const stored = readStored<T>(key)
    if (stored != null) return stored
    return typeof initial === 'function' ? (initial as () => T)() : initial
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

function greetingFor(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Run a state change inside a View Transition when the browser supports it. */
function transition(update: () => void) {
  if (!document.startViewTransition || reducedMotion()) {
    update()
    return
  }
  document.startViewTransition(() => flushSync(update))
}

/** Tagged with the place + units it was loaded for, so stale data never shows under a new city. */
type Tagged<T> = { key: string; data: T }

export default function App() {
  const [fromUrl] = useState(() => placeFromSearch(window.location.search))

  // Preferences, migrating the earlier standalone units setting.
  const [rawPrefs, setPrefs] = usePersisted<Prefs>('nimbus.prefs', () => ({
    ...DEFAULT_PREFS,
    temp: readStored<Units>('nimbus.units') === 'imperial' ? 'f' : 'c',
    lang: detectLang(),
  }))
  const prefs = useMemo<Prefs>(
    () => ({ ...DEFAULT_PREFS, ...rawPrefs, alerts: { ...DEFAULT_PREFS.alerts, ...rawPrefs.alerts } }),
    [rawPrefs],
  )
  useEffect(() => {
    if (fromUrl.units) setPrefs((p) => ({ ...p, temp: fromUrl.units === 'imperial' ? 'f' : 'c' }))
  }, [fromUrl, setPrefs])
  const units = unitsOf(prefs)
  setLang(prefs.lang)

  const startPlace = fromUrl.place ?? (prefs.startWith === 'home' ? prefs.home : null)
  const [place, setPlace] = usePersisted<Place>('nimbus.place', DEFAULT_PLACE, startPlace)
  const [saved, setSaved] = usePersisted<Place[]>('nimbus.saved', DEFAULT_SAVED)
  const [themeSetting, setThemeSetting] = usePersisted<ThemeSetting>('nimbus.theme', 'system')
  const [sidebarOpen, setSidebarOpen] = usePersisted<boolean>('nimbus.sidebar', false)
  const [seenAlerts, setSeenAlerts] = usePersisted<string[]>('nimbus.seenAlerts', [])
  const [notified, setNotified] = usePersisted<string[]>('nimbus.notifiedAlerts', [])

  const key = `${place.id}|${units}|${prefs.wind}`
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
  const [panel, setPanel] = useState<Panel>(null)
  const [day, setDay] = useState(0)
  const [bellRing, setBellRing] = useState(0)
  const [greeting] = useState(greetingFor)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const contentRef = useRef<HTMLElement>(null)

  const base = forecastState?.key === key ? forecastState.data : null
  const forecast = useMemo(() => (base ? forecastForDay(base, day) : null), [base, day])
  const air = airState?.key === key ? airState.data : undefined
  const isSaved = saved.some((p) => p.id === place.id)
  const others = saved.filter((p) => p.id !== place.id).slice(0, 2)
  const dark = useTheme(themeSetting, base ? base.current.isDay : null)

  // Insights from the forecast.
  const alerts = useMemo(() => (base ? computeAlerts(base, air, units, prefs) : []), [base, air, units, prefs])
  const plans = useMemo(() => (forecast ? planDay(forecast, units, prefs) : []), [forecast, units, prefs])
  const todaysPlans = useMemo(() => (base ? planDay(forecastForDay(base, 0), units, prefs) : []), [base, units, prefs])
  const lines = useMemo(
    () => (base ? briefing(base, air, place, prefs, alerts, todaysPlans) : []),
    [base, air, place, prefs, alerts, todaysPlans],
  )
  const unread = useMemo(() => new Set(alerts.filter((a) => !seenAlerts.includes(a.id)).map((a) => a.id)), [alerts, seenAlerts])

  // Main forecast + air quality. Refreshes keep the old data on screen.
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    fetchForecast(place, units, ctrl.signal, prefs.wind)
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
  }, [place, units, prefs.wind, nonce, key])

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

  // "Updated … ago", the chosen auto-refresh interval, and catching up after a break.
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(tick)
  }, [])
  useEffect(() => {
    if (!prefs.refreshMin) return
    const auto = window.setInterval(() => setNonce((n) => n + 1), prefs.refreshMin * 60_000)
    return () => window.clearInterval(auto)
  }, [prefs.refreshMin])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setNow(Date.now())
      if (prefs.refreshMin && updatedAt && Date.now() - updatedAt > STALE_ON_RETURN_MS) setNonce((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [updatedAt, prefs.refreshMin])

  // Ring the bell when the number of unread alerts goes up.
  const lastUnread = useRef(0)
  useEffect(() => {
    if (unread.size > lastUnread.current) setBellRing((n) => n + 1)
    lastUnread.current = unread.size
  }, [unread])

  // Browser notifications for alerts not announced before.
  useEffect(() => {
    if (!prefs.notify || !('Notification' in window) || Notification.permission !== 'granted') return
    const fresh = alerts.filter((a) => !notified.includes(a.id))
    if (fresh.length === 0) return
    for (const a of fresh) new Notification(`${a.title} · ${place.name}`, { body: a.body, tag: a.id })
    setNotified((list) => [...list, ...fresh.map((a) => a.id)].slice(-100))
  }, [alerts, prefs.notify, notified, setNotified, place.name])

  // Mirror the current place in the address bar so it can be bookmarked or shared.
  useEffect(() => {
    const next = placeToSearch(place, units)
    if (window.location.search !== next) window.history.replaceState(null, '', next)
  }, [place, units])

  // Ctrl/⌘+K opens the command palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(t)
  }, [notice])

  // A new city always starts on today.
  const select = useCallback(
    (next: Place) => {
      setPlace(next)
      setDay(0)
    },
    [setPlace],
  )

  const openPanel = (id: PanelId, side: 'left' | 'right') => {
    setPanel((p) => {
      if (p?.id === id) return null
      return { id, side }
    })
  }
  const closePanel = useCallback(() => {
    setPanel((p) => {
      // Opening the alerts counts as reading them.
      if (p?.id === 'alerts') setSeenAlerts((s) => [...new Set([...s, ...alerts.map((a) => a.id)])].slice(-200))
      return null
    })
  }, [alerts, setSeenAlerts])

  const toggleMap = () => transition(() => setMapExpanded((v) => !v))

  const onNav = (id: NavId) => {
    if (id === 'dashboard') {
      setPanel(null)
      if (mapExpanded) toggleMap()
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (id === 'map') {
      setPanel(null)
      toggleMap()
      return
    }
    openPanel(id, 'left')
  }

  const setTheme = (t: ThemeSetting, origin?: { x: number; y: number }) => {
    const root = document.documentElement
    if (origin) {
      root.style.setProperty('--vt-x', `${origin.x}px`)
      root.style.setProperty('--vt-y', `${origin.y}px`)
    }
    root.classList.add('theme-transition')
    transition(() => setThemeSetting(t))
    window.setTimeout(() => root.classList.remove('theme-transition'), 700)
  }

  const toggleSave = () => {
    if (isSaved) {
      setSaved((list) => list.filter((p) => p.id !== place.id))
      setNotice(t('Removed {place} from saved cities.', { place: place.name }))
    } else if (saved.length >= MAX_SAVED) {
      setNotice(t('You can save up to {n} cities. Remove one from Saved first.', { n: MAX_SAVED }))
    } else {
      setSaved((list) => [...list, place])
      setNotice(t('Saved {place}.', { place: place.name }))
    }
  }

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${placeToSearch(place, units)}`
    const touch = window.matchMedia('(pointer: coarse)').matches
    try {
      if (touch && navigator.share) {
        await navigator.share({ title: `Weather in ${place.name}`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setNotice(t('Link to {place} copied.', { place: place.name }))
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setNotice(t("Couldn't copy automatically. The address bar has the link to {place}.", { place: place.name }))
    }
  }

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setNotice(t('Location is not available in this browser.'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const spot = await reverseGeocode(latitude, longitude).catch(() => null)
        setLocating(false)
        select({
          id: `geo-${latitude.toFixed(2)},${longitude.toFixed(2)}`,
          name: spot?.name ?? t('Your location'),
          region: spot?.region ?? '',
          latitude,
          longitude,
        })
      },
      () => {
        setLocating(false)
        setNotice(t('Location permission was denied. Search for your city instead.'))
      },
      { timeout: 10000, maximumAge: 600000 },
    )
  }

  const commands: Command[] = [
    { id: 'briefing', label: t('Daily briefing'), keywords: 'summary chat', icon: <ChatCircleText size={18} />, run: () => setPanel({ id: 'briefing', side: 'right' }) },
    { id: 'calendar', label: t('Forecast calendar'), keywords: 'days week future', icon: <CalendarBlank size={18} />, run: () => setPanel({ id: 'calendar', side: 'right' }) },
    { id: 'alerts', label: t('Weather alerts'), keywords: 'warnings bell', icon: <BellSimple size={18} />, run: () => setPanel({ id: 'alerts', side: 'right' }) },
    { id: 'planner', label: t('Plan your day'), keywords: 'activities run laundry', icon: <ListChecks size={18} />, run: () => setPanel({ id: 'planner', side: 'left' }) },
    { id: 'compare', label: t('Compare cities'), keywords: 'side by side chart', icon: <ArrowsLeftRight size={18} />, run: () => setPanel({ id: 'compare', side: 'left' }) },
    { id: 'saved', label: t('Saved cities'), keywords: 'favourites', icon: <Star size={18} />, run: () => setPanel({ id: 'saved', side: 'left' }) },
    { id: 'share', label: t('Share this forecast'), keywords: 'picture image card link', icon: <ShareNetwork size={18} />, run: () => setPanel({ id: 'share', side: 'right' }) },
    { id: 'settings', label: t('Settings'), keywords: 'preferences units profile', icon: <GearSix size={18} />, run: () => setPanel({ id: 'settings', side: 'left' }) },
    { id: 'map', label: mapExpanded ? t('Collapse map') : t('Expand map'), keywords: 'map', icon: <MapTrifold size={18} />, run: toggleMap },
    { id: 'locate', label: t('Use my location'), keywords: 'gps here', icon: <Crosshair size={18} />, run: locate },
    { id: 'refresh', label: t('Refresh forecast'), keywords: 'reload update', icon: <ArrowClockwise size={18} />, run: () => setNonce((n) => n + 1) },
    { id: 'units', label: units === 'metric' ? t('Switch to °F') : t('Switch to °C'), keywords: 'fahrenheit celsius units', icon: <Thermometer size={18} />, run: () => setPrefs((p) => ({ ...p, temp: p.temp === 'c' ? 'f' : 'c' })) },
    { id: 'theme', label: dark ? t('Switch to light theme') : t('Switch to dark theme'), keywords: 'dark light mode appearance', icon: dark ? <Sun size={18} /> : <Moon size={18} />, run: () => setTheme(dark ? 'light' : 'dark') },
    { id: 'sidebar', label: sidebarOpen ? t('Collapse sidebar') : t('Expand sidebar'), keywords: 'menu', icon: <SidebarSimple size={18} />, run: () => setSidebarOpen((v) => !v) },
    ...(day > 0 ? [{ id: 'today', label: t('Back to today'), icon: <CalendarBlank size={18} />, run: () => transition(() => setDay(0)) }] : []),
    ...LANGUAGES.filter((l) => l.id !== prefs.lang).map((l) => ({
      id: `lang-${l.id}`,
      label: t('Language: {name}', { name: l.label }),
      keywords: 'language translate idioma langue sprache lugha',
      icon: <Translate size={18} />,
      run: () => setPrefs((p) => ({ ...p, lang: l.id })),
    })),
  ]

  const status = loading ? (base ? t('Updating') : t('Loading')) : updatedAt ? t('Updated {ago}', { ago: timeAgo(now - updatedAt) }) : ''
  const active: NavId =
    panel && panel.side === 'left' && panel.id !== 'alerts' ? (panel.id as NavId) : mapExpanded ? 'map' : 'dashboard'
  const viewKey = `${key}|${day}`
  const dayLabel = day === 0 || !forecast ? t('the rest of today') : shortDate(forecast.current.time.slice(0, 10))

  return (
    <PrefsContext.Provider value={prefs}>
      <div key={prefs.lang} className={`shell ${sidebarOpen ? 'has-wide-rail' : ''}`}>
        <Sidebar
          active={active}
          onNav={onNav}
          expanded={sidebarOpen}
          onToggleExpanded={() => setSidebarOpen((v) => !v)}
          onRefresh={() => setNonce((n) => n + 1)}
          refreshing={loading}
        />

        <SavedPanel
          open={panel?.id === 'saved'}
          side={panel?.side}
          onClose={closePanel}
          saved={saved}
          current={place}
          units={units}
          onOpenPlace={select}
          onChange={setSaved}
        />
        <BriefingPanel open={panel?.id === 'briefing'} side={panel?.side} onClose={closePanel} lines={lines} placeName={place.name} />
        <CalendarPanel
          open={panel?.id === 'calendar'}
          side={panel?.side}
          onClose={closePanel}
          forecast={base}
          selected={day}
          onSelect={(d) => transition(() => setDay(d))}
        />
        <AlertsPanel
          open={panel?.id === 'alerts'}
          side={panel?.side}
          onClose={closePanel}
          alerts={alerts}
          unread={unread}
          onMarkAllRead={() => setSeenAlerts((s) => [...new Set([...s, ...alerts.map((a) => a.id)])])}
          onOpenSettings={() => setPanel({ id: 'settings', side: panel?.side ?? 'right' })}
        />
        <ComparePanel
          open={panel?.id === 'compare'}
          side={panel?.side}
          onClose={closePanel}
          place={place}
          saved={saved}
          units={units}
          onOpenPlace={(p) => {
            select(p)
            closePanel()
          }}
        />
        <SharePanel
          open={panel?.id === 'share'}
          side={panel?.side}
          onClose={closePanel}
          place={place}
          forecast={forecast}
          units={units}
          onCopyLink={copyLink}
        />
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          commands={commands}
          saved={saved}
          onPickPlace={select}
        />
        <PlannerPanel open={panel?.id === 'planner'} side={panel?.side} onClose={closePanel} plans={plans} dayLabel={dayLabel} />
        <SettingsPanel
          open={panel?.id === 'settings'}
          side={panel?.side}
          onClose={closePanel}
          prefs={prefs}
          onChange={setPrefs}
          theme={themeSetting}
          onTheme={setTheme}
          current={place}
        />

        <main className="main" ref={contentRef}>
          <Header
            prefs={prefs}
            greeting={greeting}
            status={status}
            onSelect={select}
            onLocate={locate}
            locating={locating}
            units={units}
            onUnits={(u) => setPrefs((p) => ({ ...p, temp: u === 'imperial' ? 'f' : 'c' }))}
            unreadAlerts={unread.size}
            bellRing={bellRing}
            open={panel?.side === 'right' ? panel.id : null}
            onOpen={(id) => openPanel(id, 'right')}
            onPalette={() => setPaletteOpen(true)}
          />

          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {day > 0 && forecast && (
            <p className="day-banner" role="status">
              <span>
                {t('Viewing')} <strong>{shortDate(forecast.current.time.slice(0, 10))}</strong>
              </span>
              <button type="button" className="btn-ghost btn-ghost--small" onClick={() => transition(() => setDay(0))}>
                {t('Back to today')}
              </button>
            </p>
          )}

          <div className={`grid ${mapExpanded ? 'grid--map' : ''}`} aria-busy={loading}>
            <div className="area-now">
              {error && !forecast ? (
                <ErrorCard message={error} onRetry={() => setNonce((n) => n + 1)} />
              ) : forecast ? (
                <div className="swap" key={viewKey}>
                  <NowCard
                    place={place}
                    forecast={forecast}
                    units={units}
                    saved={isSaved}
                    onToggleSave={toggleSave}
                    onShare={() => setPanel({ id: 'share', side: 'right' })}
                  />
                </div>
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
                  onToggleExpanded={toggleMap}
                  onPick={select}
                  dark={dark}
                />
              </Suspense>
            </div>

            <div className="area-side">
              <CityList places={others} snapshots={snaps} units={units} onSelect={select} />
              <AirCard
                air={air}
                isDay={forecast?.current.isDay ?? true}
                sky={forecast?.current.code ?? 2}
                humidity={forecast?.current.humidity ?? null}
              />
            </div>

            <div className="area-day">
              {forecast ? (
                <div className="swap" key={viewKey}>
                  <DayParts forecast={forecast} units={units} />
                </div>
              ) : (
                <div className="skeleton skeleton-card" />
              )}
            </div>

            <div className="area-tomorrow">
              {forecast ? (
                <div className="swap" key={viewKey}>
                  <TomorrowCard place={place} forecast={forecast} units={units} />
                </div>
              ) : (
                <div className="card skeleton skeleton-card" />
              )}
            </div>

            <div className="area-hourly">
              {forecast ? (
                <div className="swap" key={viewKey}>
                  <HourlyChart forecast={forecast} units={units} />
                </div>
              ) : (
                <div className="skeleton skeleton-card" />
              )}
            </div>

            <div className="area-week">
              {base ? (
                <WeekCard forecast={forecastForDay(base, 0)} selected={day} onSelect={(d) => transition(() => setDay(d))} />
              ) : (
                <div className="skeleton skeleton-card" />
              )}
            </div>

            <div className="area-cond">
              {forecast ? (
                <div className="swap" key={viewKey}>
                  <Conditions forecast={forecast} units={units} />
                </div>
              ) : (
                <div className="skeleton skeleton-card" />
              )}
            </div>
          </div>

          <footer className="credit">
            {t('Forecast data by')} <a href="https://open-meteo.com/">Open-Meteo</a>
            {error && base && <span> · {t('Last refresh failed, showing earlier data')}</span>}
          </footer>
        </main>
      </div>
    </PrefsContext.Provider>
  )
}
