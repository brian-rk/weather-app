import { useEffect, useRef, useState, type RefObject } from 'react'
import type * as maplibregl from 'maplibre-gl'
import type { Units } from '../lib/weather'

type Grid = {
  west: number
  east: number
  south: number
  north: number
  cols: number
  rows: number
  temp: number[]
  /** Wind components in km/h (u eastward, v northward). */
  u: number[]
  v: number[]
}

export type LayerInfo = {
  loading: boolean
  error: boolean
  tempRange: [number, number] | null
  windMax: number | null
}

const COLS = 9
const ROWS = 7
const FIELD_STEP = 16 // px between wind-field samples
const TEMP_STEP = 10 // px per temperature cell before blur

/** Temperature colour ramp in °C (blue cold to red hot). */
const RAMP: [number, [number, number, number]][] = [
  [-25, [120, 70, 200]],
  [-10, [70, 110, 230]],
  [0, [80, 170, 240]],
  [8, [90, 200, 200]],
  [15, [140, 210, 110]],
  [21, [240, 215, 80]],
  [27, [245, 150, 60]],
  [33, [230, 80, 60]],
  [42, [160, 30, 60]],
]

export function tempColor(c: number) {
  if (c <= RAMP[0][0]) return RAMP[0][1]
  for (let i = 1; i < RAMP.length; i++) {
    const [t1, c1] = RAMP[i]
    const [t0, c0] = RAMP[i - 1]
    if (c <= t1) {
      const k = (c - t0) / (t1 - t0)
      return [0, 1, 2].map((j) => Math.round(c0[j] + (c1[j] - c0[j]) * k)) as [number, number, number]
    }
  }
  return RAMP[RAMP.length - 1][1]
}

