# Weatherman Chan

A weather-science learning app for secondary students (US and Canada first). It uses live data from [Open-Meteo](https://open-meteo.com/) and animations to teach weather, from the water cycle to ENSO to how weather shapes food, culture, and business.

Static site: no build step, no server, no accounts, no tracking.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

ES modules need an HTTP server; opening `index.html` directly from disk will not work.

## Publish on GitHub Pages

`.github/workflows/pages.yml` runs the tests and publishes the site on every push to the default branch. One-time setup in the repo's **Settings → Pages**: set **Source** to **GitHub Actions**. Pages on a private repository needs a paid GitHub plan; on a free plan the repository must be public. The published site is public either way.

## Tests

```sh
npm test   # Node 20+; no dependencies to install
```

## Rate limits (read before a school-wide rollout)
Everyone in a school usually shares one IP address, and Open-Meteo's free tier limits requests per IP (check their current terms). The app caches responses in the browser, falls back to saved data when the service says "too many requests", and keeps map grids small. For heavy use, set `API` in `js/config.js` to a caching proxy or a paid Open-Meteo endpoint.

## Layout

| Path | Purpose |
|---|---|
| `index.html`, `css/style.css` | Page and styles (light/dark, reduced-motion aware) |
| `js/data.js` | Open-Meteo geocoding, forecast, and map grid; localStorage cache with stale fallback and rate-limit handling; demo data; weather-code descriptions |
| `test/` | Unit tests (`npm test`) |
| `js/units.js` | Metric/imperial formatting, compass directions, dew point formula |
| `js/charts.js` | Linked forecast charts (temperature + dew point, pressure, precipitation) with tooltip, keyboard control, summary, and table view |
| `js/scene.js` | Canvas animation: clouds, rain, snow, fog, lightning, wind arrow |
| `js/timeline.js` | Reusable play/pause/step/speed scrubber |
| `js/waterCycle.js` | SVG concept animation with stage-by-stage captions |
| `js/map.js` | Leaflet map: click-to-select, temperature (with legend) and wind grid layers |
| `js/config.js` | Tile provider, API endpoints, cache times, map grid budget |
| `js/vendor/leaflet/` | Leaflet 1.9.4 (BSD-2-Clause), served from this repo |
| `js/main.js` | Wires the pieces together |
| `assets/fonts/` | Source Serif 4 and Source Sans 3 (SIL OFL), self-hosted |
| `assets/images/` | Artwork (generated from `docs/IMAGE_PROMPTS.md`) |
| `docs/IMAGE_PROMPTS.md` | Prompts for Nano Banana 2 / ChatGPT artwork |
| `lessons/index.json` | Lesson catalog (content to be authored) |
| `docs/STYLE_GUIDE.md` | Tone and scaffolding rules for all content |

## Roadmap
- Author the first lessons (weather vs. climate, reading the sky, predict and verify, El Niño/La Niña, weather and food).
- Historical data tools (climate normals, ONI index).
- Radar loops on the map (US NWS/NOAA, Environment Canada; may need a small proxy for CORS).
- Replace placeholder visuals with generated artwork.
- Optional official alerts as a case study (NWS and Environment Canada CAP feeds).

## Data notes
Open-Meteo's free tier is for non-commercial use and requires attribution (included in the footer). Forecasts are model estimates; the app is not a source of official warnings.
