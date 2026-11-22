import { useId, type CSSProperties } from 'react'
import type { Sky } from '../lib/weather'

type Props = {
  sky: Sky
  isDay?: boolean
  className?: string
  /** Decorative by default; pass a label to expose it to assistive tech. */
  label?: string
  /** Skip the weather animation (for small, repeated thumbnails). */
  still?: boolean
}

const delay = (s: number) => ({ animationDelay: `${s}s` }) as CSSProperties

/**
 * Soft "clay" weather illustration. Each piece is a layered radial gradient
 * so it reads as a lit 3D object instead of a flat icon. Parts are wrapped in
 * their own groups so CSS can animate them without touching the SVG
 * transforms that position them.
 */
export function WeatherArt({ sky, isDay = true, className, label, still = false }: Props) {
  const uid = useId().replace(/:/g, '')
  const g = (name: string) => `${uid}-${name}`
  const url = (name: string) => `url(#${g(name)})`

  const hasOrb = sky === 'clear' || sky === 'partly' || sky === 'drizzle' || sky === 'rain'
  const hasCloud = sky !== 'clear'
  const big = sky === 'clear'
  const classes = ['weather-art', `weather-art--${sky}`, still ? 'is-still' : '', className].filter(Boolean).join(' ')

  return (
    <svg
      viewBox="0 0 220 170"
      className={classes}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      overflow="visible"
    >
      <defs>
        <radialGradient id={g('sun')} cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor="oklch(0.95 0.12 95)" />
          <stop offset="55%" stopColor="oklch(0.84 0.17 80)" />
          <stop offset="100%" stopColor="oklch(0.72 0.17 60)" />
        </radialGradient>
        <radialGradient id={g('glow')} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="oklch(0.9 0.15 85 / 0.45)" />
          <stop offset="100%" stopColor="oklch(0.9 0.15 85 / 0)" />
        </radialGradient>
        <linearGradient id={g('ray')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.9 0.15 90)" />
          <stop offset="100%" stopColor="oklch(0.78 0.17 70)" />
        </linearGradient>
        <radialGradient id={g('moon')} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="oklch(0.98 0.02 250)" />
          <stop offset="60%" stopColor="oklch(0.86 0.04 255)" />
          <stop offset="100%" stopColor="oklch(0.7 0.06 260)" />
        </radialGradient>
        <radialGradient id={g('cloud')} cx="40%" cy="22%" r="85%">
          <stop offset="0%" stopColor="oklch(0.99 0.005 240)" />
          <stop offset="55%" stopColor="oklch(0.9 0.035 240)" />
          <stop offset="100%" stopColor="oklch(0.74 0.07 245)" />
        </radialGradient>
        <radialGradient id={g('storm')} cx="40%" cy="22%" r="85%">
          <stop offset="0%" stopColor="oklch(0.86 0.02 260)" />
          <stop offset="60%" stopColor="oklch(0.66 0.04 262)" />
          <stop offset="100%" stopColor="oklch(0.48 0.05 265)" />
        </radialGradient>
        <linearGradient id={g('drop')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.66 0.16 255)" />
          <stop offset="100%" stopColor="oklch(0.45 0.19 262)" />
        </linearGradient>
        <linearGradient id={g('bolt')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.92 0.16 95)" />
          <stop offset="100%" stopColor="oklch(0.76 0.18 65)" />
        </linearGradient>
      </defs>

      {hasOrb && isDay && (
        <g transform={big ? 'translate(110 85) scale(1.25)' : 'translate(138 62)'}>
          <circle r={58} fill={url('glow')} className="art-glow" />
          <g className="art-rays">
            {Array.from({ length: 8 }, (_, i) => (
              <rect
                key={i}
                x={-5}
                y={-62}
                width={10}
                height={18}
                rx={5}
                fill={url('ray')}
                transform={`rotate(${i * 45})`}
              />
            ))}
          </g>
          <g className="art-core">
            <circle r={38} fill={url('sun')} />
            <ellipse cx={-12} cy={-14} rx={12} ry={7} fill="oklch(1 0 0 / 0.45)" />
          </g>
        </g>
      )}

      {hasOrb && !isDay && (
        <g transform={big ? 'translate(110 85) scale(1.2)' : 'translate(140 60)'}>
          <g className="art-moon">
            <circle r={34} fill={url('moon')} />
            <circle cx={-10} cy={-6} r={6} fill="oklch(0.78 0.04 258 / 0.55)" />
            <circle cx={9} cy={10} r={4} fill="oklch(0.78 0.04 258 / 0.55)" />
            <circle cx={12} cy={-12} r={3} fill="oklch(0.78 0.04 258 / 0.5)" />
          </g>
          {big &&
            [
              [-62, -40, 0],
              [58, -46, 1.2],
              [66, 30, 2.1],
            ].map(([x, y, d]) => (
              <circle key={`${x}`} cx={x} cy={y} r={2.4} className="art-star" fill="oklch(0.97 0.03 95)" style={delay(d)} />
            ))}
        </g>
      )}

      {/* Precipitation sits behind the cloud so drops appear from its base. */}
      {(sky === 'rain' || sky === 'drizzle' || sky === 'storm') && (
        <g className="art-drops">
          {(sky === 'drizzle' ? [66, 96, 126] : [52, 76, 100, 124, 148]).map((x, i) => (
            <g key={x} className="art-drop" style={delay(i * (sky === 'drizzle' ? 0.45 : 0.22))}>
              <path
                d={
                  sky === 'drizzle'
                    ? 'M0 0 C 3 5 5 8 5 11 A 5 5 0 0 1 -5 11 C -5 8 -3 5 0 0 Z'
                    : 'M0 0 C 4 7 7 11 7 15 A 7 7 0 0 1 -7 15 C -7 11 -4 7 0 0 Z'
                }
                fill={url('drop')}
                transform={`translate(${x} ${124 + (i % 2) * 8}) rotate(18)`}
              />
            </g>
          ))}
        </g>
      )}

      {sky === 'snow' && (
        <g className="art-snow" fill="oklch(0.97 0.01 240)" stroke="oklch(0.72 0.06 245)" strokeWidth={1.5}>
          {[
            [58, 128],
            [86, 136],
            [114, 128],
            [142, 136],
            [100, 146],
          ].map(([x, y], i) => (
            <g key={`${x}-${y}`} className="art-flake" style={delay(i * 0.55)}>
              <circle cx={x} cy={y} r={5} />
            </g>
          ))}
        </g>
      )}

      {hasCloud && (
        <g className="art-cloud">
          <Cloud fill={url(sky === 'storm' ? 'storm' : 'cloud')} />
          {sky === 'cloudy' && (
            <g className="art-cloud-back">
              <g transform="translate(70 -30) scale(0.55)" opacity={0.9}>
                <Cloud fill={url('cloud')} />
              </g>
            </g>
          )}
        </g>
      )}

      {sky === 'storm' && (
        <path
          className="art-bolt"
          d="M104 118 L88 146 L102 146 L94 168 L122 136 L108 136 L116 118 Z"
          fill={url('bolt')}
        />
      )}

      {sky === 'fog' && (
        <g stroke="oklch(0.8 0.03 245)" strokeWidth={8} strokeLinecap="round">
          <line x1={40} y1={140} x2={150} y2={140} className="art-fog" />
          <line x1={64} y1={158} x2={176} y2={158} className="art-fog art-fog--b" />
        </g>
      )}
    </svg>
  )
}

function Cloud({ fill }: { fill: string }) {
  return (
    <path
      d="M52 128 C 26 128 18 100 38 90 C 34 66 60 52 80 62 C 90 38 130 36 140 64 C 168 60 186 84 176 106 C 192 112 188 128 168 128 Z"
      fill={fill}
    />
  )
}
