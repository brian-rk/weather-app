import { describe, nowIndex, round, shortDate, type AirQuality, type Forecast, type Place, type Units } from './weather'
import { formatClock, toCelsius, toKmh, WIND_LABEL, type AlertKind, type Prefs } from './prefs'
import { t } from './i18n'

/* ============================================================ Alerts */

export type WeatherAlert = {
  id: string
  kind: AlertKind
  severity: 'warning' | 'advisory'
  title: string
  body: string
  /** ISO date the alert is about. */
  date: string
}

const STORM = new Set([95, 96, 99])
const SNOW = new Set([71, 73, 75, 77, 85, 86])

/**
 * Alerts worked out from the forecast for the next 48 hours (and next 3 days
 * for heat and frost). Thresholds use metric values whatever the display units.
 */
export function computeAlerts(f: Forecast, air: AirQuality | null | undefined, units: Units, prefs: Prefs): WeatherAlert[] {
  const out: WeatherAlert[] = []
  const h = f.hourly
  const start = nowIndex(f)
  const end = Math.min(start + 48, h.time.length)
  const when = (iso: string) => {
    const day = iso.slice(0, 10)
    const today = f.current.time.slice(0, 10)
    const label = day === today ? t('today') : day === f.daily.time[1] ? t('tomorrow') : shortDate(day)
    return t('{day} from {time}', { day: label, time: formatClock(iso, prefs.clock) })
  }

  const firstHour = (test: (i: number) => boolean) => {
    for (let i = start; i < end; i++) if (test(i)) return i
    return -1
  }

  const storm = firstHour((i) => STORM.has(h.code[i]))
  if (storm >= 0)
    out.push({
      id: `storm-${h.time[storm].slice(0, 10)}`,
      kind: 'storm',
      severity: 'warning',
      title: t('Thunderstorms likely'),
      body: t('Storms expected {when}. Avoid open ground and unplug sensitive electronics.', { when: when(h.time[storm]) }),
      date: h.time[storm].slice(0, 10),
    })

  for (const d of [0, 1]) {
    const mm = f.daily.rainSum[d] ?? 0
    if (mm >= 20)
      out.push({
        id: `rain-${f.daily.time[d]}`,
        kind: 'rain',
        severity: mm >= 40 ? 'warning' : 'advisory',
        title: mm >= 40 ? t('Very heavy rain') : t('Heavy rain'),
        body: t('About {mm} mm of rain {day}. Expect puddles and possible local flooding.', { mm: round(mm), day: d === 0 ? t('today') : t('tomorrow') }),
        date: f.daily.time[d],
      })
  }

  const snow = firstHour((i) => SNOW.has(h.code[i]))
  if (snow >= 0)
    out.push({
      id: `snow-${h.time[snow].slice(0, 10)}`,
      kind: 'snow',
      severity: 'advisory',
      title: t('Snow on the way'),
      body: t('Snow expected {when}. Allow extra time for travel.', { when: when(h.time[snow]) }),
      date: h.time[snow].slice(0, 10),
    })

  let gustAt = -1
  for (let i = start; i < end; i++) {
    if (toKmh(h.gusts[i], prefs.wind) >= 60 && (gustAt < 0 || h.gusts[i] > h.gusts[gustAt])) gustAt = i
  }
  if (gustAt >= 0)
    out.push({
      id: `wind-${h.time[gustAt].slice(0, 10)}`,
      kind: 'wind',
      severity: toKmh(h.gusts[gustAt], prefs.wind) >= 90 ? 'warning' : 'advisory',
      title: t('Strong gusts'),
      body: t('Gusts up to {n} {unit} around {day} {time}. Secure loose objects outdoors.', { n: round(h.gusts[gustAt]), unit: WIND_LABEL[prefs.wind], day: h.time[gustAt].slice(0, 10) === f.current.time.slice(0, 10) ? t('today') : shortDate(h.time[gustAt].slice(0, 10)), time: formatClock(h.time[gustAt], prefs.clock) }),
      date: h.time[gustAt].slice(0, 10),
    })

  for (let d = 0; d < Math.min(3, f.daily.time.length); d++) {
    const label = d === 0 ? t('Today') : d === 1 ? t('Tomorrow') : shortDate(f.daily.time[d])
    if (toCelsius(f.daily.max[d], units) >= 35) {
      out.push({
        id: `heat-${f.daily.time[d]}`,
        kind: 'heat',
        severity: toCelsius(f.daily.max[d], units) >= 40 ? 'warning' : 'advisory',
        title: t('Very hot'),
        body: t('{day} reaches {n}°. Drink water and stay out of the midday sun.', { day: label, n: round(f.daily.max[d]) }),
        date: f.daily.time[d],
      })
      break
    }
  }
  for (let d = 0; d < Math.min(3, f.daily.time.length); d++) {
    if (toCelsius(f.daily.min[d], units) <= 0) {
      const label = d === 0 ? t('Tonight') : d === 1 ? t('Tomorrow night') : shortDate(f.daily.time[d])
      out.push({
        id: `frost-${f.daily.time[d]}`,
        kind: 'frost',
        severity: 'advisory',
        title: t('Frost'),
        body: t('{day} drops to {n}°. Watch for icy paths and protect plants.', { day: label, n: round(f.daily.min[d]) }),
        date: f.daily.time[d],
      })
      break
    }
  }

  for (const d of [0, 1]) {
    if ((f.daily.uvMax[d] ?? 0) >= 8) {
      out.push({
        id: `uv-${f.daily.time[d]}`,
        kind: 'uv',
        severity: 'advisory',
        title: t('Very high UV'),
        body: t('UV reaches {n} {day}. Use sunscreen and seek shade at midday.', { n: round(f.daily.uvMax[d]), day: d === 0 ? t('today') : t('tomorrow') }),
        date: f.daily.time[d],
      })
      break
    }
  }

  if (air?.aqi != null && air.aqi > 150)
    out.push({
      id: `air-${f.current.time.slice(0, 10)}`,
      kind: 'air',
      severity: air.aqi > 200 ? 'warning' : 'advisory',
      title: t('Unhealthy air'),
      body: t('Air quality index is {n}. Limit long or intense activity outdoors.', { n: air.aqi }),
      date: f.current.time.slice(0, 10),
    })

  return out.filter((a) => prefs.alerts[a.kind])
}

