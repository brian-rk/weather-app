import { useEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre looks for its worker next to its own module, which no longer holds
// once Vite bundles it. Ship the worker as an asset and point MapLibre at it.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import {
  ArrowsIn,
  ArrowsOut,
  CloudRain,
  Crosshair,
  Minus,
  Pause,
  Play,
  Plus,
  StackSimple,
} from '@phosphor-icons/react'
import { frameLabel, useRadar } from './useRadar'
import { SkyIcon } from './SkyIcon'
import { LABEL_LAYERS, applyMapColors, mapStyle } from '../lib/mapStyle'
import {
  describe,
  fetchSnapshots,
  reverseGeocode,
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

type Props = {
  place: Place
  forecast: Forecast | null
  units: Units
  expanded: boolean
  onToggleExpanded: () => void
  /** Open the forecast for a spot picked on the map. */
  onPick: (p: Place) => void
  dark: boolean
}

export function MapCard({ place, forecast, units, expanded, onToggleExpanded, onPick, dark }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [labels, setLabels] = useState(false)
  const [failed, setFailed] = useState(false)
  const [radarOn, setRadarOn] = useState(false)
  // isStyleLoaded() also turns false while tiles stream in, so track the
  // first 'load' ourselves and gate style edits on it.
  const [ready, setReady] = useState(false)
  const radar = useRadar(map, ready && radarOn)

  // The click handler is registered once; read the latest values through refs.
  const latest = useRef({ units, onPick })
  useEffect(() => {
    latest.current = { units, onPick }
  })

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
      setReady(true)
      el.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
    })
    m.on('error', (e: maplibregl.ErrorEvent) => {
      // Tile hiccups are recoverable; only flag when the style itself can't load.
      if (!m.loaded() && e.error?.message?.includes('style')) setFailed(true)
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

  // Click anywhere: preview that spot's weather, then open it on request.
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    let popup: maplibregl.Popup | null = null
    let ctrl: AbortController | null = null

    const onClick = (e: maplibregl.MapMouseEvent) => {
      ctrl?.abort()
      popup?.remove()
      const { lat, lng } = e.lngLat.wrap()
      ctrl = new AbortController()

      const box = document.createElement('div')
      box.className = 'pick'
      box.setAttribute('role', 'status')
      const loading = document.createElement('p')
      loading.className = 'pick-note'
      loading.textContent = 'Checking the weather here'
      box.append(loading)

      popup = new maplibregl.Popup({ maxWidth: '260px', className: 'pick-popup', offset: 10, focusAfterOpen: false })
        .setLngLat(e.lngLat)
        .setDOMContent(box)
        .addTo(m)

      Promise.all([
        reverseGeocode(lat, lng, ctrl.signal),
        fetchSnapshots([{ latitude: lat, longitude: lng }], latest.current.units, ctrl.signal),
      ])
        .then(([spot, [snap]]) => {
          const cond = describe(snap.code)
          const name = document.createElement('strong')
          name.textContent = spot.name
          const region = document.createElement('small')
          region.textContent = spot.region || 'Selected spot'
          const now = document.createElement('p')
          now.className = 'pick-now'
          now.textContent = `${round(snap.temperature)}° · ${cond.label}`
          const range = document.createElement('small')
          range.textContent = `Today ${round(snap.max)}° / ${round(snap.min)}°`
          const go = document.createElement('button')
          go.type = 'button'
          go.className = 'pick-go'
          go.textContent = 'Show forecast'
          go.addEventListener('click', () => {
            popup?.remove()
            latest.current.onPick(spot)
          })
          box.replaceChildren(name, region, now, range, go)
          // The content just grew; re-place the popup so it stays inside the map.
          if (popup) popup.setLngLat(popup.getLngLat())
          go.focus({ preventScroll: true })
        })
        .catch((err: Error) => {
          if (err.name === 'AbortError') return
          loading.textContent = "Couldn't load the weather for this spot."
        })
    }

    m.on('click', onClick)
    return () => {
      m.off('click', onClick)
      ctrl?.abort()
      popup?.remove()
    }
  }, [ready])

  // Recolour the map with the theme.
  useEffect(() => {
    const m = map.current
    if (m && ready) applyMapColors(m, dark)
  }, [dark, ready])

  // The canvas has to be told when its container changes size.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const t = window.setTimeout(() => m.resize(), 260)
    return () => window.clearTimeout(t)
  }, [expanded])

  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    LABEL_LAYERS.forEach((id) => m.setLayoutProperty(id, 'visibility', labels ? 'visible' : 'none'))
  }, [labels, ready])

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
        <button type="button" className="map-fab" aria-pressed={labels} onClick={() => setLabels((v) => !v)} title="Place names">
          <StackSimple size={18} weight={labels ? 'fill' : 'regular'} />
          <span className="sr-only">Show place labels</span>
        </button>
        <button type="button" className="map-fab" aria-pressed={radarOn} onClick={() => setRadarOn((v) => !v)} title="Rain radar">
          <CloudRain size={18} weight={radarOn ? 'fill' : 'regular'} />
          <span className="sr-only">Show rain radar</span>
        </button>
      </div>

      {radarOn ? (
        <div className="radar-bar" role="group" aria-label="Rain radar playback">
          {radar.status === 'loading' && <p className="radar-note">Loading radar</p>}
          {radar.status === 'error' && <p className="radar-note">Radar is unavailable right now.</p>}
          {radar.status === 'ready' && (
            <>
              <button
                type="button"
                className="radar-play"
                onClick={() => radar.setPlaying((p) => !p)}
                aria-label={radar.playing ? 'Pause radar' : 'Play the last two hours'}
              >
                {radar.playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
              </button>
              <div className="radar-track">
                <input
                  type="range"
                  min={0}
                  max={radar.frames.length - 1}
                  value={radar.index}
                  onChange={(e) => {
                    radar.setPlaying(false)
                    radar.setIndex(Number(e.target.value))
                  }}
                  aria-label="Radar time"
                  aria-valuetext={frameLabel(radar.frames, radar.index)}
                />
                <p className="radar-meta">
                  <span>{frameLabel(radar.frames, radar.index)}</span>
                  <span className="radar-legend" aria-hidden="true">
                    Light <i /> Heavy
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        c && cond && forecast && (
        <div className="map-callout">
          <p className="temp-md">
            {round(c.temperature)}°{units === 'metric' ? 'C' : 'F'}
          </p>
          <p>
            <strong>{weekday(forecast.current.time.slice(0, 10))}</strong>
            <small>{cond.label}</small>
          </p>
        </div>
        )
      )}
    </section>
  )
}
