import type { CSSProperties } from 'react'
import type { Sky } from '../lib/weather'

/**
 * Full-card weather layer that sits behind a card's content: falling rain,
 * lighter drizzle, rain with lightning flashes, or drifting snow.
 * Renders nothing for dry skies. Pure CSS animation on transform/opacity.
 */
export function SkyFx({ sky, tone }: { sky: Sky; tone: 'light' | 'lime' }) {
  if (sky === 'snow') {
    return (
      <div className={`fx fx--${tone}`} aria-hidden="true">
        <div className="fx-snow" />
        <div className="fx-snow fx-snow--far" />
      </div>
    )
  }
  if (sky !== 'rain' && sky !== 'drizzle' && sky !== 'storm') return null
  return (
    <div className={`fx fx--${tone} fx--${sky}`} aria-hidden="true">
      <div className="fx-rain" />
      {sky !== 'drizzle' && <div className="fx-rain fx-rain--far" />}
      {sky === 'storm' && <div className="fx-flash" />}
      {tone === 'light' && <RainOnGlass count={sky === 'drizzle' ? 16 : sky === 'storm' ? 34 : 26} />}
    </div>
  )
}

/** Small deterministic random so droplets keep their places between renders. */
function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

/**
 * Droplets beading on the card like rain on a window. Most sit still and
 * shimmer; a few run down the glass leaving a short trail.
 */
function RainOnGlass({ count }: { count: number }) {
  const rand = seeded(count * 97 + 13)
  const drops = Array.from({ length: count }, (_, i) => {
    const size = 4 + rand() * 9
    const runs = i % 5 === 0
    return {
      left: `${rand() * 100}%`,
      top: `${rand() * (runs ? 55 : 92)}%`,
      size,
      runs,
      delay: rand() * (runs ? 6 : 2.5),
      dur: runs ? 5 + rand() * 4 : 0,
    }
  })
  return (
    <div className="fx-glass">
      {drops.map((d, i) => (
        <span
          key={i}
          className={d.runs ? 'drop drop--run' : 'drop'}
          style={
            {
              left: d.left,
              top: d.top,
              width: d.size,
              height: d.size * 1.15,
              animationDelay: `${d.delay}s`,
              '--run': `${d.dur}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/**
 * Wind gusts: curved streaks that sweep across the card. Stronger wind means
 * more streaks moving faster.
 */
export function WindGusts({ kmh }: { kmh: number }) {
  const count = kmh >= 40 ? 4 : kmh >= 28 ? 3 : 2
  const speed = Math.max(1.6, 4.2 - kmh / 20)
  const paths = [
    'M-20 60 C 60 40 120 80 200 56 S 320 40 360 62',
    'M-20 120 C 80 100 140 140 220 118 S 330 104 380 122',
    'M-20 170 C 70 154 150 188 230 166 S 330 150 380 170',
    'M-20 92 C 90 76 150 110 240 90 S 340 80 380 96',
  ]
  return (
    <svg className="fx-wind" viewBox="0 0 360 240" preserveAspectRatio="none" aria-hidden="true">
      {paths.slice(0, count).map((d, i) => (
        <path
          key={d}
          d={d}
          pathLength={1}
          style={{ animationDuration: `${speed}s`, animationDelay: `${i * (speed / count)}s` } as CSSProperties}
        />
      ))}
    </svg>
  )
}