/* =========================================================== Planner */

type HourMetric = {
  time: string
  tempC: number
  rain: number
  mm: number
  windKmh: number
  gustKmh: number
  uv: number
  cloud: number
  humidity: number
  isDay: boolean
}

type Factor = { score: number; reason: string }

/** 1 inside [lo, hi], fading to 0 at `soft` beyond either edge. */
function band(v: number, lo: number, hi: number, soft: number) {
  if (v >= lo && v <= hi) return 1
  const d = v < lo ? lo - v : v - hi
  return Math.max(0, 1 - d / soft)
}
const atMost = (v: number, max: number, soft: number) => (v <= max ? 1 : Math.max(0, 1 - (v - max) / soft))

export type Activity = {
  id: string
  label: string
  /** Hours needed in a row for a useful window. */
  hours: number
  score: (h: HourMetric) => Factor[]
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'run',
    label: 'Go for a run',
    hours: 1,
    score: (h) => [
      { score: band(h.tempC, 6, 18, 12), reason: h.tempC < 6 ? t('too cold') : t('too hot') },
      { score: atMost(h.rain, 20, 50), reason: t('likely rain') },
      { score: atMost(h.windKmh, 25, 25), reason: t('too windy') },
      { score: atMost(h.uv, 6, 4), reason: t('strong sun') },
    ],
  },
  {
    id: 'cycle',
    label: 'Go cycling',
    hours: 2,
    score: (h) => [
      { score: band(h.tempC, 10, 24, 10), reason: h.tempC < 10 ? t('too cold') : t('too hot') },
      { score: atMost(h.rain, 15, 40), reason: t('likely rain') },
      { score: atMost(h.gustKmh, 30, 25), reason: t('gusty') },
    ],
  },
  {
    id: 'walk',
    label: 'Walk the dog',
    hours: 1,
    score: (h) => [
      { score: band(h.tempC, 2, 26, 10), reason: h.tempC < 2 ? t('too cold') : t('too hot') },
      { score: atMost(h.rain, 35, 50), reason: t('likely rain') },
      { score: atMost(h.windKmh, 35, 25), reason: t('too windy') },
    ],
  },
  {
    id: 'laundry',
    label: 'Dry laundry outside',
    hours: 3,
    score: (h) => [
      { score: h.isDay ? 1 : 0, reason: t('after dark') },
      { score: atMost(h.rain, 10, 25), reason: t('rain risk') },
      { score: atMost(h.humidity, 70, 25), reason: t('too humid') },
      { score: band(h.windKmh, 5, 30, 10), reason: h.windKmh < 5 ? t('no breeze') : t('too windy') },
      { score: band(h.tempC, 12, 40, 8), reason: t('too cold') },
    ],
  },
  {
    id: 'bbq',
    label: 'Barbecue or picnic',
    hours: 2,
    score: (h) => [
      { score: band(h.tempC, 18, 30, 6), reason: h.tempC < 18 ? t('too cool') : t('too hot') },
      { score: atMost(h.rain, 10, 25), reason: t('rain risk') },
      { score: atMost(h.windKmh, 20, 15), reason: t('too windy') },
    ],
  },
  {
    id: 'stars',
    label: 'Stargazing',
    hours: 1,
    score: (h) => [
      { score: h.isDay ? 0 : 1, reason: t('daylight') },
      { score: atMost(h.cloud, 20, 40), reason: t('cloudy') },
      { score: atMost(h.rain, 10, 30), reason: t('rain risk') },
    ],
  },
]

