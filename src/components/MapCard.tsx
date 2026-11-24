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
  Thermometer,
  Wind,
  Tag,
  Mountains,
  Minus,
  Pause,
  Play,
  Plus,
  StackSimple,
} from '@phosphor-icons/react'
import { frameLabel, useRadar } from './useRadar'
import { tempGradient, useWeatherLayers } from './useWeatherLayers'
import { usePopover } from './usePopover'
import { WeatherArt } from './WeatherArt'
import { DEM_SOURCE, LABEL_LAYERS, RELIEF_LAYER, applyMapColors, mapStyle } from '../lib/mapStyle'
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
import { t } from '../lib/i18n'

maplibregl.setWorkerUrl(workerUrl)

const ZOOM = 5
/** Opening view: the whole globe, before flying in to the city. */
const INTRO_ZOOM = 1.6
const TERRAIN_PITCH = 62
const TERRAIN_BEARING = -20

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

function tempMarker(s: Snapshot, i: number, unit: string) {
  const el = document.createElement('div')
  el.className = 'map-temp-wrap'
  el.innerHTML = renderToStaticMarkup(
    <span className="map-temp" style={{ animationDelay: `${150 + i * 90}ms` }}>
      <WeatherArt sky={describe(s.code).sky} isDay={s.isDay} className="map-temp-art" still />
      <span>{round(s.temperature)}°{unit}</span>
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
  const [windOn, setWindOn] = useState(false)
  const [tempOn, setTempOn] = useState(false)
  const [terrainOn, setTerrainOn] = useState(false)
  const terrainRef = useRef(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const layersBtn = useRef<HTMLButtonElement>(null)
  const layersMenu = usePopover<HTMLDivElement>(layersOpen, () => setLayersOpen(false), layersBtn)
  // isStyleLoaded() also turns false while tiles stream in, so track the
  // first 'load' ourselves and gate style edits on it.
  const [ready, setReady] = useState(false)
  const radar = useRadar(map, ready && radarOn)
  const wx = useWeatherLayers(map, ready, { wind: windOn, temp: tempOn }, units, dark)
  const toF = (c: number) => (units === 'imperial' ? (c * 9) / 5 + 32 : c)

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
      // Start from space unless motion is reduced; the place effect flies in.
      zoom: reducedMotion() ? ZOOM : INTRO_ZOOM,
      scrollZoom: false,
      dragRotate: false,
      maxPitch: 75,
      attributionControl: { compact: true },
    })
    m.touchZoomRotate.disableRotation()
    // The temperature ring is sized for city zoom; hide it when the whole globe is in view.
    const updateFar = () => el.current?.classList.toggle('is-far', m.getZoom() < 3.4)
    m.on('zoom', updateFar)
    updateFar()
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
    const center: [number, number] = [place.longitude, place.latitude]
    const rest = terrainRef.current
      ? { pitch: TERRAIN_PITCH, bearing: TERRAIN_BEARING }
      : { pitch: 0, bearing: 0 }
    if (reducedMotion()) {
      m.jumpTo({ center, zoom: ZOOM, ...rest })
    } else {
      // Tilt and turn during the flight, then settle once there.
      m.flyTo({ center, zoom: ZOOM, pitch: 52, bearing: -24, curve: 1.6, speed: 0.9, essential: true })
      m.once('moveend', () => {
        if (map.current === m) m.easeTo({ ...rest, duration: 1400, essential: true })
      })
    }

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
            new maplibregl.Marker({ element: tempMarker(s, i, units === 'metric' ? 'C' : 'F'), anchor: 'bottom' })
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
      loading.textContent = t('Checking the weather here')
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
          region.textContent = spot.region || t('Selected spot')
          const now = document.createElement('p')
          now.className = 'pick-now'
          now.textContent = `${round(snap.temperature)}° · ${cond.label}`
          const range = document.createElement('small')
          range.textContent = t('Today {high}° / {low}°', { high: round(snap.max), low: round(snap.min) })
          const go = document.createElement('button')
          go.type = 'button'
          go.className = 'pick-go'
          go.textContent = t('Show forecast')
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
          loading.textContent = t("Couldn't load the weather for this spot.")
        })
    }

    m.on('click', onClick)
    return () => {
      m.off('click', onClick)
      ctrl?.abort()
      popup?.remove()
    }
  }, [ready])

  // 3D terrain: raise the land, shade the relief and tilt the camera.
  useEffect(() => {
    const m = map.current
    terrainRef.current = terrainOn
    if (!m || !ready) return
    const quick = reducedMotion()
    if (terrainOn) {
      m.setLayoutProperty(RELIEF_LAYER, 'visibility', 'visible')
      m.setTerrain({ source: DEM_SOURCE, exaggeration: 1.5 })
      m.dragRotate.enable()
      m.touchZoomRotate.enableRotation()
      m.easeTo({ pitch: TERRAIN_PITCH, bearing: TERRAIN_BEARING, duration: quick ? 0 : 1600, essential: true })
    } else {
      m.setTerrain(null)
      m.setLayoutProperty(RELIEF_LAYER, 'visibility', 'none')
      m.dragRotate.disable()
      m.touchZoomRotate.disableRotation()
      m.easeTo({ pitch: 0, bearing: 0, duration: quick ? 0 : 1200, essential: true })
    }
  }, [terrainOn, ready])

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
    <section className={`card map ${expanded ? 'map--expanded' : ''}`} aria-label={t('Map around {place}', { place: place.name })}>
      <div ref={el} className="map-canvas" />
      <div className="map-wash" aria-hidden="true" />

      {failed && <p className="map-failed">{t("The map couldn't load. Weather data is unaffected.")}</p>}

      <button type="button" className="map-fab map-expand" onClick={onToggleExpanded}>
        {expanded ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}
        <span className="sr-only">{expanded ? t('Collapse map') : t('Expand map')}</span>
      </button>

      <div className="map-tools">
        <div className="zoom-pill">
          <button type="button" onClick={() => map.current?.zoomIn()}>
            <Plus size={16} weight="bold" />
            <span className="sr-only">{t('Zoom in')}</span>
          </button>
          <button type="button" onClick={() => map.current?.zoomOut()}>
            <Minus size={16} weight="bold" />
            <span className="sr-only">{t('Zoom out')}</span>
          </button>
        </div>
        <button
          type="button"
          className="map-fab"
          onClick={() =>
            map.current?.flyTo({
              center: [place.longitude, place.latitude],
              zoom: ZOOM,
              pitch: terrainOn ? TERRAIN_PITCH : 0,
              bearing: terrainOn ? TERRAIN_BEARING : 0,
              duration: reducedMotion() ? 0 : 900,
            })
          }
        >
          <Crosshair size={18} />
          <span className="sr-only">{t('Recenter on {place}', { place: place.name })}</span>
        </button>
        <button
          ref={layersBtn}
          type="button"
          className="map-fab"
          aria-expanded={layersOpen}
          aria-haspopup="dialog"
          data-on={labels || radarOn || windOn || tempOn || terrainOn || undefined}
          onClick={() => setLayersOpen((v) => !v)}
          title={t('Map layers')}
        >
          <StackSimple size={18} weight={layersOpen ? 'fill' : 'regular'} />
          <span className="sr-only">{t('Map layers')}</span>
        </button>
      </div>

      {layersOpen && (
        <div ref={layersMenu} className="layers-menu" role="dialog" aria-label={t('Map layers')}>
          {[
            { on: windOn, set: setWindOn, icon: Wind, label: t('Wind streams') },
            { on: tempOn, set: setTempOn, icon: Thermometer, label: t('Temperature') },
            { on: terrainOn, set: setTerrainOn, icon: Mountains, label: t('3D terrain') },
            { on: radarOn, set: setRadarOn, icon: CloudRain, label: t('Rain radar') },
            { on: labels, set: setLabels, icon: Tag, label: t('Place names') },
          ].map(({ on, set, icon: Icon, label }) => (
            <label key={label} className="layer-row">
              <Icon size={18} weight={on ? 'fill' : 'regular'} aria-hidden="true" />
              <span>{label}</span>
              <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} />
              <span className="toggle-track" aria-hidden="true" />
            </label>
          ))}
        </div>
      )}

      {(tempOn || windOn || terrainOn) && (
        <div className="wx-legend" role="status">
          {terrainOn && <span className="wx-hint">{t('Drag with the right mouse button to tilt and turn.')}</span>}
          {(tempOn || windOn) && wx.loading && !wx.tempRange && <span>{t('Loading live readings')}</span>}
          {wx.error && <span>{t("Couldn't load readings for this area.")}</span>}
          {tempOn && wx.tempRange && (
            <span className="wx-temp-legend">
              <b>{Math.round(toF(wx.tempRange[0]))}°</b>
              <i style={{ background: tempGradient(wx.tempRange[0], wx.tempRange[1]) }} />
              <b>{Math.round(toF(wx.tempRange[1]))}°</b>
            </span>
          )}
          {windOn && wx.windMax != null && (
            <span>
              <Wind size={14} aria-hidden="true" /> {t('up to')} {Math.round(units === 'imperial' ? wx.windMax / 1.609 : wx.windMax)}{' '}
              {units === 'imperial' ? 'mph' : 'km/h'}
            </span>
          )}
        </div>
      )}

      {radarOn ? (
        <div className="radar-bar" role="group" aria-label={t('Rain radar playback')}>
          {radar.status === 'loading' && <p className="radar-note">{t('Loading radar')}</p>}
          {radar.status === 'error' && <p className="radar-note">{t('Radar is unavailable right now.')}</p>}
          {radar.status === 'ready' && (
            <>
              <button
                type="button"
                className="radar-play"
                onClick={() => radar.setPlaying((p) => !p)}
                aria-label={radar.playing ? t('Pause radar') : t('Play the last two hours')}
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
                  aria-label={t('Radar time')}
                  aria-valuetext={frameLabel(radar.frames, radar.index)}
                />
                <p className="radar-meta">
                  <span>{frameLabel(radar.frames, radar.index)}</span>
                  <span className="radar-legend" aria-hidden="true">
                    {t('Light')} <i /> {t('Heavy')}
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
