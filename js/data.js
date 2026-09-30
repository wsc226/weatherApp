// Data layer: Open-Meteo geocoding + forecast, with a short browser cache.
const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const TTL_MS = 10 * 60 * 1000;

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    return Date.now() - t < TTL_MS ? v : null;
  } catch { return null; }
}
function cacheSet(key, v) {
  try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v })); } catch { /* storage unavailable */ }
}

async function getJSON(url) {
  const hit = cacheGet(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data service returned ${res.status}`);
  const json = await res.json();
  cacheSet(url, json);
  return json;
}

export async function searchCity(name) {
  const url = `${GEO}?name=${encodeURIComponent(name)}&count=6&language=en&format=json`;
  const json = await getJSON(url);
  return (json.results || []).map(r => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export async function getForecast(lat, lon) {
  const p = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: 'auto', forecast_days: '3',
    current: 'temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,weather_code,is_day',
    hourly: 'temperature_2m,relative_humidity_2m,pressure_msl,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,weather_code,is_day',
  });
  return getJSON(`${FORECAST}?${p}`);
}

// Current conditions on an n x n grid inside a map's bounds, in ONE request (Open-Meteo accepts
// comma-separated coordinate lists). Coordinates are rounded so repeat views hit the cache.
export function gridPoints(b, n = 6) {
  const south = Math.max(-85, b.south), north = Math.min(85, b.north), pts = [];
  const span = b.east - b.west >= 360 ? 360 : b.east - b.west;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const lat = south + (north - south) * (i + 0.5) / n;
      let lon = b.west + span * (j + 0.5) / n;
      lon = ((lon + 540) % 360) - 180; // wrap into [-180, 180)
      pts.push({ lat: +lat.toFixed(1), lon: +lon.toFixed(1) });
    }
  }
  return pts;
}

export async function getGrid(pts) {
  const p = new URLSearchParams({
    latitude: pts.map(q => q.lat).join(','), longitude: pts.map(q => q.lon).join(','),
    current: 'temperature_2m,wind_speed_10m,wind_direction_10m', timezone: 'UTC',
  });
  const json = await getJSON(`${FORECAST}?${p}`);
  const arr = Array.isArray(json) ? json : [json];
  return arr.map((r, i) => ({ ...pts[i], temp: r.current.temperature_2m, wind: r.current.wind_speed_10m, dir: r.current.wind_direction_10m }));
}

// Offline stand-in: warm toward the equator, westerly wind. Clearly labelled as demo in the UI.
export function demoGrid(pts) {
  return pts.map(q => ({ ...q, temp: 30 - Math.abs(q.lat) * 0.6, wind: 15, dir: 270 }));
}

// Index of the last hourly step at or before "now" (ISO strings sort lexicographically).
export function currentHourIndex(fc) {
  const times = fc.hourly.time;
  let idx = 0;
  for (let i = 0; i < times.length; i++) if (times[i] <= fc.current.time) idx = i;
  return idx;
}

// Offline demo data so the app still teaches when the network is unavailable.
export function demoForecast() {
  const n = 72, time = [], H = {
    temperature_2m: [], relative_humidity_2m: [], pressure_msl: [], precipitation: [],
    cloud_cover: [], wind_speed_10m: [], wind_direction_10m: [], weather_code: [], is_day: [],
  };
  const start = new Date(); start.setMinutes(0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getTime() + i * 3600e3);
    time.push(d.toISOString().slice(0, 13) + ':00');
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
  return { demo: true, current: { time: time[0] }, hourly: { time, ...H } };
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
  if (code >= 95) return { label: 'Thunderstorm', type: 'thunder' };
  return { label: 'Unknown', type: 'cloud' };
}