export type Plan = {
  id: string
  label: string
  verdict: 'great' | 'good' | 'poor'
  /** 0..1 best window average. */
  score: number
  window: string | null
  reason: string
}

/** Best window for each activity across the rest of the day being viewed. */
export function planDay(f: Forecast, units: Units, prefs: Prefs): Plan[] {
  const h = f.hourly
  const viewing = f.view?.day ?? 0
  const date = f.current.time.slice(0, 10)
  const start = viewing > 0 ? Math.max(h.time.indexOf(`${date}T06:00`), 0) : nowIndex(f)
  const end = Math.min(h.time.indexOf(`${date}T23:00`) + 1 || start + 18, h.time.length)

  const hours: HourMetric[] = []
  for (let i = start; i < end; i++) {
    hours.push({
      time: h.time[i],
      tempC: toCelsius(h.temperature[i], units),
      rain: h.precipitation[i] ?? 0,
      mm: h.rainMm[i] ?? 0,
      windKmh: toKmh(h.wind[i], prefs.wind),
      gustKmh: toKmh(h.gusts[i], prefs.wind),
      uv: h.uv[i] ?? 0,
      cloud: h.cloud[i] ?? 0,
      humidity: h.humidity[i] ?? 50,
      isDay: h.isDay[i] === 1,
    })
  }

  return ACTIVITIES.map((a) => {
    const scored = hours.map((m) => {
      const factors = a.score(m)
      const worst = factors.reduce((x, y) => (y.score < x.score ? y : x))
      return { m, value: factors.reduce((p, x) => p * x.score, 1), worst }
    })
    // Best run of `a.hours` consecutive hours.
    let best = -1
    let bestAvg = 0
    for (let i = 0; i + a.hours <= scored.length; i++) {
      const slice = scored.slice(i, i + a.hours)
      const avg = slice.reduce((s, x) => s + x.value, 0) / a.hours
      if (avg > bestAvg) {
        bestAvg = avg
        best = i
      }
    }
    if (best < 0 || bestAvg < 0.35) {
      const reasons = scored.map((x) => x.worst.reason)
      const common = reasons.sort((p, q) => reasons.filter((r) => r === q).length - reasons.filter((r) => r === p).length)[0]
      return {
        id: a.id,
        label: t(a.label),
        verdict: 'poor',
        score: bestAvg,
        window: null,
        reason: scored.length === 0 ? t('No hours left today') : t('Not great: {why}', { why: common ?? t('conditions') }),
      }
    }
    // Stretch the window while the next hours stay good.
    let last = best + a.hours - 1
    while (last + 1 < scored.length && scored[last + 1].value >= Math.max(0.6, bestAvg - 0.15)) last++
    const endIso = scored[last].m.time
    const endHour = `${endIso.slice(0, 11)}${String(Number(endIso.slice(11, 13)) + 1).padStart(2, '0')}:00`
    return {
      id: a.id,
      label: t(a.label),
      verdict: bestAvg >= 0.75 ? 'great' : 'good',
      score: bestAvg,
      window: t('{from} to {to}', { from: formatClock(scored[best].m.time, prefs.clock), to: formatClock(endHour, prefs.clock) }),
      reason: bestAvg >= 0.75 ? t('Good conditions') : t('Fair: {why}', { why: scored[best].worst.reason }),
    }
  })
}

