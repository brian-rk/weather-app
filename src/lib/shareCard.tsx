import { renderToStaticMarkup } from 'react-dom/server'
import { WeatherArt } from '../components/WeatherArt'
import { describe, round, type Forecast, type Place, type Sky, type Units } from './weather'
import { formatDay, t } from './i18n'

export type CardStyle = 'sky' | 'light' | 'dark'
export type CardFormat = 'square' | 'story'

type Theme = { bg: [string, string, string]; ink: string; muted: string; panel: string }

function themeFor(style: CardStyle, sky: Sky, isDay: boolean): Theme {
  if (style === 'light')
    return { bg: ['#f7f9fc', '#eef3f8', '#fdf1e6'], ink: '#1d2740', muted: '#5d6880', panel: 'rgba(29,39,64,0.06)' }
  if (style === 'dark')
    return { bg: ['#141a24', '#1b2433', '#2a2438'], ink: '#f2f5fa', muted: '#a8b3c6', panel: 'rgba(255,255,255,0.07)' }
  if (!isDay)
    return { bg: ['#2a2f63', '#45397a', '#8a5a5a'], ink: '#f5f6fb', muted: '#cbd0ea', panel: 'rgba(255,255,255,0.1)' }
  if (sky === 'clear' || sky === 'partly')
    return { bg: ['#a9dbe0', '#d4ead8', '#f6dcc4'], ink: '#1d2740', muted: '#46546e', panel: 'rgba(255,255,255,0.45)' }
  return { bg: ['#b8c6d8', '#d3dbe6', '#e9ddd2'], ink: '#1d2740', muted: '#4c5a72', panel: 'rgba(255,255,255,0.45)' }
}

/** WeatherArt as an image the canvas can draw. */
function artImage(sky: Sky, isDay: boolean): Promise<HTMLImageElement> {
  const svg = renderToStaticMarkup(<WeatherArt sky={sky} isDay={isDay} still />).replace(
    '<svg',
    '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="340"',
  )
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Draws a shareable forecast card and returns it as a canvas. */
export async function renderShareCard(opts: {
  place: Place
  forecast: Forecast
  units: Units
  style: CardStyle
  format: CardFormat
}): Promise<HTMLCanvasElement> {
  const { place, forecast: f, units, style, format } = opts
  const W = 1080
  const H = format === 'story' ? 1920 : 1350
  const c = f.current
  const cond = describe(c.code)
  const th = themeFor(style, cond.sky, c.isDay)

  await Promise.all([
    document.fonts.load('500 300px Geist'),
    document.fonts.load('600 72px Geist'),
    document.fonts.load('400 36px Geist'),
  ]).catch(() => {})

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const font = (weight: number, size: number) => `${weight} ${size}px Geist, system-ui, sans-serif`

  // Background
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, th.bg[0])
  g.addColorStop(0.5, th.bg[1])
  g.addColorStop(1, th.bg[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // Soft cloud puffs
  for (const [x, y, r, a] of [
    [W * 0.55, 60, 220, 0.35],
    [W * 0.15, -40, 260, 0.25],
    [W * 0.95, H * 0.35, 200, 0.2],
  ] as const) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, `rgba(255,255,255,${th.ink === '#f2f5fa' || th.ink === '#f5f6fb' ? a * 0.25 : a})`)
    rg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, W, H)
  }

  const pad = 84
  let y = pad

  // Brand
  ctx.fillStyle = '#f08a3c'
  const logo = new Path2D(
    'M10 30C4.5 30 1 26.4 1 21.8c0-4 2.9-7.3 6.8-8C8.9 7.6 14 3 20.2 3c5.4 0 10 3.5 11.6 8.4C36 12.3 39 16 39 20.4 39 25.7 34.8 30 29.5 30Z',
  )
  ctx.save()
  ctx.translate(pad, y)
  ctx.scale(1.4, 1.4)
  ctx.fill(logo)
  ctx.restore()
  ctx.fillStyle = th.ink
  ctx.font = font(600, 38)
  ctx.textBaseline = 'middle'
  ctx.fillText('Nimbus', pad + 74, y + 22)
  ctx.textBaseline = 'alphabetic'

  // Place + date
  y += 150
  ctx.font = font(600, place.name.length > 14 ? 64 : 80)
  ctx.fillText(place.name, pad, y, W * 0.55)
  y += 58
  ctx.fillStyle = th.muted
  ctx.font = font(400, 36)
  ctx.fillText([place.region.split(', ').pop(), formatDay(c.time.slice(0, 10), 'long')].filter(Boolean).join(' · '), pad, y, W * 0.6)

  // Illustration
  const art = await artImage(cond.sky, c.isDay).catch(() => null)
  if (art) ctx.drawImage(art, W - pad - 440 + 30, pad + 40, 440, 340)

  // Big temperature
  y += format === 'story' ? 380 : 300
  ctx.fillStyle = th.ink
  ctx.font = font(500, 300)
  const tempText = `${round(c.temperature)}°`
  ctx.fillText(tempText, pad - 12, y)
  const tw = ctx.measureText(tempText).width
  ctx.font = font(400, 96)
  ctx.fillText(units === 'metric' ? 'C' : 'F', pad + tw - 20, y - 150)

  // Condition + range
  y += 80
  ctx.font = font(500, 52)
  ctx.fillText(cond.label, pad, y)
  y += 60
  ctx.fillStyle = th.muted
  ctx.font = font(400, 38)
  ctx.fillText(
    `${t('High')} ${round(f.daily.max[0])}°  ·  ${t('Low')} ${round(f.daily.min[0])}°  ·  ${t('Feels like')} ${round(c.feelsLike)}°`,
    pad,
    y,
    W - pad * 2,
  )

  // Next days strip
  const days = Math.min(5, f.daily.time.length - 1)
  const stripH = 260
  const stripY = H - pad - stripH - 70
  ctx.fillStyle = th.panel
  roundRect(ctx, pad, stripY, W - pad * 2, stripH, 40)
  ctx.fill()
  const colW = (W - pad * 2) / days
  for (let i = 0; i < days; i++) {
    const d = i + 1
    const cx = pad + colW * i + colW / 2
    const dc = describe(f.daily.code[d])
    ctx.textAlign = 'center'
    ctx.fillStyle = th.muted
    ctx.font = font(500, 30)
    ctx.fillText(formatDay(f.daily.time[d], 'short'), cx, stripY + 56)
    const small = await artImage(dc.sky, true).catch(() => null)
    if (small) ctx.drawImage(small, cx - 55, stripY + 76, 110, 85)
    ctx.fillStyle = th.ink
    ctx.font = font(600, 36)
    ctx.fillText(`${round(f.daily.max[d])}°`, cx - 30, stripY + 214)
    ctx.fillStyle = th.muted
    ctx.font = font(400, 32)
    ctx.fillText(`${round(f.daily.min[d])}°`, cx + 36, stripY + 214)
  }
  ctx.textAlign = 'left'

  // Footer
  ctx.fillStyle = th.muted
  ctx.font = font(400, 26)
  ctx.fillText(t('Forecast data by Open-Meteo'), pad, H - pad + 10)

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'),
  )
}
