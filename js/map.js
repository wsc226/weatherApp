// Leaflet map: click to choose a place, plus a temperature or wind layer on a 6x6 grid.
// Leaflet is vendored (js/vendor/leaflet) and exposes the global `L`.
import { TILES, START_VIEW } from './config.js';
import { gridPoints, getGrid, demoGrid } from './data.js';
import { fmt } from './units.js';

const STOPS = [[-20, '#2b5fa8'], [-5, '#5aa7d8'], [5, '#bfe3f2'], [15, '#f4e9a3'], [25, '#f5a55b'], [35, '#d0442f']];

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
  constructor(el, { onPick, onStatus }) {
    this.onStatus = onStatus || (() => {});
    this.mode = 'off';
    this.units = 'metric';
    this.req = 0;
    this.map = L.map(el, { worldCopyJump: true }).setView(START_VIEW.center, START_VIEW.zoom);
    L.tileLayer(TILES.url, { attribution: TILES.attribution, maxZoom: TILES.maxZoom }).addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    this.marker = null;
    this.map.on('click', e => {
      const lon = ((e.latlng.lng + 540) % 360) - 180;
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

  async refresh() {
    if (this.mode === 'off') { this.layer.clearLayers(); this.data = null; this.onStatus(''); return; }
    const id = ++this.req, b = this.map.getBounds();
    this.onStatus('Loading map weather…');
    const pts = gridPoints({ south: b.getSouth(), north: b.getNorth(), west: b.getWest(), east: b.getEast() });
    try {
      this.data = await getGrid(pts);
      if (id === this.req) this.onStatus('');
    } catch (e) {
      this.data = demoGrid(pts);
      if (id === this.req) this.onStatus(`Could not load live map data (${e.message}). Showing demo values.`);
    }
    if (id === this.req) this.draw();
  }

  draw() {
    this.layer.clearLayers();
    if (!this.data || this.mode === 'off') return;
    const f = fmt(this.units);
    for (const p of this.data) {
      const html = this.mode === 'temp'
        ? `<div class="mp mp-t" style="background:${tempColor(p.temp)}">${f.temp(p.temp)}</div>`
        : `<div class="mp mp-w"><svg width="26" height="26" viewBox="-13 -13 26 26" style="transform:rotate(${(p.dir + 180) % 360}deg)" aria-hidden="true"><path d="M0 -11 L7 6 L0 2 L-7 6 Z" fill="#14213d" stroke="#fff" stroke-width="1.5"/></svg><span>${f.wind(p.wind)}</span></div>`;
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({ html, className: 'mp-wrap', iconSize: [56, 40], iconAnchor: [28, 20] }),
        interactive: false, keyboard: false,
      }).addTo(this.layer);
    }
  }
}
