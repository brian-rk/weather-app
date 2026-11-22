import { useEffect, useRef, useState } from 'react'

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Animates a number from its previous value to `target` (ease-out quart).
 * Returns the in-between value; jumps straight there when the user prefers
 * reduced motion.
 */
export function useCountUp(target: number, duration = 700) {
  // On first appearance, rise a few degrees into place rather than from zero.
  const [value, setValue] = useState(() => (reduced() ? target : target - 8))
  const from = useRef(value)

  useEffect(() => {
    const start = from.current
    if (start === target || reduced()) {
      from.current = target
      setValue(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      const v = start + (target - start) * eased
      from.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
