import { useEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre looks for its worker next to its own module, which no longer holds
// once Vite bundles it. Ship the worker as an asset and point MapLibre at it.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { ArrowsIn, ArrowsOut, Crosshair, Minus, Plus, StackSimple } from '@phosphor-icons/react'
import { SkyIcon } from './SkyIcon'
import { LABEL_LAYERS, mapStyle } from '../lib/mapStyle'
import {
  describe,
  fetchSnapshots,
  round,
  weekday,
  type Forecast,
  type Place,
  type Snapshot,
  type Units,
} from '../lib/weather'

maplibregl.setWorkerUrl(workerUrl)

const ZOOM = 5

/** Ring of sample points around the selected place. */
function ring(place: Place) {
  const r = 2.6
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 6 + 0.35
    return {
      latitude: Math.max(-80, Math.min(80, place.latitude + Math.sin(a) * r * 0.75)),
      longitude: place.longitude + Math.cos(a) * r,
    }
  })
}

function tempMarker(s: Snapshot) {
  const el = document.createElement('div')
  el.className = 'map-temp-wrap'
  el.innerHTML = renderToStaticMarkup(
    <span className="map-temp">
      <SkyIcon sky={describe(s.code).sky} isDay={s.isDay} size={16} weight="fill" />
      {round(s.temperature)}°
    </span>,
  )
  return el
}

function pinMarker(name: string) {
  const el = document.createElement('div')
  el.className = 'map-pin'
  el.setAttribute('aria-label', name)
  el.innerHTML = '<span></span>'
  return el
}

/** Run `fn` now if the style is ready, otherwise once it loads. */
function whenReady(m: maplibregl.Map, fn: () => void) {
  if (m.isStyleLoaded()) fn()
  else m.once('load', fn)
}

type Props = {
  place: Place
  forecast: Forecast | null
  units: Units
  expanded: boolean
  onToggleExpanded: () => void
}

export function MapCard({ place, forecast, units, expanded, onToggleExpanded }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [labels, setLabels] = useState(false)
  const [failed, setFailed] = useState(false)

  // Create the map once.
  useEffect(() => {
    if (!el.current) return
    const m = new maplibregl.Map({
      container: el.current,
      style: mapStyle,
      center: [place.longitude, place.latitude],
      zoom: ZOOM,
      scrollZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    })
    m.touchZoomRotate.disableRotation()
    // Keep credits behind the (i) button so they don't cover the summary card.
    m.once('load', () => {
      el.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
    })
    m.on('error', (e: maplibregl.ErrorEvent) => {
      // Tile hiccups are recoverable; only flag when the style itself can't load.
      if (!m.isStyleLoaded() && e.error?.message?.includes('style')) setFailed(true)
    })
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
    // The map follows `place` in the effect below; it must only be created once.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the selected place and load surrounding readings.
  useEffect(() => {
    const m = map.current
    if (!m) return
    m.flyTo({ center: [place.longitude, place.latitude], zoom: ZOOM, duration: 700, essential: true })

    markers.current.forEach((mk) => mk.remove())
    markers.current = [
      new maplibregl.Marker({ element: pinMarker(place.name), anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(m),
    ]

    const pts = ring(place)
    const ctrl = new AbortController()
    fetchSnapshots(pts, units, ctrl.signal)
      .then((snaps) => {
        snaps.forEach((s, i) => {
          markers.current.push(
            new maplibregl.Marker({ element: tempMarker(s) })
              .setLngLat([pts[i].longitude, pts[i].latitude])
              .addTo(m),
          )
        })
      })
      .catch(() => {
        /* Surrounding readings are a nice-to-have; the pin still shows. */
      })
    return () => ctrl.abort()
  }, [place, units])

  // The canvas has to be told when its container changes size.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const t = window.setTimeout(() => m.resize(), 260)
    return () => window.clearTimeout(t)
  }, [expanded])

  useEffect(() => {
    const m = map.current
    if (!m) return
    whenReady(m, () => {
      LABEL_LAYERS.forEach((id) => m.setLayoutProperty(id, 'visibility', labels ? 'visible' : 'none'))
    })
  }, [labels])

  const c = forecast?.current
  const cond = c ? describe(c.code) : null

  return (
    <section className={`card map ${expanded ? 'map--expanded' : ''}`} aria-label={`Map around ${place.name}`}>
      <div ref={el} className="map-canvas" />
      <div className="map-wash" aria-hidden="true" />

      {failed && <p className="map-failed">The map couldn't load. Weather data is unaffected.</p>}

      <button type="button" className="map-fab map-expand" onClick={onToggleExpanded}>
        {expanded ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}
        <span className="sr-only">{expanded ? 'Collapse map' : 'Expand map'}</span>
      </button>

      <div className="map-tools">
        <div className="zoom-pill">
          <button type="button" onClick={() => map.current?.zoomIn()}>
            <Plus size={16} weight="bold" />
            <span className="sr-only">Zoom in</span>
          </button>
          <button type="button" onClick={() => map.current?.zoomOut()}>
            <Minus size={16} weight="bold" />
            <span className="sr-only">Zoom out</span>
          </button>
        </div>
        <button
          type="button"
          className="map-fab"
          onClick={() =>
            map.current?.flyTo({ center: [place.longitude, place.latitude], zoom: ZOOM, duration: 500 })
          }
        >
          <Crosshair size={18} />
          <span className="sr-only">Recenter on {place.name}</span>
        </button>
        <button type="button" className="map-fab" aria-pressed={labels} onClick={() => setLabels((v) => !v)}>
          <StackSimple size={18} weight={labels ? 'fill' : 'regular'} />
          <span className="sr-only">Show place labels</span>
        </button>
      </div>

      {c && cond && forecast && (
        <div className="map-callout">
          <p className="temp-md">
            {round(c.temperature)}°{units === 'metric' ? 'C' : 'F'}
          </p>
          <p>
            <strong>{weekday(forecast.current.time.slice(0, 10))}</strong>
            <small>{cond.label}</small>
          </p>
        </div>
      )}
    </section>
  )
}