/* ========================================================== Briefing */

export function briefing(
  f: Forecast,
  air: AirQuality | null | undefined,
  place: Place,
  prefs: Prefs,
  alerts: WeatherAlert[],
  plans: Plan[],
): string[] {
  const c = f.current
  const cond = describe(c.code)
  const h = f.hourly
  const i0 = nowIndex(f)
  const lines: string[] = []
  const name = prefs.name.trim().split(' ')[0]

  const feels = Math.abs(c.feelsLike - c.temperature) >= 3 ? t(', feeling like {n}°', { n: round(c.feelsLike) }) : ''
  lines.push(`${name ? t('Hi {name}! ', { name }) : ''}${t("It's {temp}° and {cond} in {place} right now{feels}.", { temp: round(c.temperature), cond: cond.label.toLowerCase(), place: place.name, feels })}`)

  const wet = cond.sky === 'rain' || cond.sky === 'drizzle' || cond.sky === 'storm'
  let rainLine = t('No rain expected in the next 12 hours.')
  for (let i = i0 + 1; i < Math.min(i0 + 13, h.time.length); i++) {
    if (wet && (h.precipitation[i] ?? 0) < 30) {
      rainLine = t('The rain should ease around {time}.', { time: formatClock(h.time[i], prefs.clock) })
      break
    }
    if (!wet && (h.precipitation[i] ?? 0) >= 50) {
      rainLine = t('Rain is likely from {time} ({n}% chance). Take an umbrella.', { time: formatClock(h.time[i], prefs.clock), n: h.precipitation[i] })
      break
    }
    if (wet) rainLine = t('Rain looks set to continue for the next 12 hours.')
  }
  lines.push(rainLine)

  const diff = (f.daily.max[1] ?? f.daily.max[0]) - f.daily.max[0]
  const tomorrow = Math.abs(diff) < 2 ? t('similar') : diff > 0 ? t('warmer ({n}°)', { n: round(f.daily.max[1]) }) : t('cooler ({n}°)', { n: round(f.daily.max[1]) })
  lines.push(t("Today's high is {high}° and the low {low}°. Tomorrow looks {tomorrow}.", { high: round(f.daily.max[0]), low: round(f.daily.min[0]), tomorrow }))

  const gust = Math.max(...h.gusts.slice(i0, i0 + 12))
  if (toKmh(gust, prefs.wind) >= 40) lines.push(t("It'll be gusty, up to {n} {unit}.", { n: round(gust), unit: WIND_LABEL[prefs.wind] }))

  if ((f.daily.uvMax[0] ?? 0) >= 3) {
    const today = c.time.slice(0, 10)
    const strong = h.time.map((t, i) => ({ t, uv: h.uv[i] })).filter((p) => p.t.startsWith(today) && p.uv >= 3)
    if (strong.length) {
      const endIso = `${today}T${String(Number(strong.at(-1)!.t.slice(11, 13)) + 1).padStart(2, '0')}:00`
      lines.push(t('UV peaks at {n}. Protect your skin {from} to {to}.', { n: round(f.daily.uvMax[0]), from: formatClock(strong[0].t, prefs.clock), to: formatClock(endIso, prefs.clock) }))
    }
  }

  if (air?.aqi != null) {
    const word = air.aqi <= 50 ? t('good') : air.aqi <= 100 ? t('moderate') : t('unhealthy for some')
    lines.push(t('Air quality is {word} (AQI {n}).', { word, n: air.aqi }))
  }

  const great = plans.find((p) => p.verdict === 'great' && p.window)
  if (great) lines.push(t('Best time: {activity}, {window}.', { activity: great.label, window: great.window ?? '' }))

  if (alerts.length) lines.push(t('Heads up: {what}. Check the bell for details.', { what: alerts.length === 1 ? alerts[0].title : t('{n} weather alerts', { n: alerts.length }) }))

  return lines
}
