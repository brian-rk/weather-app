export type Units = 'metric' | 'imperial'

export type Place = {
  id: string
  name: string
  region: string
  latitude: number
  longitude: number
}

export type Sky =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm'

export type Condition = { sky: Sky; label: string }

export type WindUnit = 'kmh' | 'mph' | 'ms'

export type Forecast = {
  timezone: string
  /** Set by forecastForDay: which day of the forecast this view is centred on (0 = today). */
  view?: { day: number }
  current: {
    time: string
    temperature: number
    feelsLike: number
    humidity: number
    code: number
    isDay: boolean
    wind: number
    windDirection: number
    gusts: number
    /** Sea-level pressure in hPa. */
    pressure: number
    uv: number
    visibility: number | null
  }
  hourly: {
    time: string[]
    temperature: number[]
    code: number[]
    wind: number[]
    precipitation: number[]
    isDay: number[]
    pressure: number[]
    uv: number[]
    apparent: number[]
    humidity: number[]
    visibility: number[]
    windDirection: number[]
    gusts: number[]
    cloud: number[]
    /** Millimetres of rain/snow water in the hour. */
    rainMm: number[]
  }
  daily: {
    time: string[]
    code: number[]
    max: number[]
    min: number[]
    precipitation: number[]
    sunrise: string[]
    sunset: string[]
    /** Seconds of daylight. */
    daylight: number[]
    uvMax: number[]
    /** Millimetres for the day. */
    rainSum: number[]
    gustMax: number[]
  }
}

export type AirQuality = {
  aqi: number | null
  pm25: number | null
  pm10: number | null
  ozone: number | null
  no2: number | null
  /** Pollen is only modelled for Europe; null elsewhere or out of season. */
  pollen: { name: string; value: number }[] | null
}

export type Snapshot = {
  temperature: number
  code: number
  isDay: boolean
  max: number
  min: number
}

const WMO: Record<number, Condition> = {
  0: { sky: 'clear', label: 'Clear sky' },
  1: { sky: 'partly', label: 'Mostly clear' },
  2: { sky: 'partly', label: 'Partly cloudy' },
  3: { sky: 'cloudy', label: 'Overcast' },
  45: { sky: 'fog', label: 'Fog' },
  48: { sky: 'fog', label: 'Freezing fog' },
  51: { sky: 'drizzle', label: 'Light drizzle' },
  53: { sky: 'drizzle', label: 'Drizzle' },
  55: { sky: 'drizzle', label: 'Heavy drizzle' },
  56: { sky: 'drizzle', label: 'Freezing drizzle' },
  57: { sky: 'drizzle', label: 'Freezing drizzle' },
  61: { sky: 'rain', label: 'Light rain' },
  63: { sky: 'rain', label: 'Rain' },
  65: { sky: 'rain', label: 'Heavy rain' },
  66: { sky: 'rain', label: 'Freezing rain' },
  67: { sky: 'rain', label: 'Freezing rain' },
  71: { sky: 'snow', label: 'Light snow' },
  73: { sky: 'snow', label: 'Snow' },
  75: { sky: 'snow', label: 'Heavy snow' },
  77: { sky: 'snow', label: 'Snow grains' },
  80: { sky: 'rain', label: 'Rain showers' },
  81: { sky: 'rain', label: 'Rain showers' },
  82: { sky: 'rain', label: 'Violent showers' },
  85: { sky: 'snow', label: 'Snow showers' },
  86: { sky: 'snow', label: 'Snow showers' },
  95: { sky: 'storm', label: 'Thunderstorm' },
  96: { sky: 'storm', label: 'Thunderstorm, hail' },
  99: { sky: 'storm', label: 'Thunderstorm, hail' },
}

export function describe(code: number): Condition {
  return WMO[code] ?? { sky: 'cloudy', label: 'Unsettled' }
}

export const DEFAULT_PLACE: Place = {
  id: '1185241',
  name: 'Dhaka',
  region: 'Bangladesh',
  latitude: 23.7104,
  longitude: 90.4074,
}

