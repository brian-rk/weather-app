# Nimbus Weather

A live weather dashboard built with React, TypeScript and Vite. It shows current conditions, a styled map with nearby temperatures, air quality, how the day unfolds, and tomorrow's forecast for any city in the world.

All data is live, and the app needs **no API keys or accounts**.

## Features

- **Current conditions:** temperature, "feels like", visibility and humidity. The card's background changes for day, night and grey weather.
- **City search:** finds any city as you type. Use the arrow keys and Enter to pick a result, or press `/` to jump to the search box.
- **Live map:** a custom two-tone map (blue water, pale land) with a pin on the selected city and live temperature badges around it. You can zoom, recenter, show place names, and expand the map to full width.
- **Quick-compare cities:** see other cities' highs and lows at a glance. Click one to switch to it; the city you leave moves into the list.
- **Air quality:** the current US Air Quality Index with a plain-language label and a meter.
- **Today at a glance:** morning, afternoon, evening and night, for temperature, wind or chance of rain. Each icon's height shows the value, so the row reads like a small chart.
- **Tomorrow:** the next day's high, low, conditions and chance of rain. The card turns green with falling rain when rain is forecast.
- **Celsius or Fahrenheit:** switching units also switches wind speed between km/h and mph.
- **Use my location:** shows the forecast for where you are (needs browser permission).
- **Remembers you:** your city, saved cities and units are kept in the browser between visits.
- **Loading and error states:** placeholders while data loads, plus clear messages when something fails.
- **Works on any screen:** the sidebar becomes a bottom bar on phones, and the layout collapses to one column.
- **Accessible:** keyboard support throughout, labelled controls, a search box screen readers understand, and reduced motion when the system asks for it.

## Tech stack

| Area | Tools |
|---|---|
| Framework | [React 19](https://react.dev) with the React Compiler |
| Language | TypeScript |
| Build | [Vite](https://vite.dev) |
| Map | [MapLibre GL JS](https://maplibre.org) with [OpenFreeMap](https://openfreemap.org) map data |
| Icons | [Phosphor Icons](https://phosphoricons.com) |
| Font | [Geist](https://vercel.com/font) from Google Fonts |
| Styling | Plain CSS with custom properties and OKLCH colours |
| Linting | [Oxlint](https://oxc.rs) |

## Data sources

All of these are free and need no API key.

| Data | Source |
|---|---|
| Forecast and current weather | [Open-Meteo Forecast API](https://open-meteo.com/en/docs) |
| City search | [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) |
| Air quality | [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) |
| Map | [OpenFreeMap](https://openfreemap.org) (map data from OpenStreetMap, in the OpenMapTiles format) |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 20.19+ or 22.12+
- npm (comes with Node.js)

### Install and run

```bash
git clone https://github.com/brian-rk/weather-app.git
cd weather-app
npm install
npm run dev
```

Then open the address Vite prints, usually <http://localhost:5173>.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint |

## Project structure

```text
weather/
├── index.html              # Page shell, fonts and meta tags
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx            # React entry point
    ├── App.tsx             # Layout, state, data loading and saved settings
    ├── index.css           # Design tokens, layout, components and breakpoints
    ├── components/
    │   ├── Sidebar.tsx     # Left rail (bottom bar on mobile)
    │   ├── Search.tsx      # City search with keyboard support
    │   ├── Cards.tsx       # Now, city list, air quality, tomorrow and error cards
    │   ├── DayParts.tsx    # Morning to night breakdown with metric switch
    │   ├── MapCard.tsx     # MapLibre map, markers and map controls
    │   ├── WeatherArt.tsx  # Hand-built SVG weather illustrations
    │   └── SkyIcon.tsx     # Small icons for each type of weather
    └── lib/
        ├── weather.ts      # API calls, types, weather codes and formatting
        └── mapStyle.ts     # Custom map style (colours, layers, labels)
```

## How it works

- **Weather codes:** Open-Meteo reports conditions as WMO weather codes. [`src/lib/weather.ts`](src/lib/weather.ts) turns each code into a readable label ("Light rain") and a sky type that picks the illustration and icon.
- **Fewer requests:** the comparison cities and the six map temperatures each load in a single request, by sending several coordinates to Open-Meteo at once.
- **Map style:** [`src/lib/mapStyle.ts`](src/lib/mapStyle.ts) defines a minimal map style: water, land, rivers and country borders only, with labels hidden until you turn them on. Adjust the colours in `MAP_COLORS`.
- **Faster first load:** the map library is large, so it loads separately and the rest of the dashboard appears first.
- **Saved settings:** the selected city, saved cities and units are stored in `localStorage` under keys starting with `nimbus.`.

## Deployment

`npm run build` produces a static site in `dist/` that you can host on Netlify, Vercel, GitHub Pages or any static host. There are no environment variables or secrets to set up.

For **GitHub Pages**, the site is served from `/weather-app/`, so set the base path in `vite.config.ts` first:

```ts
export default defineConfig({
  base: '/weather-app/',
  // ...existing config
})
```

## Design

The layout is based on a weather dashboard design shot from Dribbble, adapted into a working full-screen web app. The illustrations are drawn in code as SVG, so they can show any condition. No artwork or branding from the original shot is used.

## Credits

- Weather, geocoding and air quality data by [Open-Meteo](https://open-meteo.com) (CC BY 4.0)
- Map by [OpenFreeMap](https://openfreemap.org), © [OpenMapTiles](https://www.openmaptiles.org), data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- Icons by [Phosphor Icons](https://phosphoricons.com)
