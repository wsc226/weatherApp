# Weatherman Chan

A weather-science learning app for secondary students (US and Canada first). It uses live data from [Open-Meteo](https://open-meteo.com/) and animations to teach weather, from the water cycle to ENSO to how weather shapes food, culture, and business.

Static site: no build step, no server, no accounts, no tracking.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

ES modules need an HTTP server; opening `index.html` directly from disk will not work.

## Layout

| Path | Purpose |
|---|---|
| `index.html`, `css/style.css` | Page and styles (light/dark, reduced-motion aware) |
| `js/data.js` | Open-Meteo geocoding and forecast, 10-minute session cache, offline demo data, weather-code descriptions |
| `js/units.js` | Metric/imperial formatting and compass directions |
| `js/scene.js` | Canvas animation: clouds, rain, snow, fog, lightning, wind arrow |
| `js/timeline.js` | Reusable play/pause/step/speed scrubber |
| `js/waterCycle.js` | SVG concept animation with stage-by-stage captions |
| `js/main.js` | Wires the pieces together |
| `lessons/index.json` | Lesson catalog (content to be authored) |
| `docs/STYLE_GUIDE.md` | Tone and scaffolding rules for all content |

## Roadmap
- Author the first lessons (weather vs. climate, reading the sky, predict and verify, El Niño/La Niña, weather and food).
- Historical data tools (climate normals, ONI index).
- Map component and radar loops (US NWS/NOAA, Environment Canada; may need a small proxy for CORS).
- Optional official alerts as a case study (NWS and Environment Canada CAP feeds).

## Data notes
Open-Meteo's free tier is for non-commercial use and requires attribution (included in the footer). Forecasts are model estimates; the app is not a source of official warnings.