export const DEFAULT_SAVED: Place[] = [
  { id: '5128581', name: 'New York', region: 'United States', latitude: 40.7143, longitude: -74.006 },
  { id: '2643743', name: 'London', region: 'United Kingdom', latitude: 51.5085, longitude: -0.1257 },
  { id: '1850147', name: 'Tokyo', region: 'Japan', latitude: 35.6895, longitude: 139.6917 },
]

function unitParams(units: Units, wind: WindUnit = units === 'imperial' ? 'mph' : 'kmh') {
  return `${units === 'imperial' ? '&temperature_unit=fahrenheit' : ''}&wind_speed_unit=${wind}`
}

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Weather service responded ${res.status}`)
  return res.json() as Promise<T>
}

type RawForecast = {
  timezone: string
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    weather_code: number
    is_day: number
    wind_speed_10m: number
    wind_direction_10m: number
    wind_gusts_10m: number
    pressure_msl: number
    uv_index: number
    visibility?: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    wind_speed_10m: number[]
    precipitation_probability: number[]
    is_day: number[]
    pressure_msl: number[]
    uv_index: number[]
    apparent_temperature: number[]
    relative_humidity_2m: number[]
    visibility: number[]
    wind_direction_10m: number[]
    wind_gusts_10m: number[]
    cloud_cover: number[]
    precipitation: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
    sunrise: string[]
    sunset: string[]
    daylight_duration: number[]
    uv_index_max: number[]
    precipitation_sum: number[]
    wind_gusts_10m_max: number[]
  }
}

export async function fetchForecast(
  place: Place,
  units: Units,
  signal?: AbortSignal,
  wind?: WindUnit,
): Promise<Forecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,uv_index,visibility' +
    '&hourly=temperature_2m,weather_code,wind_speed_10m,precipitation_probability,is_day,pressure_msl,uv_index,apparent_temperature,relative_humidity_2m,visibility,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,daylight_duration,uv_index_max,precipitation_sum,wind_gusts_10m_max' +
    `&timezone=auto&forecast_days=16${unitParams(units, wind)}`
  const raw = await getJSON<RawForecast>(url, signal)
  const c = raw.current
  return {
    timezone: raw.timezone,
    current: {
      time: c.time,
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      code: c.weather_code,
      isDay: c.is_day === 1,
      wind: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
      gusts: c.wind_gusts_10m,
      pressure: c.pressure_msl,
      uv: c.uv_index,
      visibility: typeof c.visibility === 'number' ? c.visibility : null,
    },
    hourly: {
      time: raw.hourly.time,
      temperature: raw.hourly.temperature_2m,
      code: raw.hourly.weather_code,
      wind: raw.hourly.wind_speed_10m,
      precipitation: raw.hourly.precipitation_probability,
      isDay: raw.hourly.is_day,
      pressure: raw.hourly.pressure_msl,
      uv: raw.hourly.uv_index,
      apparent: raw.hourly.apparent_temperature,
      humidity: raw.hourly.relative_humidity_2m,
      visibility: raw.hourly.visibility,
      windDirection: raw.hourly.wind_direction_10m,
      gusts: raw.hourly.wind_gusts_10m,
      cloud: raw.hourly.cloud_cover,
      rainMm: raw.hourly.precipitation,
    },
    daily: {
      time: raw.daily.time,
      code: raw.daily.weather_code,
      max: raw.daily.temperature_2m_max,
      min: raw.daily.temperature_2m_min,
      precipitation: raw.daily.precipitation_probability_max,
      sunrise: raw.daily.sunrise,
      sunset: raw.daily.sunset,
      daylight: raw.daily.daylight_duration,
      uvMax: raw.daily.uv_index_max,
      rainSum: raw.daily.precipitation_sum,
      gustMax: raw.daily.wind_gusts_10m_max,
    },
  }
}

/**
 * A view of the forecast centred on another day: `current` becomes that
 * day's midday picture and the daily series starts at that day, so every
 * card can render a future day without knowing about it.
 */
export function forecastForDay(f: Forecast, day: number): Forecast {
  if (day <= 0 || day >= f.daily.time.length) return { ...f, view: { day: 0 } }
  const date = f.daily.time[day]
  const at = (h: number) => f.hourly.time.indexOf(`${date}T${String(h).padStart(2, '0')}:00`)
  const i = Math.max(at(13), 0)
  const h = f.hourly
  const d = f.daily
  const from = <T,>(a: T[]) => a.slice(day)
  return {
    ...f,
    view: { day },
    current: {
      time: `${date}T13:00`,
      temperature: d.max[day],
      feelsLike: h.apparent[i],
      humidity: h.humidity[i],
      code: d.code[day],
      isDay: true,
      wind: h.wind[i],
      windDirection: h.windDirection[i],
      gusts: h.gusts[i],
      pressure: h.pressure[i],
      uv: d.uvMax[day],
      visibility: h.visibility[i] ?? null,
    },
    daily: {
      time: from(d.time),
      code: from(d.code),
      max: from(d.max),
      min: from(d.min),
      precipitation: from(d.precipitation),
      sunrise: from(d.sunrise),
      sunset: from(d.sunset),
      daylight: from(d.daylight),
      uvMax: from(d.uvMax),
      rainSum: from(d.rainSum),
      gustMax: from(d.gustMax),
    },
  }
}

type RawSnapshot = {
  current: { temperature_2m: number; weather_code: number; is_day: number }
  daily: { temperature_2m_max: number[]; temperature_2m_min: number[] }
}

/** Current conditions for many coordinates in a single request. */
export async function fetchSnapshots(
  points: { latitude: number; longitude: number }[],
  units: Units,
  signal?: AbortSignal,
): Promise<Snapshot[]> {
  if (points.length === 0) return []
  const lat = points.map((p) => p.latitude.toFixed(3)).join(',')
  const lon = points.map((p) => p.longitude.toFixed(3)).join(',')
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min' +
    `&timezone=auto&forecast_days=1${unitParams(units)}`
  const raw = await getJSON<RawSnapshot | RawSnapshot[]>(url, signal)
  const list = Array.isArray(raw) ? raw : [raw]
  return list.map((r) => ({
    temperature: r.current.temperature_2m,
    code: r.current.weather_code,
    isDay: r.current.is_day === 1,
    max: r.daily.temperature_2m_max[0],
    min: r.daily.temperature_2m_min[0],
  }))
}

const POLLEN = [
  ['grass_pollen', 'Grass'],
  ['birch_pollen', 'Birch'],
  ['alder_pollen', 'Alder'],
  ['olive_pollen', 'Olive'],
  ['ragweed_pollen', 'Ragweed'],
  ['mugwort_pollen', 'Mugwort'],
] as const

export async function fetchAirQuality(place: Place, signal?: AbortSignal): Promise<AirQuality> {
  const fields = ['us_aqi', 'pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide', ...POLLEN.map(([k]) => k)]
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}&current=${fields.join(',')}`
  const raw = await getJSON<{ current: Record<string, number | null> }>(url, signal)
  const c = raw.current
  const num = (k: string) => (typeof c[k] === 'number' ? (c[k] as number) : null)
  const pollen: { name: string; value: number | null }[] = POLLEN.map(([k, name]) => ({ name, value: num(k) }))
  const modelled = pollen.some((p) => p.value !== null)
  const present = pollen.flatMap((p) => (p.value !== null && p.value >= 1 ? [{ name: p.name, value: p.value }] : []))
  return {
    aqi: num('us_aqi'),
    pm25: num('pm2_5'),
    pm10: num('pm10'),
    ozone: num('ozone'),
    no2: num('nitrogen_dioxide'),
    pollen: modelled ? present.sort((x, y) => y.value - x.value) : null,
  }
}

