// Data layer: Open-Meteo geocoding + forecast, cached in localStorage so reloads, tabs, and
// small map pans reuse data instead of spending the school network's shared request budget.
import { API, CACHE_MINUTES, GRID_MAX_POINTS } from './config.js';

const PREFIX = 'wmc:';
const MAX_AGE_KEEP_MS = 7 * 24 * 3600e3; // stale copies are kept this long as an offline fallback

export class DataError extends Error {
  constructor(message, { status, rateLimited } = {}) {
    super(message);
    this.status = status;
    this.rateLimited = !!rateLimited;
  }
}

function storage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function cacheRead(key) {
  try {
    const raw = storage()?.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function cacheWrite(key, v) {
  const s = storage();
  if (!s) return;
  const entry = JSON.stringify({ t: Date.now(), v });
  try { s.setItem(PREFIX + key, entry); } catch {
    pruneCache(true); // storage full: drop our entries and try once more
    try { s.setItem(PREFIX + key, entry); } catch { /* give up quietly */ }
  }
}

export function pruneCache(all = false) {
  const s = storage();
  if (!s) return;
  try {
    for (let i = s.length - 1; i >= 0; i--) {
      const k = s.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      let old = all;
      if (!old) { try { old = Date.now() - JSON.parse(s.getItem(k)).t > MAX_AGE_KEEP_MS; } catch { old = true; } }
      if (old) s.removeItem(k);
    }
  } catch { /* storage unavailable */ }
}

// Returns { data, fetchedAt, stale }. On a network or server error, falls back to the last saved
// copy (marked stale) before giving up, so a rate limit does not blank the page.
export async function getJSON(url, ttlMinutes) {
  const hit = cacheRead(url);
  if (hit && Date.now() - hit.t < ttlMinutes * 60e3) return { data: hit.v, fetchedAt: hit.t, stale: false };
  let err;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      cacheWrite(url, data);
      return { data, fetchedAt: Date.now(), stale: false };
    }
    err = res.status === 429
      ? new DataError('Too many requests from your network right now. The free weather service limits each school network; try again in a few minutes.', { status: 429, rateLimited: true })
      : new DataError(`The data service returned an error (${res.status}).`, { status: res.status });
  } catch (e) {
    err = e instanceof DataError ? e : new DataError(`Could not reach the data service (${e.message}).`);
  }
  if (hit) return { data: hit.v, fetchedAt: hit.t, stale: true, error: err };
  throw err;
}

