# Weatherman Chan: project notes for Claude

Weather-science learning app for **secondary students (US, Canada; English)**. Owner is a certified secondary science teacher, so content decisions are theirs; draft, don't decide, on science and pedagogy.

## Rules
- **Static site, no build step, no server.** ES modules in `js/`, Leaflet vendored in `js/vendor/leaflet`. Serve with `python3 -m http.server`.
- **Privacy first.** No accounts, analytics, ads, third-party trackers, or Google APIs. Prefs go in `localStorage` (wrapped in try/catch). Load libraries from the repo, not a CDN.
- **Accessibility.** Respect `prefers-reduced-motion`, give every animation pause/step controls and a text alternative, never use color alone for meaning.
- **Tone and content:** follow `docs/STYLE_GUIDE.md` (friendly yet professional, scaffold concepts, careful jargon).
- **Honesty about data.** Forecasts are model estimates. Show units, source, and update time. Never present the app as an official warning source.
- Set text with `textContent` (or build DOM nodes), not `innerHTML` with API data.

## Artwork
The owner has Gemini (Nano Banana 2) and ChatGPT and will generate images. **Do not add cartoonish SVG art.** Write prompts in `docs/IMAGE_PROMPTS.md`, save images to `assets/images/` (WebP, under ~200 KB, no text baked in), and use the current SVG/canvas visuals only as placeholders.

## Environment notes
- The cloud sandbox proxy blocks Open-Meteo and map tiles, so live data cannot be tested there. The app falls back to demo data (`demoForecast`, `demoGrid`); test UI with that.
- Headless check: `chrome --headless=new --no-sandbox --virtual-time-budget=6000 --screenshot=out.png http://localhost:8123/`.
- Work on a `claude/...` branch; don't commit to `master` and don't open PRs unless asked.

## Layout
See `README.md`. Config for map tiles is in `js/config.js`.
