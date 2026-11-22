const DIGITS = '0123456789'

/**
 * Rolls each digit to its new value like a mechanical counter. Columns are
 * keyed from the right so "9" to "10" rolls the ones and adds a tens column.
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
            <span className="odo-reel" style={{ transform: `translateY(${-Number(ch) * 10}%)` }}>
              {DIGITS.split('').map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
