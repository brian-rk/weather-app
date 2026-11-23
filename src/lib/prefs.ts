import { createContext, useContext } from 'react'
import type { Place, Units, WindUnit } from './weather'
import type { Lang } from './i18n'

export type AlertKind = 'storm' | 'rain' | 'snow' | 'wind' | 'heat' | 'frost' | 'uv' | 'air'

export const ALERT_KINDS: { id: AlertKind; label: string }[] = [
  { id: 'storm', label: 'Thunderstorms' },
  { id: 'rain', label: 'Heavy rain' },
  { id: 'snow', label: 'Snow' },
  { id: 'wind', label: 'Strong wind' },
  { id: 'heat', label: 'Heat' },
  { id: 'frost', label: 'Frost' },
  { id: 'uv', label: 'High UV' },
  { id: 'air', label: 'Poor air quality' },
]

export const AVATAR_COLORS = ['#f08a3c', '#3f8fc9', '#5aa469', '#8a6fd6', '#d65f7a', '#2f3b55']

export type Prefs = {
  temp: 'c' | 'f'
  wind: WindUnit
  pressure: 'hPa' | 'inHg'
  clock: '24' | '12'
  /** Minutes between automatic refreshes; 0 turns it off. */
  refreshMin: 0 | 5 | 15 | 30
  startWith: 'last' | 'home'
  home: Place | null
  name: string
  color: string
  /** Small data-URL avatar, resized on upload. */
  photo: string | null
  alerts: Record<AlertKind, boolean>
  notify: boolean
  lang: Lang
}

export const DEFAULT_PREFS: Prefs = {
  temp: 'c',
  wind: 'kmh',
  pressure: 'hPa',
  clock: '24',
  refreshMin: 15,
  startWith: 'last',
  home: null,
  name: '',
  color: AVATAR_COLORS[0],
  photo: null,
  alerts: { storm: true, rain: true, snow: true, wind: true, heat: true, frost: true, uv: true, air: true },
  notify: false,
  lang: 'en',
}

export const unitsOf = (p: Prefs): Units => (p.temp === 'f' ? 'imperial' : 'metric')

export const WIND_LABEL: Record<WindUnit, string> = { kmh: 'km/h', mph: 'mph', ms: 'm/s' }

/** Convert a wind speed in the user's unit to km/h (for thresholds). */
export function toKmh(v: number, unit: WindUnit) {
  return unit === 'mph' ? v * 1.609 : unit === 'ms' ? v * 3.6 : v
}

export function toCelsius(v: number, units: Units) {
  return units === 'imperial' ? ((v - 32) * 5) / 9 : v
}

export function formatClock(iso: string, clock: Prefs['clock']) {
  const hh = Number(iso.slice(11, 13))
  const mm = iso.slice(14, 16)
  if (clock === '24') return `${String(hh).padStart(2, '0')}:${mm}`
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${h12}:${mm} ${hh < 12 ? 'am' : 'pm'}`
}

/** Short hour label for chart ticks: "15:00" or "3 pm". */
export function formatHour(iso: string, clock: Prefs['clock']) {
  if (clock === '24') return iso.slice(11, 16)
  const hh = Number(iso.slice(11, 13))
  return `${hh % 12 === 0 ? 12 : hh % 12} ${hh < 12 ? 'am' : 'pm'}`
}

export function formatPressureIn(hPa: number, unit: Prefs['pressure']) {
  return unit === 'inHg' ? `${(hPa * 0.02953).toFixed(2)} inHg` : `${Math.round(hPa)} hPa`
}

export const PrefsContext = createContext<Prefs>(DEFAULT_PREFS)
export const usePrefs = () => useContext(PrefsContext)
