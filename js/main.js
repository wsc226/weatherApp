import { searchCity, getForecast, demoForecast, currentHourIndex, describeCode } from './data.js';
import { fmt, compass } from './units.js';
import { WeatherScene } from './scene.js';
import { Timeline } from './timeline.js';
import { mountWaterCycle } from './waterCycle.js';

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const DEFAULT_PLACE = { name: 'Washington', region: 'District of Columbia, United States', lat: 38.895, lon: -77.036 };

let place = store.get('place', DEFAULT_PLACE);
let units = store.get('units', 'metric');
let fc = null;
let mapPan = false; // first load: keep the default continental view instead of zooming in

const scene = new WeatherScene($('scene'));
const status = msg => { $('status').textContent = msg; };

// The map is an enhancement: if Leaflet or its tiles are blocked, the rest of the app still works.
let map = null;
try {
  const { WeatherMap } = await import('./map.js');
  map = new WeatherMap($('map'), {
    onStatus: m => { $('map-status').textContent = m; },
    onPick: ({ lat, lon }) => {
      place = { name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, region: 'point selected on the map', lat, lon };
      store.set('place', place);
      mapPan = false; // the user is already looking at this spot
      load();
    },
  });
  $('layer').addEventListener('change', e => map.setMode(e.target.value));
} catch (err) {
  $('map').textContent = 'The map could not be loaded. You can still search for a place above.';
  $('layer').disabled = true;
}

const timeline = new Timeline({
  range: $('tl-range'), play: $('tl-play'), back: $('tl-back'), fwd: $('tl-fwd'), speed: $('tl-speed'),
  onChange: i => render(i),
});

function render(i) {
  if (!fc) return;
  const h = fc.hourly, f = fmt(units), d = describeCode(h.weather_code[i]);
  const falls = ['rain', 'snow', 'thunder'].includes(d.type);
  scene.set({
    type: d.type,
    cloud: h.cloud_cover[i],
    isDay: h.is_day[i],
    intensity: falls ? Math.min(1, (h.precipitation[i] || 0) / 5 + (d.light ? 0.1 : 0.2)) : 0,
    windKmh: h.wind_speed_10m[i],
    windFrom: h.wind_direction_10m[i],
  });
  const when = new Date(h.time[i]).toLocaleString('en-US', { weekday: 'short', hour: 'numeric' });
  $('scene-label').textContent = `${when} · ${d.label}`;
  $('scene-alt').textContent = `${when}: ${d.label}, ${f.temp(h.temperature_2m[i])}, wind from the ${compass(h.wind_direction_10m[i])} at ${f.wind(h.wind_speed_10m[i])}.`;
  const rows = [
    ['Temperature', f.temp(h.temperature_2m[i])],
    ['Humidity', f.percent(h.relative_humidity_2m[i])],
    ['Pressure', f.pressure(h.pressure_msl[i])],
    ['Wind', `${f.wind(h.wind_speed_10m[i])} from ${compass(h.wind_direction_10m[i])}`],
    ['Cloud cover', f.percent(h.cloud_cover[i])],
    ['Precipitation', `${f.precip(h.precipitation[i] || 0)}/h`],
  ];
  $('readout').replaceChildren(...rows.map(([k, v]) => {
    const div = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k;
    dd.textContent = v;
    div.append(dt, dd);
    return div;
  }));
}

async function load() {
  $('place-name').textContent = place.name;
  map?.setPlace(place.lat, place.lon, mapPan);
  mapPan = true;
  status('Loading weather…');
  try {
    fc = await getForecast(place.lat, place.lon);
    $('updated').textContent = `Model data for ${place.region}. Last checked ${new Date().toLocaleTimeString()}. Forecast models update every few hours, so this is an estimate, not a sensor reading.`;
    status('');
  } catch (e) {
    fc = demoForecast();
    $('updated').textContent = 'Showing built-in demo data because live data could not be loaded.';
    status(`Could not load live data (${e.message}). Showing demo data.`);
  }
  timeline.setLength(fc.hourly.time.length, currentHourIndex(fc));
}

$('search').addEventListener('submit', async e => {
  e.preventDefault();
  const list = $('results');
  list.replaceChildren();
  status('Searching…');
  try {
    const found = await searchCity($('q').value.trim());
    status(found.length ? '' : 'No places found. Try another spelling.');
    for (const p of found) {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${p.name}, ${p.region}`;
      b.onclick = () => { place = p; store.set('place', p); list.replaceChildren(); load(); };
      li.append(b);
      list.append(li);
    }
  } catch (err) { status(`Search failed (${err.message}).`); }
});

document.querySelectorAll('input[name=units]').forEach(r => {
  r.checked = r.value === units;
  r.addEventListener('change', () => { units = r.value; store.set('units', units); render(timeline.i); map?.setUnits(units); });
});

async function loadLessons() {
  try {
    const items = await (await fetch('lessons/index.json')).json();
    $('lessons').replaceChildren(...items.map(l => {
      const li = document.createElement('li'), h = document.createElement('h3'),
        p = document.createElement('p'), s = document.createElement('span');
      h.textContent = l.title;
      p.textContent = l.summary;
      s.className = 'badge';
      s.textContent = l.status === 'planned' ? 'Coming soon' : 'Open';
      li.append(h, p, s);
      return li;
    }));
  } catch { $('lessons').textContent = 'Lessons could not be loaded.'; }
}

mountWaterCycle($('water-cycle'));
loadLessons();
load();