/** CSS gradient matching the ramp between two °C values (for the legend). */
export function tempGradient(minC: number, maxC: number) {
  const stops = Array.from({ length: 6 }, (_, i) => {
    const c = minC + ((maxC - minC) * i) / 5
    const [r, g, b] = tempColor(c)
    return `rgb(${r} ${g} ${b}) ${i * 20}%`
  })
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

function sample(grid: Grid, values: number[], lon: number, lat: number) {
  const fx = Math.min(Math.max(((lon - grid.west) / (grid.east - grid.west)) * (grid.cols - 1), 0), grid.cols - 1)
  const fy = Math.min(Math.max(((grid.north - lat) / (grid.north - grid.south)) * (grid.rows - 1), 0), grid.rows - 1)
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const x1 = Math.min(x0 + 1, grid.cols - 1)
  const y1 = Math.min(y0 + 1, grid.rows - 1)
  const tx = fx - x0
  const ty = fy - y0
  const at = (x: number, y: number) => values[y * grid.cols + x]
  return (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) + (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty
}

async function fetchGrid(b: maplibregl.LngLatBounds, signal: AbortSignal): Promise<Grid> {
  const padX = (b.getEast() - b.getWest()) * 0.1
  const padY = (b.getNorth() - b.getSouth()) * 0.1
  const west = b.getWest() - padX
  const east = b.getEast() + padX
  const south = Math.max(b.getSouth() - padY, -85)
  const north = Math.min(b.getNorth() + padY, 85)
  const lats: number[] = []
  const lons: number[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      lats.push(north - ((north - south) * r) / (ROWS - 1))
      // Wrap longitudes into range for the API; keep the unwrapped grid for drawing.
      const lon = west + ((east - west) * c) / (COLS - 1)
      lons.push(((((lon + 180) % 360) + 360) % 360) - 180)
    }
  }
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats.map((v) => v.toFixed(2)).join(',')}` +
    `&longitude=${lons.map((v) => v.toFixed(2)).join(',')}` +
    '&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh'
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(String(res.status))
  const raw = (await res.json()) as { current: { temperature_2m: number; wind_speed_10m: number; wind_direction_10m: number } }[]
  const list = Array.isArray(raw) ? raw : [raw]
  const temp = list.map((r) => r.current.temperature_2m)
  // Meteorological direction is where wind comes FROM.
  const u = list.map((r) => -r.current.wind_speed_10m * Math.sin((r.current.wind_direction_10m * Math.PI) / 180))
  const v = list.map((r) => -r.current.wind_speed_10m * Math.cos((r.current.wind_direction_10m * Math.PI) / 180))
  return { west, east, south, north, cols: COLS, rows: ROWS, temp, u, v }
}

function makeCanvas(className: string) {
  const c = document.createElement('canvas')
  c.className = className
  return c
}

/**
 * Temperature colour wash and animated wind streams drawn on canvases above
 * the map tiles (below markers). Data is a coarse grid of live readings for
 * the visible area, re-fetched whenever the map stops moving.
 */
export function useWeatherLayers(
  mapRef: RefObject<maplibregl.Map | null>,
  ready: boolean,
  layers: { wind: boolean; temp: boolean },
  units: Units,
  dark: boolean,
): LayerInfo {
  const [info, setInfo] = useState<LayerInfo>({ loading: false, error: false, tempRange: null, windMax: null })
  const gridRef = useRef<Grid | null>(null)
  const any = layers.wind || layers.temp

  useEffect(() => {
    const m = mapRef.current
    if (!m || !ready || !any) return
    const container = m.getCanvasContainer()
    const tempCanvas = makeCanvas('wx-temp')
    const windCanvas = makeCanvas('wx-wind')
    if (layers.temp) container.appendChild(tempCanvas)
    if (layers.wind) container.appendChild(windCanvas)
    const tctx = tempCanvas.getContext('2d')!
    const wctx = windCanvas.getContext('2d')!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let dpr = 1
    let field: Float32Array | null = null // [dx, dy] per FIELD_STEP cell, screen px per frame
    let fcols = 0
    let frows = 0
    let raf = 0
    let ctrl: AbortController | null = null
    let particles: { x: number; y: number; age: number; life: number }[] = []

    const resize = () => {
      // The canvas container has no size of its own; the map canvas does.
      const r = m.getCanvas().getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      for (const c of [tempCanvas, windCanvas]) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
        c.style.width = `${w}px`
        c.style.height = `${h}px`
      }
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      wctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawTemp = () => {
      const g = gridRef.current
      if (!g || !layers.temp) return
      tctx.clearRect(0, 0, w, h)
      for (let y = 0; y < h; y += TEMP_STEP) {
        for (let x = 0; x < w; x += TEMP_STEP) {
          const ll = m.unproject([x + TEMP_STEP / 2, y + TEMP_STEP / 2])
          const t = sample(g, g.temp, ll.lng, ll.lat)
          const [r, gg, b] = tempColor(t)
          tctx.fillStyle = `rgb(${r} ${gg} ${b})`
          tctx.fillRect(x, y, TEMP_STEP + 1, TEMP_STEP + 1)
        }
      }
    }

    const buildField = () => {
      const g = gridRef.current
      if (!g) return
      fcols = Math.ceil(w / FIELD_STEP) + 1
      frows = Math.ceil(h / FIELD_STEP) + 1
      field = new Float32Array(fcols * frows * 2)
      // Screen speed: ~0.07 px per frame per km/h, eased so storms don't streak wildly.
      for (let j = 0; j < frows; j++) {
        for (let i = 0; i < fcols; i++) {
          const ll = m.unproject([i * FIELD_STEP, j * FIELD_STEP])
          const u = sample(g, g.u, ll.lng, ll.lat)
          const v = sample(g, g.v, ll.lng, ll.lat)
          const speed = Math.hypot(u, v)
          const k = speed > 0 ? (Math.sqrt(speed) * 0.32) / speed : 0
          field[(j * fcols + i) * 2] = u * k
          field[(j * fcols + i) * 2 + 1] = -v * k
        }
      }
    }

    const vec = (x: number, y: number): [number, number] => {
      if (!field) return [0, 0]
      const i = Math.min(Math.max(Math.round(x / FIELD_STEP), 0), fcols - 1)
      const j = Math.min(Math.max(Math.round(y / FIELD_STEP), 0), frows - 1)
      const o = (j * fcols + i) * 2
      return [field[o], field[o + 1]]
    }

    const spawn = () => ({ x: Math.random() * w, y: Math.random() * h, age: 0, life: 40 + Math.random() * 60 })

    const resetParticles = () => {
      const n = Math.min(Math.round((w * h) / 260), 2600)
      particles = Array.from({ length: n }, () => ({ ...spawn(), age: Math.random() * 80 }))
      wctx.clearRect(0, 0, w, h)
    }

    const stroke = dark ? 'rgba(235, 242, 255, 0.75)' : 'rgba(20, 40, 80, 0.55)'

    const drawStaticWind = () => {
      // Reduced motion: short arrows instead of moving streams.
      wctx.clearRect(0, 0, w, h)
      wctx.strokeStyle = stroke
      wctx.lineWidth = 1.4
      for (let y = 30; y < h; y += 56) {
        for (let x = 30; x < w; x += 56) {
          const [dx, dy] = vec(x, y)
          const len = Math.hypot(dx, dy) || 1
          const ux = (dx / len) * 12
          const uy = (dy / len) * 12
          wctx.beginPath()
          wctx.moveTo(x - ux, y - uy)
          wctx.lineTo(x + ux, y + uy)
          wctx.lineTo(x + ux - ux * 0.4 - uy * 0.3, y + uy - uy * 0.4 + ux * 0.3)
          wctx.stroke()
        }
      }
    }

    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (document.hidden || !field) return
      // Fade previous frame to leave short trails.
      wctx.globalCompositeOperation = 'destination-in'
      wctx.fillStyle = 'rgba(0,0,0,0.9)'
      wctx.fillRect(0, 0, w, h)
      wctx.globalCompositeOperation = 'source-over'
      wctx.strokeStyle = stroke
      wctx.lineWidth = 1.1
      wctx.beginPath()
      for (const p of particles) {
        const [dx, dy] = vec(p.x, p.y)
        const nx = p.x + dx
        const ny = p.y + dy
        wctx.moveTo(p.x, p.y)
        wctx.lineTo(nx, ny)
        p.x = nx
        p.y = ny
        p.age++
        if (p.age > p.life || nx < 0 || ny < 0 || nx > w || ny > h) Object.assign(p, spawn())
      }
      wctx.stroke()
    }

    let pending = false
    const redraw = () => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false
        drawTemp()
        if (layers.wind) {
          buildField()
          if (reduced) drawStaticWind()
        }
      })
    }

    const load = () => {
      ctrl?.abort()
      ctrl = new AbortController()
      setInfo((s) => ({ ...s, loading: true, error: false }))
      fetchGrid(m.getBounds(), ctrl.signal)
        .then((g) => {
          gridRef.current = g
          const tmin = Math.min(...g.temp)
          const tmax = Math.max(...g.temp)
          const wmax = Math.max(...g.u.map((u, i) => Math.hypot(u, g.v[i])))
          setInfo({ loading: false, error: false, tempRange: [tmin, tmax], windMax: wmax })
          redraw()
          if (layers.wind && !reduced) resetParticles()
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setInfo((s) => ({ ...s, loading: false, error: true }))
        })
    }

    let moveTimer = 0
    const onMove = () => redraw()
    const onMoveStart = () => {
      if (layers.wind && !reduced) wctx.clearRect(0, 0, w, h)
    }
    const onMoveEnd = () => {
      window.clearTimeout(moveTimer)
      moveTimer = window.setTimeout(load, 350)
      if (layers.wind && !reduced) resetParticles()
    }
    const onResize = () => {
      resize()
      redraw()
      if (layers.wind && !reduced) resetParticles()
    }

    resize()
    load()
    m.on('move', onMove)
    m.on('movestart', onMoveStart)
    m.on('moveend', onMoveEnd)
    m.on('resize', onResize)
    if (layers.wind && !reduced) raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(moveTimer)
      ctrl?.abort()
      m.off('move', onMove)
      m.off('movestart', onMoveStart)
      m.off('moveend', onMoveEnd)
      m.off('resize', onResize)
      tempCanvas.remove()
      windCanvas.remove()
    }
  }, [mapRef, ready, any, layers.wind, layers.temp, units, dark])

  return any ? info : { loading: false, error: false, tempRange: null, windMax: null }
}
