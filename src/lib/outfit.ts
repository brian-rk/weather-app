import type { Sky } from './weather'

export type Outfit = 'rain' | 'snow' | 'cold' | 'sun' | 'mild'

export function outfitFor(sky: Sky, maxC: number): Outfit {
  if (sky === 'rain' || sky === 'drizzle' || sky === 'storm') return 'rain'
  if (sky === 'snow') return 'snow'
  if (maxC <= 8) return 'cold'
  if ((sky === 'clear' || sky === 'partly') && maxC >= 18) return 'sun'
  return 'mild'
}
