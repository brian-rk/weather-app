import {
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloud,
  Moon,
  Sun,
  type IconProps,
} from '@phosphor-icons/react'
import type { Sky } from '../lib/weather'

export function SkyIcon({ sky, isDay, ...rest }: { sky: Sky; isDay: boolean } & IconProps) {
  switch (sky) {
    case 'clear':
      return isDay ? <Sun {...rest} /> : <Moon {...rest} />
    case 'partly':
      return isDay ? <CloudSun {...rest} /> : <CloudMoon {...rest} />
    case 'fog':
      return <CloudFog {...rest} />
    case 'drizzle':
    case 'rain':
      return <CloudRain {...rest} />
    case 'snow':
      return <CloudSnow {...rest} />
    case 'storm':
      return <CloudLightning {...rest} />
    default:
      return <Cloud {...rest} />
  }
}
