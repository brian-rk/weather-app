# Nimbus Weather

A live weather dashboard for any city in the world, built with React, TypeScript and Vite. It combines current conditions, a styled interactive map, hourly and 16-day forecasts, alerts, a daily briefing and an activity planner, in six languages, with light and dark themes.

All data is live, and the app needs **no API keys, accounts or server**.

## Contents

- [Features](#features)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Tech stack](#tech-stack)
- [Data sources](#data-sources)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Adding a language](#adding-a-language)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)
- [Design](#design)
- [Credits](#credits)

## Features

### Dashboard

- **Current weather:** temperature on 3D rolling drums, like a mechanical counter, "feels like", visibility and humidity. The card's sky blends between day, grey and night colours, and the illustration has layered depth: the sun, clouds and rain shift by different amounts as you move your pointer.
- **Humidity and air quality:** humidity, the US Air Quality Index with a plain-language label, PM2.5, PM10, ozone, nitrogen dioxide, and pollen where it's available (Europe).
- **How is the temperature today?** Morning, afternoon, evening and night, for temperature, wind or chance of rain. Each icon's height shows the value, so the row reads like a small chart.
- **Tomorrow:** the next day's high, low, conditions and chance of rain, with an illustrated traveller on a bench dressed for the weather: an umbrella for rain, sunglasses for sun, a beanie and scarf for cold.
- **Next 24 hours:** a temperature line with chance-of-rain bars. Hover, or focus it and use the arrow keys, to read any hour.
- **7-day forecast:** each day's high, low, conditions and rain chance, with a bar showing where that day sits within the week. Click a day to see it across the dashboard. Switch to the **3D view** to see the week as 3D columns you can tilt by dragging or with the arrow keys.
- **Today's conditions:** sunrise and sunset, with the sun travelling a 3D orbit over the horizon, day length compared with yesterday; UV index with protection hours; wind speed, direction and gusts on a compass; pressure trend for the next 3 hours.
- **Quick-compare cities:** your first two saved cities with their highs and lows.

### Map

- A custom two-tone map (blue water, pale land) with a pin on the selected city and live temperatures around it.
- **3D globe:** the map opens in space and flies in to your city. Zoom out at any time to see the whole planet with its atmosphere.
- **Cinematic city changes:** the camera tilts and turns as it flies to a new city, then settles.
- **Layers menu:**
  - **Wind streams:** particles drift with the live wind.
  - **Temperature:** a colour wash with a legend.
  - **Rain radar:** the last two hours, with play and a time slider.
  - **3D terrain:** mountains rise in relief with shading. The view tilts, and you can right-drag to tilt and turn.
  - **Place names.**

  Readings refresh for whatever area you pan to.
- **Click anywhere** to preview that spot's weather and place name, then open its full forecast.
- Zoom, recenter, and expand the map to full width.

### Panels and tools

- **Forecast calendar:** 16 days laid out as a calendar. Pick a day and the whole dashboard shows it, with a "Back to today" banner.
- **Daily briefing:** a chat-style summary in plain language: rain timing, highs and lows, gusts, UV, air quality, the best activity window and any alerts.
- **Weather alerts:** the bell flags thunderstorms, heavy rain, snow, strong gusts, heat, frost, very high UV and unhealthy air for the next two days.
  - Unread count.
  - Optional browser notifications.
- **Plan your day:** best time windows for a run, cycling, walking the dog, drying laundry, a barbecue or picnic, and stargazing. Scored from rain, wind, UV, temperature and cloud.
- **Compare cities:** up to three cities side by side.
  - A 7-day chart of high, low, rain chance or wind.
  - Hover details and a table view.
- **Saved cities:** save a city with the star on its weather card. In the Saved panel you can open, reorder (drag or arrow buttons) or remove saved cities, up to 12.
- **Share:**
  - Turn the forecast into a picture (sky, light or dark style; post or story size), then download, share or copy it.
  - Or copy a link. The address bar always holds the current city, so bookmarks and shared links reopen the same forecast.
- **Command palette:** Ctrl+K (⌘K on Mac) to jump to any city, panel or setting, or to switch units, theme or language.

### Personalisation

- **Profile:** your name in the greeting, with a photo or initials avatar, stored only in your browser.
- **Units:**
  - Temperature: °C or °F.
  - Wind: km/h, mph or m/s.
  - Pressure: hPa or inHg.
  - Time: 12- or 24-hour.
- **Start-up:** open with the last city viewed or a home city, and refresh automatically every 5, 15 or 30 minutes (or never). "Updated 5 min ago" shows how fresh the data is.
- **Themes:** follow your device, light, dark, or "day and night" (dark after sunset in the selected city). The map recolours with the theme.
- **Languages:** English, Español, Français, Deutsch, Português and Kiswahili. This covers dates, weather descriptions, alerts, the briefing and city search results.
- **Sidebar:** a slim icon rail, or a wider sidebar with labels.
- **Use my location:** forecast for where you are (needs browser permission).

### Motion and accessibility

- **Weather animations:** rain and drizzle fall, storms flash, snow drifts, sun rays turn, clouds and fog drift, and gusts sweep across the card when it's windy. When it's raining, droplets bead on the weather card like rain on a window, and some run down the glass.
- **Transitions:**
  - Cards rise in on load and cross-fade through a soft blur when you change city.
  - Picking another day flips the cards over to it in a staggered wave.
  - The tomorrow scene has layered depth: bench, suitcase and traveller move at different depths with your pointer.
  - The map morphs when expanded, flies in from space on first load, and tilts during city changes.
  - A theme change spreads out in a circle from where you clicked.
  - Panels swing open from their edge like a door, and swing shut when closed. The bell swings for new alerts.
- **Reduced motion:** all animation switches off when the system asks for it. The wind layer then shows static direction arrows.
- **Accessibility:**
  - Keyboard support throughout, including charts.
  - Labelled controls and screen-reader text for icons.
  - Table views for charts.
  - Chart colours checked for colour-blind readers in both themes.
- **Responsive:** on phones the sidebar becomes a bottom bar, panels become bottom sheets, and the layout collapses to one column.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `Ctrl` + `K` / `⌘` + `K` | Open or close the command palette |
| `/` | Jump to the city search |
| `↑` `↓` then `Enter` | Move through and pick search or palette results |
| `←` `→` | Read the hourly and comparison charts hour by hour or day by day |
| `Esc` | Close a panel, menu or the palette |

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
| Forecast, current weather, map readings and city comparison | [Open-Meteo Forecast API](https://open-meteo.com/en/docs) |
| City search | [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) |
| Air quality and pollen | [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) |
| Map tiles | [OpenFreeMap](https://openfreemap.org) (OpenStreetMap data in the OpenMapTiles format) |
| Rain radar | [RainViewer](https://www.rainviewer.com/api.html) (past two hours, tiles up to zoom 7) |
| Elevation for 3D terrain | [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) on AWS Open Data (Terrarium encoding) |
| Place names for map clicks and "Use my location" | [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api) free client-side reverse geocoding |

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
├── index.html                # Page shell, fonts, meta tags, theme set before first paint
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx              # React entry point
    ├── App.tsx               # Layout, state, data loading, panels and transitions
    ├── index.css             # Design tokens, base layout, cards, dark theme, motion
    ├── features.css          # Sidebar, header, panels, calendar, alerts, planner, settings
    ├── tools.css             # Map layers, share card, compare chart, command palette
    ├── components/
    │   ├── Header.tsx        # Avatar greeting, search and top-bar buttons
    │   ├── Sidebar.tsx       # Navigation rail (bottom bar on phones)
    │   ├── Search.tsx        # City search with keyboard support and "use my location"
    │   ├── Cards.tsx         # Weather, city list, humidity, tomorrow and error cards
    │   ├── DayParts.tsx      # Morning to night breakdown
    │   ├── HourlyChart.tsx   # Next 24 hours chart
    │   ├── WeekCard.tsx      # 7-day forecast with range bars
    │   ├── Conditions.tsx    # Sun, UV index, wind and pressure
    │   ├── MapCard.tsx       # Map, markers, layers menu and spot preview
    │   ├── useWeatherLayers.ts # Wind-stream and temperature canvases over the map
    │   ├── useRadar.ts       # Rain radar layers and playback
    │   ├── Sheet.tsx         # Shared side/bottom panel used by every panel below
    │   ├── BriefingPanel.tsx, CalendarPanel.tsx, AlertsPanel.tsx, PlannerPanel.tsx
    │   ├── ComparePanel.tsx, SavedPanel.tsx, SharePanel.tsx, SettingsPanel.tsx
    │   ├── CommandPalette.tsx # Ctrl+K launcher
    │   ├── usePopover.ts     # Escape, outside-click and focus handling for panels
    │   ├── WeatherArt.tsx    # SVG weather illustrations
    │   ├── SkyFx.tsx         # Card-wide rain, snow, lightning and wind effects
    │   ├── TomorrowScene.tsx # The traveller on the bench
    │   ├── Odometer.tsx      # Rolling-digit temperature
    │   ├── Avatar.tsx        # Photo or initials avatar
    │   └── SkyIcon.tsx       # Small icons for each type of weather
    └── lib/
        ├── weather.ts        # API calls, types, weather codes, formatting, share links
        ├── insights.ts       # Alerts, daily briefing and activity planner
        ├── prefs.ts          # Settings, unit conversion and formatting
        ├── i18n.ts           # Language switching, translation and date formats
        ├── translations.ts   # Strings in Spanish, French, German, Portuguese and Swahili
        ├── theme.ts          # Theme resolution
        ├── mapStyle.ts       # Custom map style and its light/dark colours
        ├── shareCard.tsx     # Draws the shareable picture on a canvas
        ├── outfit.ts         # Picks the traveller's outfit from the forecast
        └── useCountUp.ts     # Animated number helper
```

## How it works

- **Weather codes:** Open-Meteo reports conditions as WMO weather codes. `describe()` in [`src/lib/weather.ts`](src/lib/weather.ts) turns each code into a translated label ("Light rain") and a sky type that picks the illustration and icon.
- **Viewing another day:** `forecastForDay()` re-centres the forecast on any of the 16 days, so every card can render a future day without special cases.
- **Alerts, briefing and planner:** [`src/lib/insights.ts`](src/lib/insights.ts) works these out from the forecast with simple thresholds (for example, gusts of 60 km/h or more, 20 mm of rain in a day). Activities are scored hour by hour from comfort ranges for temperature, rain, wind, UV and cloud.
- **Map weather layers:** a coarse grid of live readings (9 × 7 points) is fetched for the visible area in one request. Temperatures are interpolated into a blurred colour wash. Wind is turned into a vector field that thousands of particles follow on a canvas.
- **Fewer requests:** the map grid, the temperatures around the pin, the saved cities and the comparison each load in a single request, by sending several coordinates to Open-Meteo at once.
- **Share card:** drawn on a canvas, including the SVG illustrations, then exported as a PNG.
- **Translations:** English text is the key, so anything untranslated falls back to readable English. Changing language re-renders the app with new strings and locale-aware dates.
- **Transitions:** city, day and map changes use the browser's View Transitions API where available. Other browsers simply switch without the animation.
- **Globe and terrain:** the map style uses MapLibre's globe projection with an atmosphere that fades out as you zoom in. 3D terrain and relief shading read from two copies of the same elevation tiles, which renders better than sharing one source.
- **Faster first load:** the map library is large, so it loads separately and the rest of the dashboard appears first.
- **Stored in your browser:** everything lives in `localStorage` under keys starting with `nimbus.`:
  - `place` and `saved` for your cities.
  - `prefs` for settings, profile and language.
  - `theme` and `sidebar` for appearance.
  - `seenAlerts` and `notifiedAlerts` for alerts.

  Nothing is sent to a server of ours.

## Adding a language

1. Add the language to `LANGUAGES` in [`src/lib/i18n.ts`](src/lib/i18n.ts) (id, display name and locale such as `it-IT`).
2. Add it to the `Lang` type and to `LANG_COLUMNS` in [`src/lib/translations.ts`](src/lib/translations.ts), then add a column to every row. Keep `{placeholders}` exactly as they are.
3. Any string you haven't translated yet shows in English, so you can add translations gradually.

## Deployment

`npm run build` produces a static site in `dist/` that you can host on Netlify, Vercel, GitHub Pages or any static host. There are no environment variables or secrets to set up.

For **GitHub Pages**, the site is served from `/weather-app/`, so set the base path in `vite.config.ts` first:

```ts
export default defineConfig({
  base: '/weather-app/',
  // ...existing config
})
```

## Known limitations

- **Rain radar coverage** depends on the country. Some regions have no radar data.
- **Pollen** is only modelled for Europe.
- **Alerts and the planner** are rules of thumb based on the forecast, not official warnings. Always follow your national weather service.
- **Translations** were written for this project. The Swahili in particular would benefit from a native speaker's review.
- **Browser notifications** only appear while the app is open in a tab. There is no background push service.

## Design

The layout is based on a weather dashboard concept from Dribbble, adapted into a full-screen web app. All illustrations, including the weather art and the tomorrow scene, are original SVG drawn in code. No artwork or branding from the original concept is used.

## Credits

- Weather, geocoding and air quality data by [Open-Meteo](https://open-meteo.com) (CC BY 4.0)
- Map by [OpenFreeMap](https://openfreemap.org), © [OpenMapTiles](https://www.openmaptiles.org), data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- Rain radar by [RainViewer](https://www.rainviewer.com)
- Elevation data from [Mapzen Terrain Tiles](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)
- Reverse geocoding by [BigDataCloud](https://www.bigdatacloud.com)
- Icons by [Phosphor Icons](https://phosphoricons.com)
- Font: [Geist](https://vercel.com/font)
