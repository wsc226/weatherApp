# Weatherman Chan: project notes for Claude

Weather-science learning app for **secondary students (US, Canada; English)**. Owner is a certified secondary science teacher, so content decisions are theirs; draft, don't decide, on science and pedagogy.

## Rules
- **Static site, no build step, no server.** ES modules in `js/`, Leaflet vendored in `js/vendor/leaflet`. Serve with `python3 -m http.server`.
- **Privacy first.** No accounts, analytics, ads, third-party trackers, or Google APIs. Prefs go in `localStorage` (wrapped in try/catch). Load libraries from the repo, not a CDN.
- **Accessibility.** Respect `prefers-reduced-motion`, give every animation pause/step controls and a text alternative, never use color alone for meaning.
- **Tone and content:** follow `docs/STYLE_GUIDE.md` (friendly yet professional, scaffold concepts, careful jargon).
- **Honesty about data.** Forecasts are model estimates. Show units, source, and update time. Never present the app as an official warning source.
- Set text with `textContent` (or build DOM nodes), not `innerHTML` with API data.

## Visual design
- Fonts: Source Serif 4 (headings) + Source Sans 3 (body, UI, data), self-hosted in `assets/fonts/` (SIL OFL). Never link fonts.googleapis.com.
- Colors live as tokens on `:root` in `css/style.css` (light + dark). Use tokens, not raw hex. Every text/background pair must reach 4.5:1.

## Artwork
The owner has Gemini (Nano Banana 2) and ChatGPT and will generate images. **Do not add cartoonish SVG art.** Write prompts in `docs/IMAGE_PROMPTS.md`, save images to `assets/images/` (WebP, under ~200 KB, no text baked in), and use the current SVG/canvas visuals only as placeholders.

## Tests
- `npm test` (Node's built-in runner, no dependencies) covers the pure logic in `units.js`, `data.js`, `map.js`, and `charts.js`. Run it before every commit; also try `TZ=Pacific/Auckland npm test` when touching time code.
- Keep browser-only code (DOM, canvas, Leaflet) out of module top level so modules stay importable in Node.

## Rate limits
Schools share one IP, and Open-Meteo's free tier limits requests per IP. Don't add requests on timers or on every interaction; go through `getJSON` (localStorage cache, stale fallback, 429 message) and keep map grids within `GRID_MAX_POINTS`. Endpoints and cache times live in `js/config.js` so a caching proxy can be swapped in.

## Environment notes
- The cloud sandbox proxy blocks Open-Meteo and map tiles, so live data cannot be tested there. The app falls back to demo data (`demoForecast`, `demoGrid`); test UI with that.
- Headless check: `chrome --headless=new --no-sandbox --virtual-time-budget=6000 --screenshot=out.png http://localhost:8123/`.
- Work on a `claude/...` branch; don't commit to `master` and don't open PRs unless asked.

## Layout
See `README.md`. Config for map tiles is in `js/config.js`.
