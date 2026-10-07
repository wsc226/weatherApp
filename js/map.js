// Leaflet map: click to choose a place, plus a temperature or wind layer on a snapped grid.
// Leaflet is vendored (js/vendor/leaflet) and exposes the global `L`.
import { TILES, START_VIEW } from './config.js';
import { gridPoints, getGrid, demoGrid } from './data.js';
import { fmt } from './units.js';

// Diverging cold-to-hot scale (°C). Blue-to-red stays distinguishable for the common forms of
// color blindness, and every marker also prints its value, so color is never the only cue.
export const STOPS = [[-20, '#2b5fa8'], [-5, '#5aa7d8'], [5, '#bfe3f2'], [15, '#f4e9a3'], [25, '#f5a55b'], [35, '#d0442f']];

export function tempColor(c) {
  if (c <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    if (c <= STOPS[i][0]) {
      const [t0, a] = STOPS[i - 1], [t1, b] = STOPS[i], k = (c - t0) / (t1 - t0);
      const ch = s => [1, 3, 5].map(o => parseInt(s.slice(o, o + 2), 16));
      const [ra, rb] = [ch(a), ch(b)];
      return '#' + ra.map((v, j) => Math.round(v + (rb[j] - v) * k).toString(16).padStart(2, '0')).join('');
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export class WeatherMap {
  constructor(el, { onPick, onStatus, legend }) {
    this.onStatus = onStatus || (() => {});
    this.legendEl = legend || null;
    this.mode = 'off';
    this.units = 'metric';
    this.req = 0;
    this.map = L.map(el, { worldCopyJump: true }).setView(START_VIEW.center, START_VIEW.zoom);
    // Say so when map images fail (blocked network, provider outage, or a provider that now
    // wants a key) instead of leaving a blank grey box. Reported once per page load.
    let tileErrorShown = false;
    L.tileLayer(TILES.url, { attribution: TILES.attribution, maxZoom: TILES.maxZoom })
      .on('tileerror', () => {
        if (tileErrorShown) return;
        tileErrorShown = true;
        this.onStatus(`Map images from ${TILES.name} could not be loaded. Clicking the map and the weather layers still work.`);
      })
      .addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    this.marker = null;
    this.map.on('click', e => {
      const lon = ((e.latlng.lng % 360) + 540) % 360 - 180;
      onPick({ lat: +e.latlng.lat.toFixed(3), lon: +lon.toFixed(3) });
    });
    let t;
    this.map.on('moveend', () => { clearTimeout(t); t = setTimeout(() => this.refresh(), 700); });
  }

  setPlace(lat, lon, pan = true) {
    if (!this.marker) this.marker = L.marker([lat, lon], { keyboard: false, title: 'Selected place' }).addTo(this.map);
    else this.marker.setLatLng([lat, lon]);
    if (pan) this.map.setView([lat, lon], Math.max(this.map.getZoom(), 5));
  }

  setMode(mode) { this.mode = mode; this.refresh(); }
  setUnits(u) { this.units = u; this.draw(); }

  // Only called when a layer is switched on or the view settles, never on a timer.
  async refresh() {
    if (this.mode === 'off') { this.req++; this.layer.clearLayers(); this.data = null; this.onStatus(''); this.drawLegend(); return; }
    const id = ++this.req, b = this.map.getBounds();
    const pts = gridPoints({ south: b.getSouth(), north: b.getNorth(), west: b.getWest(), east: b.getEast() });
    this.onStatus('Loading map weather…');
    let data, msg = '';
    try {
      const r = await getGrid(pts);
      data = r.points;
      if (r.stale) msg = `Showing saved map data from ${new Date(r.fetchedAt).toLocaleTimeString()}. ${r.error?.message ?? ''}`;
    } catch (e) {
      data = demoGrid(pts);
      msg = `Could not load live map data. ${e.message} Showing demo values, not real weather.`;
    }
    if (id !== this.req) return; // a newer request (or switching the layer off) superseded this one
    this.data = data;
    this.onStatus(msg);
    this.draw();
  }

  draw() {
    this.layer.clearLayers();
    this.drawLegend();
    if (!this.data || this.mode === 'off') return;
    const f = fmt(this.units);
    for (const p of this.data) {
      const html = this.mode === 'temp'
        ? `<div class="mp mp-t" style="background:${tempColor(p.temp)}">${f.temp(p.temp)}</div>`
        : `<div class="mp mp-w"><svg width="26" height="26" viewBox="-13 -13 26 26" style="transform:rotate(${(p.dir + 180) % 360}deg)" aria-hidden="true"><path d="M0 -11 L7 6 L0 2 L-7 6 Z" fill="#13202f" stroke="#fff" stroke-width="1.5"/></svg><span>${f.wind(p.wind)}</span></div>`;
      L.marker([p.lat, p.mapLon ?? p.lon], {
        icon: L.divIcon({ html, className: 'mp-wrap', iconSize: [56, 40], iconAnchor: [28, 20] }),
        interactive: false, keyboard: false,
      }).addTo(this.layer);
    }
  }

  drawLegend() {
    const el = this.legendEl;
    if (!el) return;
    if (this.mode !== 'temp') { el.hidden = true; el.replaceChildren(); return; }
    const f = fmt(this.units), lo = STOPS[0][0], hi = STOPS[STOPS.length - 1][0];
    const bar = document.createElement('div');
    bar.className = 'legend-bar';
    bar.style.background = `linear-gradient(to right, ${STOPS.map(([t, c]) => `${c} ${((t - lo) / (hi - lo) * 100).toFixed(1)}%`).join(', ')})`;
    const ticks = document.createElement('div');
    ticks.className = 'legend-ticks';
    for (const [t] of STOPS) {
      const s = document.createElement('span');
      s.textContent = f.temp(t);
      s.style.left = `${((t - lo) / (hi - lo) * 100).toFixed(1)}%`;
      ticks.append(s);
    }
    const title = document.createElement('p');
    title.className = 'legend-title';
    title.textContent = 'Air temperature 2 m above ground';
    el.replaceChildren(title, bar, ticks);
    el.hidden = false;
  }
}