export async function searchCity(name) {
  const url = `${API.geocoding}?name=${encodeURIComponent(name)}&count=6&language=en&format=json`;
  const { data } = await getJSON(url, CACHE_MINUTES.geocoding);
  return (data.results || []).map(r => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

// Coordinates are rounded so nearby clicks share a cache entry (0.01° is about 1 km).
export async function getForecast(lat, lon) {
  const p = new URLSearchParams({
    latitude: lat.toFixed(2), longitude: lon.toFixed(2), timezone: 'auto', forecast_days: '3',
    current: 'temperature_2m,weather_code',
    hourly: 'temperature_2m,relative_humidity_2m,pressure_msl,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,weather_code,is_day',
  });
  const r = await getJSON(`${API.forecast}?${p}`, CACHE_MINUTES.forecast);
  return { ...r.data, fetchedAt: r.fetchedAt, stale: r.stale, error: r.error };
}

// Index of the last hourly step at or before "now" (ISO strings sort lexicographically).
// When the data is stale, "now" may have moved on; we still use the model's own current time.
export function currentHourIndex(fc) {
  const times = fc.hourly.time;
  let idx = 0;
  for (let i = 0; i < times.length; i++) if (times[i] <= fc.current.time) idx = i;
  return idx;
}

// Every step divides 360, so points line up across the date line and repeat views reuse the cache.
const GRID_STEPS = [0.25, 0.5, 1, 2, 2.5, 5, 10, 15, 20, 30, 45, 60, 90];

// Lattice cell centers (k + 0.5) * step that fall inside [lo, hi].
function centers(lo, hi, step) {
  const out = [];
  for (let k = Math.floor(lo / step); (k + 0.5) * step <= hi; k++) if ((k + 0.5) * step >= lo) out.push(+((k + 0.5) * step).toFixed(3));
  return out;
}

// Finest lattice along one axis with at most maxN centers in view. If the next step up would
// leave none, keep the middle maxN centers of the finer lattice (still lattice-aligned).
function axisCenters(lo, hi, maxN) {
  let prev = [];
  for (const s of GRID_STEPS) {
    const c = centers(lo, hi, s);
    if (c.length <= maxN) {
      if (c.length || !prev.length) return c;
      const start = Math.floor((prev.length - maxN) / 2);
      return prev.slice(start, start + maxN);
    }
    prev = c;
  }
  return prev.slice(0, maxN);
}

// Points on a fixed lattice inside a map view, split between rows and columns by the view's
// shape. `mapLon` is where to draw the marker (it may be outside -180..180 when the map has
// wrapped around); `lon` is the real longitude for the API.
export function gridPoints(b, maxPoints = GRID_MAX_POINTS) {
  const south = Math.max(-85, b.south), north = Math.min(85, b.north);
  const west = b.west, east = Math.min(b.east, b.west + 360);
  const aspect = (east - west) / Math.max(north - south, 0.01);
  const cols = Math.min(maxPoints, Math.max(1, Math.round(Math.sqrt(maxPoints * aspect))));
  const rows = Math.max(1, Math.floor(maxPoints / cols));
  const pts = [];
  for (const lat of axisCenters(south, north, rows)) {
    for (const mapLon of axisCenters(west, east, cols)) {
      const lon = +(((mapLon % 360) + 540) % 360 - 180).toFixed(3);
      pts.push({ lat, lon, mapLon });
    }
  }
  return pts;
}

export async function getGrid(pts) {
  if (!pts.length) return { points: [], fetchedAt: Date.now(), stale: false };
  const sorted = [...pts].sort((a, b) => a.lat - b.lat || a.lon - b.lon);
  const p = new URLSearchParams({
    latitude: sorted.map(q => q.lat).join(','), longitude: sorted.map(q => q.lon).join(','),
    current: 'temperature_2m,wind_speed_10m,wind_direction_10m', timezone: 'UTC',
  });
  const r = await getJSON(`${API.forecast}?${p}`, CACHE_MINUTES.grid);
  const arr = Array.isArray(r.data) ? r.data : [r.data];
  return {
    points: sorted.map((q, i) => ({ ...q, temp: arr[i].current.temperature_2m, wind: arr[i].current.wind_speed_10m, dir: arr[i].current.wind_direction_10m })),
    fetchedAt: r.fetchedAt, stale: r.stale, error: r.error,
  };
}

// Offline stand-in: warm toward the equator, westerly wind. Clearly labelled as demo in the UI.
export function demoGrid(pts) {
  return pts.map(q => ({ ...q, temp: +(30 - Math.abs(q.lat) * 0.6).toFixed(1), wind: 15, dir: 270 }));
}

const pad = n => String(n).padStart(2, '0');

// Offline demo data so the app still teaches when the network is unavailable.
// Times are local wall-clock strings, the same shape Open-Meteo returns with timezone=auto.
export function demoForecast(now = new Date()) {
  const n = 72, time = [], H = {
    temperature_2m: [], relative_humidity_2m: [], pressure_msl: [], precipitation: [],
    cloud_cover: [], wind_speed_10m: [], wind_direction_10m: [], weather_code: [], is_day: [],
  };
  const start = new Date(now); start.setMinutes(0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getTime() + i * 3600e3);
    time.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`);
    const h = d.getHours(), wet = i > 20 && i < 30;
    H.temperature_2m.push(+(12 + 6 * Math.sin((h - 9) / 24 * 2 * Math.PI)).toFixed(1));
    H.relative_humidity_2m.push(wet ? 90 : 60);
    H.pressure_msl.push(wet ? 1007 : 1015);
    H.precipitation.push(wet ? 2.5 : 0);
    H.cloud_cover.push(wet ? 100 : 40);
    H.wind_speed_10m.push(wet ? 24 : 12);
    H.wind_direction_10m.push(wet ? 230 : 280);
    H.weather_code.push(wet ? 63 : 2);
    H.is_day.push(h >= 7 && h < 19 ? 1 : 0);
  }
  return { demo: true, timezone_abbreviation: '', current: { time: time[0] }, hourly: { time, ...H }, fetchedAt: now.getTime() };
}

// WMO weather codes -> plain-English label + scene type.
export function describeCode(code) {
  if (code === 0) return { label: 'Clear sky', type: 'clear' };
  if (code === 1) return { label: 'Mostly clear', type: 'clear' };
  if (code === 2) return { label: 'Partly cloudy', type: 'cloud' };
  if (code === 3) return { label: 'Overcast', type: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Fog', type: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', type: 'rain', light: true };
  if (code >= 61 && code <= 67) return { label: 'Rain', type: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Snow', type: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Rain showers', type: 'rain' };
  if (code === 85 || code === 86) return { label: 'Snow showers', type: 'snow' };
  if (code === 95 || code === 96 || code === 99) return { label: 'Thunderstorm', type: 'thunder' };
  return { label: 'Unknown', type: 'cloud' };
}
