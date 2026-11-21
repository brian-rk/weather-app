import type { StyleSpecification } from 'maplibre-gl'

/**
 * Two-tone map in the spirit of the reference design: saturated water,
 * pale land, whisper-thin borders, no roads. Built on OpenFreeMap's
 * OpenMapTiles vector data, which needs no API key.
 */
export const MAP_COLORS = {
  water: '#3f8fc9',
  waterShallow: '#5aa6d6',
  land: '#eef3f7',
  landShade: '#e3ebf1',
  border: '#c9d6e0',
  river: '#7fb8de',
  label: '#2b3a55',
  labelHalo: '#ffffff',
}

export const LABEL_LAYERS = ['label-country', 'label-city']

export const mapStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    omt: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
      attribution:
        '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    },
  },
  layers: [
    { id: 'land', type: 'background', paint: { 'background-color': MAP_COLORS.land } },
    {
      id: 'landcover',
      type: 'fill',
      source: 'omt',
      'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['wood', 'forest', 'grass']]],
      paint: { 'fill-color': MAP_COLORS.landShade, 'fill-opacity': 0.6 },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'omt',
      'source-layer': 'water',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['zoom'],
          3,
          MAP_COLORS.water,
          9,
          MAP_COLORS.waterShallow,
        ],
        'fill-antialias': true,
      },
    },
    {
      id: 'rivers',
      type: 'line',
      source: 'omt',
      'source-layer': 'waterway',
      minzoom: 5,
      filter: ['==', ['get', 'class'], 'river'],
      paint: {
        'line-color': MAP_COLORS.river,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 2],
        'line-opacity': 0.8,
      },
    },
    {
      id: 'borders',
      type: 'line',
      source: 'omt',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
      paint: {
        'line-color': MAP_COLORS.border,
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 8, 1.4],
        'line-dasharray': [3, 2],
      },
    },
    {
      id: 'label-country',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      filter: ['==', ['get', 'class'], 'country'],
      layout: {
        visibility: 'none',
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 14],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.12,
        'text-max-width': 8,
      },
      paint: {
        'text-color': MAP_COLORS.label,
        'text-opacity': 0.55,
        'text-halo-color': MAP_COLORS.labelHalo,
        'text-halo-width': 1.2,
      },
    },
    {
      id: 'label-city',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      minzoom: 4,
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
      layout: {
        visibility: 'none',
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 10, 14],
        'text-max-width': 8,
      },
      paint: {
        'text-color': MAP_COLORS.label,
        'text-halo-color': MAP_COLORS.labelHalo,
        'text-halo-width': 1.4,
      },
    },
  ],
}