type RawGeo = {
  results?: {
    id: number
    name: string
    country?: string
    admin1?: string
    latitude: number
    longitude: number
  }[]
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
  const raw = await getJSON<RawGeo>(url, signal)
  return (raw.results ?? []).map((r) => ({
    id: String(r.id),
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}

export function aqiLabel(aqi: number) {
  if (aqi <= 50) return 'Good air quality'
  if (aqi <= 100) return 'Moderate air quality'
  if (aqi <= 150) return 'Unhealthy for sensitive groups'
  if (aqi <= 200) return 'Unhealthy air'
  if (aqi <= 300) return 'Very unhealthy air'
  return 'Hazardous air'
}

export const round = (n: number) => Math.round(n)

export function formatVisibility(meters: number | null, units: Units) {
  if (meters == null) return '--'
  if (units === 'imperial') return `${(meters / 1609.34).toFixed(1)} mi`
  return `${(meters / 1000).toFixed(1)} km`
}

/** Hour index in the hourly series for a given local date + hour. */
export function hourIndex(f: Forecast, date: string, hour: number) {
  const stamp = `${date}T${String(hour).padStart(2, '0')}:00`
  return f.hourly.time.indexOf(stamp)
}

export function weekday(isoDate: string, style: 'long' | 'short' = 'long') {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: style,
    timeZone: 'UTC',
  })
}

/** "HH:MM" from a local ISO timestamp like 2026-11-22T07:29. */
export function clock(iso: string) {
  return iso.slice(11, 16)
}

export function minutesOfDay(iso: string) {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16))
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return `${h} h ${String(m).padStart(2, '0')} min`
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
export function compass(degrees: number) {
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16]
}

