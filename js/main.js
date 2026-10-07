import { searchCity, getForecast, demoForecast, currentHourIndex, describeCode, pruneCache } from './data.js';
import { fmt, compass, wallTime } from './units.js';
import { WeatherScene } from './scene.js';
import { Timeline } from './timeline.js';
import { mountWaterCycle } from './waterCycle.js';
import { ForecastCharts } from './charts.js';

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
let loadId = 0;     // guards against an older, slower response overwriting a newer place
let searchId = 0;

pruneCache();
const scene = new WeatherScene($('scene'));
const status = msg => { $('status').textContent = msg; };

const sceneBtn = $('scene-toggle');
const syncSceneBtn = () => { sceneBtn.textContent = scene.running ? 'Pause motion' : 'Play motion'; };
sceneBtn.addEventListener('click', () => { scene.toggle(); syncSceneBtn(); });
syncSceneBtn();

// The map is an enhancement: if Leaflet or its tiles are blocked, the rest of the app still works.
let map = null;
try {
  const { WeatherMap } = await import('./map.js');
  map = new WeatherMap($('map'), {
    legend: $('map-legend'),
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
  onChange: i => { render(i); charts.setIndex(i); },
});

// Clicking or arrow-keying the charts moves the timeline, which moves everything else.
const charts = new ForecastCharts($('charts'), { onSelect: i => { timeline.pause(); timeline.goto(i); } });

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
  const tz = fc.timezone_abbreviation ? ` ${fc.timezone_abbreviation}` : '';
  const when = `${wallTime(h.time[i])}${tz}`;
  $('scene-label').textContent = `${when} · ${d.label}`;
  $('tl-range').setAttribute('aria-valuetext', when);
  $('scene-alt').textContent = `${when}: ${d.label}, ${f.temp(h.temperature_2m[i])}, wind from the ${compass(h.wind_direction_10m[i])} at ${f.wind(h.wind_speed_10m[i])}.`;
  const rows = [
    ['Temperature', f.temp(h.temperature_2m[i])],
    ['Dew point', f.temp(h.dew_point_2m[i])],
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

function describeSource(data) {
  if (data.demo) return 'Showing built-in demo data because live data could not be loaded. These are not real conditions.';
  const at = new Date(data.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const tz = data.timezone_abbreviation ? ` (${data.timezone_abbreviation})` : '';
  if (data.stale) return `Showing saved data from ${at} because live data could not be refreshed. Times are local to this place${tz}.`;
  return `Model data for ${place.region}, retrieved at ${at}. Times are local to this place${tz}. Forecast models update every hour or more, so these are estimates, not sensor readings.`;
}

async function load() {
  const id = ++loadId;
  $('place-name').textContent = place.name;
  map?.setPlace(place.lat, place.lon, mapPan);
  mapPan = true;
  status('Loading weather…');
  let data, msg = '';
  try {
    data = await getForecast(place.lat, place.lon);
    if (data.stale) msg = data.error?.message ?? '';
  } catch (e) {
    data = demoForecast();
    msg = `${e.message} Showing demo data.`;
  }
  if (id !== loadId) return; // the student picked another place while this was loading
  fc = data;
  status(msg);
  $('updated').textContent = describeSource(fc);
  charts.setData(fc.hourly, units, fc.timezone_abbreviation);
  timeline.setLength(fc.hourly.time.length, currentHourIndex(fc));
}

$('search').addEventListener('submit', async e => {
  e.preventDefault();
  const id = ++searchId, list = $('results');
  list.replaceChildren();
  status('Searching…');
  try {
    const found = await searchCity($('q').value.trim());
    if (id !== searchId) return;
    status(found.length ? '' : 'No places found. Try another spelling.');
    for (const p of found) {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${p.name}, ${p.region}`;
      b.onclick = () => { place = p; store.set('place', p); list.replaceChildren(); load(); };
      li.append(b);
      list.append(li);
    }
  } catch (err) { if (id === searchId) status(`Search failed. ${err.message}`); }
});

document.querySelectorAll('input[name=units]').forEach(r => {
  r.checked = r.value === units;
  r.addEventListener('change', () => { units = r.value; store.set('units', units); render(timeline.i); charts.setUnits(units); map?.setUnits(units); });
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
