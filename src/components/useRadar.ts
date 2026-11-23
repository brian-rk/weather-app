import { useEffect, useState, type RefObject } from 'react'
import type * as maplibregl from 'maplibre-gl'
import { t } from '../lib/i18n'

type Frame = { time: number; path: string }
type Status = 'off' | 'loading' | 'ready' | 'error'

const INDEX_URL = 'https://api.rainviewer.com/public/weather-maps.json'
const OPACITY = 0.72
const FRAME_MS = 650
// RainViewer's free tiles stop at zoom 7; MapLibre scales them beyond that.
const MAX_ZOOM = 7
const ATTRIBUTION = '<a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>'

const layerId = (i: number) => `radar-${i}`

/**
 * Animated precipitation radar from RainViewer (past ~2 hours, free, no key).
 * Every frame is added as its own raster layer so tiles stay cached and
 * playback only toggles opacity.
 */
export function useRadar(mapRef: RefObject<maplibregl.Map | null>, enabled: boolean) {
  const [frames, setFrames] = useState<Frame[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState<Status>('off')

  // Load frames and add one layer per frame.
  useEffect(() => {
    const m = mapRef.current
    if (!enabled || !m) return
    const ctrl = new AbortController()
    let added = 0
    setStatus('loading')

    fetch(INDEX_URL, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<{ host: string; radar: { past: Frame[] } }>
      })
      .then(({ host, radar }) => {
        const past = radar.past
        const add = () => {
          // Keep radar under the place labels so names stay readable.
          const before = m.getLayer('label-country') ? 'label-country' : undefined
          past.forEach((f, i) => {
            m.addSource(layerId(i), {
              type: 'raster',
              tiles: [`${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`],
              tileSize: 256,
              maxzoom: MAX_ZOOM,
              attribution: ATTRIBUTION,
            })
            m.addLayer(
              {
                id: layerId(i),
                type: 'raster',
                source: layerId(i),
                paint: {
                  'raster-opacity': i === past.length - 1 ? OPACITY : 0,
                  'raster-fade-duration': 0,
                },
              },
              before,
            )
          })
          added = past.length
          setFrames(past)
          setIndex(past.length - 1)
          setStatus(past.length ? 'ready' : 'error')
        }
        // The caller only enables radar after the map's first 'load' event.
        add()
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setStatus('error')
      })

    return () => {
      ctrl.abort()
      setPlaying(false)
      setFrames([])
      setStatus('off')
      // The map may already be gone if the whole card unmounted.
      if (!mapRef.current) return
      for (let i = 0; i < added; i++) {
        if (m.getLayer(layerId(i))) m.removeLayer(layerId(i))
        if (m.getSource(layerId(i))) m.removeSource(layerId(i))
      }
    }
  }, [enabled, mapRef])

  // Show only the selected frame.
  useEffect(() => {
    const m = mapRef.current
    if (!m || frames.length === 0) return
    frames.forEach((_, i) => {
      if (m.getLayer(layerId(i))) m.setPaintProperty(layerId(i), 'raster-opacity', i === index ? OPACITY : 0)
    })
  }, [index, frames, mapRef])

  // Playback loop.
  useEffect(() => {
    if (!playing || frames.length < 2) return
    const t = window.setInterval(() => setIndex((i) => (i + 1) % frames.length), FRAME_MS)
    return () => window.clearInterval(t)
  }, [playing, frames.length])

  return { frames, index, setIndex, playing, setPlaying, status }
}

/** "Now", "10 min ago", "1 h 20 min ago" relative to the newest frame. */
export function frameLabel(frames: Frame[], i: number) {
  const last = frames.at(-1)
  const f = frames[i]
  if (!last || !f) return ''
  const mins = Math.round((last.time - f.time) / 60)
  if (mins === 0) return t('Latest')
  if (mins < 60) return t('{n} min ago', { n: mins })
  return t('{h} h {m} min ago', { h: Math.floor(mins / 60), m: mins % 60 })
}