export function uvLevel(uv: number) {
  if (uv < 3) return { label: 'Low', advice: 'No protection needed.' }
  if (uv < 6) return { label: 'Moderate', advice: 'Sunscreen if outside for long.' }
  if (uv < 8) return { label: 'High', advice: 'Sunscreen, hat and shade at midday.' }
  if (uv < 11) return { label: 'Very high', advice: 'Avoid the midday sun.' }
  return { label: 'Extreme', advice: 'Stay indoors around midday.' }
}

export function formatPressure(hPa: number, units: Units) {
  return units === 'imperial' ? `${(hPa * 0.02953).toFixed(2)} inHg` : `${Math.round(hPa)} hPa`
}

/** Index of the current hour in the hourly series. */
export function nowIndex(f: Forecast) {
  const i = f.hourly.time.indexOf(`${f.current.time.slice(0, 13)}:00`)
  return i < 0 ? 0 : i
}

type RawReverse = {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
}

/**
 * Name for a coordinate (BigDataCloud's free client-side endpoint, no key).
 * Falls back to rounded coordinates when nothing is found, e.g. open sea.
 */
export async function reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<Place> {
  const id = `pt-${latitude.toFixed(3)},${longitude.toFixed(3)}`
  const fallback = {
    id,
    name: `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`,
    region: '',
    latitude,
    longitude,
  }
  try {
    const raw = await getJSON<RawReverse>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      signal,
    )
    const name = raw.city || raw.locality
    if (!name) return fallback
    const region = [raw.principalSubdivision !== name ? raw.principalSubdivision : '', raw.countryName]
      .filter(Boolean)
      .join(', ')
    return { ...fallback, name, region }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return fallback
  }
}

/* ------------------------------------------------------------ Links */

/** Query string that reopens the app on this place (and units, if not °C). */
export function placeToSearch(place: Place, units: Units) {
  const p = new URLSearchParams({
    city: place.name,
    lat: place.latitude.toFixed(4),
    lon: place.longitude.toFixed(4),
    id: place.id,
  })
  if (place.region) p.set('region', place.region)
  if (units === 'imperial') p.set('units', 'imperial')
  return `?${p.toString()}`
}

export function placeFromSearch(search: string): { place: Place | null; units: Units | null } {
  const p = new URLSearchParams(search)
  const lat = Number(p.get('lat'))
  const lon = Number(p.get('lon'))
  const units = p.get('units') === 'imperial' ? 'imperial' : p.get('units') === 'metric' ? 'metric' : null
  const valid = p.has('lat') && p.has('lon') && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
  if (!valid) return { place: null, units }
  return {
    place: {
      id: p.get('id') || `pt-${lat.toFixed(3)},${lon.toFixed(3)}`,
      name: (p.get('city') || 'Shared place').slice(0, 80),
      region: (p.get('region') || '').slice(0, 120),
      latitude: lat,
      longitude: lon,
    },
    units,
  }
}

export function timeAgo(ms: number) {
  const s = Math.round(ms / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return `${h} h ago`
}

export function shortDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
