import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { describe, minutesOfDay, nowIndex, type Forecast } from '../lib/weather'

type Phase = 'night' | 'dawn' | 'day' | 'dusk'

/** Sky colours (top, middle, horizon) per phase, for each theme. */
const PALETTE: Record<'light' | 'dark', Record<Phase, [string, string, string]>> = {
  light: {
    night: ['#c3cbe4', '#dde2f0', '#eef1f7'],
    dawn: ['#c9d6ee', '#f3dcd0', '#fbeee3'],
    day: ['#bfe1f6', '#dff0fa', '#f4f9fc'],
    dusk: ['#c7bde6', '#f2cfc0', '#fbebe0'],
  },
  dark: {
    night: ['#070c18', '#0e1626', '#151b26'],
    dawn: ['#18203a', '#3a2c3f', '#3b2f35'],
    day: ['#13243d', '#1a2a40', '#1b2230'],
    dusk: ['#1c1838', '#3a2335', '#33232c'],
  },
}

/** Greyer versions used when it's raining or snowing. */
const WET: Record<'light' | 'dark', [string, string, string]> = {
  light: ['#c4ccd6', '#dde2e8', '#eef0f3'],
  dark: ['#11161e', '#171c25', '#1a1f27'],
}

/** Fixed pseudo-random so stars and clouds keep their places. */
function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

/** Light phase, sun position, wetness and cloud cover at the city right now. */
function skyState(forecast: Forecast | null) {
  if (!forecast) return null
  const now = minutesOfDay(forecast.current.time)
  const rise = minutesOfDay(forecast.daily.sunrise[0])
  const set = minutesOfDay(forecast.daily.sunset[0])
  const phase: Phase =
    Math.abs(now - rise) <= 50 ? 'dawn' : Math.abs(now - set) <= 50 ? 'dusk' : now > rise && now < set ? 'day' : 'night'
  const frac = Math.min(Math.max((now - rise) / (set - rise || 1), 0), 1)
  const sky = describe(forecast.current.code).sky
  const wet = sky === 'rain' || sky === 'drizzle' || sky === 'storm' || sky === 'snow'
  const cloud = forecast.hourly.cloud[nowIndex(forecast)] ?? 30
  return { phase, frac, wet, cloud }
}

/**
 * A living sky behind the dashboard that follows the selected city's local
 * time: colours for night, dawn, day and dusk, a sun or moon glow at the right
 * height, stars at night, and three depths of drifting clouds that shift with
 * the pointer. Purely decorative.
 */
export function SkyBackdrop({ forecast, dark }: { forecast: Forecast | null; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  const state = skyState(forecast)

  // Gentle parallax: each cloud layer follows the pointer by a different amount.
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', ((e.clientX / window.innerWidth) - 0.5).toFixed(3))
        el.style.setProperty('--my', ((e.clientY / window.innerHeight) - 0.5).toFixed(3))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  const stars = useMemo(() => {
    const r = seeded(42)
    return Array.from({ length: 70 }, () => ({ x: r() * 100, y: r() * 62, s: 1 + r() * 1.8, d: r() * 4 }))
  }, [])

  const clouds = useMemo(() => {
    const r = seeded(7)
    return [0, 1, 2].map(() =>
      Array.from({ length: 4 }, () => ({ y: 4 + r() * 38, w: 220 + r() * 260, delay: -r() * 100 })),
    )
  }, [])

  if (!state) return <div className="sky-backdrop" aria-hidden="true" />

  const mode = dark ? 'dark' : 'light'
  const [top, mid, low] = state.wet ? WET[mode] : PALETTE[mode][state.phase]
  const night = state.phase === 'night'
  const glowX = night ? 78 : 8 + state.frac * 84
  const glowY = night ? 14 : 62 - Math.sin(Math.PI * state.frac) * 50
  const glow = night
    ? dark
      ? 'oklch(0.85 0.03 250 / 0.22)'
      : 'oklch(0.97 0.02 250 / 0.7)'
    : state.phase === 'day'
      ? dark
        ? 'oklch(0.8 0.1 80 / 0.16)'
        : 'oklch(0.97 0.08 95 / 0.85)'
      : dark
        ? 'oklch(0.75 0.14 50 / 0.24)'
        : 'oklch(0.9 0.1 55 / 0.8)'
  // Fewer, fainter clouds on clear days; full cover when overcast or wet.
  const cloudAmount = state.wet ? 1 : Math.max(0.25, state.cloud / 100)

  return (
    <div
      ref={ref}
      className={`sky-backdrop sky-backdrop--${state.phase} ${state.wet ? 'is-wet' : ''}`}
      aria-hidden="true"
      style={
        {
          '--sky-top': top,
          '--sky-mid': mid,
          '--sky-low': low,
          '--glow-x': `${glowX}%`,
          '--glow-y': `${glowY}%`,
          '--glow': state.wet ? 'transparent' : glow,
          '--stars': night && !state.wet ? (dark ? 1 : 0.55) : 0,
          '--clouds': cloudAmount,
        } as CSSProperties
      }
    >
      <div className="sky-glow" />
      <div className="sky-stars">
        {stars.map((s, i) => (
          <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
        ))}
      </div>
      <div className="sky-depth">
        {clouds.map((layer, depth) => (
          <div key={depth} className={`sky-layer-clouds sky-layer-clouds--${depth}`}>
            {layer.map((c, i) => (
              <span key={i} className="sky-cloud" style={{ top: `${c.y}%`, width: c.w, animationDelay: `${c.delay}s` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
