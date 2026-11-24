import type { CSSProperties } from 'react'

const DIGITS = '0123456789'

/**
 * Each digit sits on a ten-sided drum that rolls in 3D to its value.
 * Columns are keyed from the right, so 9 to 10 rolls the ones and adds a tens drum.
 * The rotation comes from a CSS variable so the first appearance can roll in
 * from zero (via @starting-style) instead of snapping into place.
 */
export function Odometer({ value, className }: { value: number; className?: string }) {
  const text = String(Math.round(value))
  const chars = text.split('')
  return (
    <span className={['odo', className].filter(Boolean).join(' ')}>
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const fromRight = chars.length - i
        if (!DIGITS.includes(ch)) {
          return (
            <span key={`s-${fromRight}`} className="odo-sign" aria-hidden="true">
              {ch === '-' ? '−' : ch}
            </span>
          )
        }
        return (
          <span key={`d-${fromRight}`} className="odo-col" aria-hidden="true">
            {/* Invisible digit keeps the column the right width. */}
            <span className="odo-ghost">0</span>
            <span className="odo-drum" style={{ '--d': Number(ch), '--delay': `${(fromRight - 1) * 90}ms` } as CSSProperties}>
              {DIGITS.split('').map((d, k) => (
                <span key={d} className="odo-face" style={{ '--k': k } as CSSProperties}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
