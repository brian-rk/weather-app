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

export type Forecast = {
  timezone: string
  current: {
    time: string
    temperature: number
    feelsLike: number
    humidity: number
    code: number
    isDay: boolean
    wind: number
    visibility: number | null
  }
  hourly: {
    time: string[]
    temperature: number[]
    code: number[]
    wind: number[]
    precipitation: number[]
    isDay: number[]
  }
  daily: {
    time: string[]
    code: number[]
    max: number[]
    min: number[]
    precipitation: number[]
  }
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

function unitParams(units: Units) {
  return units === 'imperial'
    ? '&temperature_unit=fahrenheit&wind_speed_unit=mph'
    : ''
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
    visibility?: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    wind_speed_10m: number[]
    precipitation_probability: number[]
    is_day: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
  }
}

export async function fetchForecast(
  place: Place,
  units: Units,
  signal?: AbortSignal,
): Promise<Forecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,visibility' +
    '&hourly=temperature_2m,weather_code,wind_speed_10m,precipitation_probability,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    `&timezone=auto&forecast_days=3${unitParams(units)}`
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
      visibility: typeof c.visibility === 'number' ? c.visibility : null,
    },
    hourly: {
      time: raw.hourly.time,
      temperature: raw.hourly.temperature_2m,
      code: raw.hourly.weather_code,
      wind: raw.hourly.wind_speed_10m,
      precipitation: raw.hourly.precipitation_probability,
      isDay: raw.hourly.is_day,
    },
    daily: {
      time: raw.daily.time,
      code: raw.daily.weather_code,
      max: raw.daily.temperature_2m_max,
      min: raw.daily.temperature_2m_min,
      precipitation: raw.daily.precipitation_probability_max,
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

export async function fetchAirQuality(place: Place, signal?: AbortSignal) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}&current=us_aqi`
  const raw = await getJSON<{ current: { us_aqi: number | null } }>(url, signal)
  return raw.current.us_aqi
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
