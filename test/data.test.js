import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { describeCode, gridPoints, currentHourIndex, demoForecast, demoGrid, getJSON, DataError } from '../js/data.js';

class MemoryStorage {
  #m = new Map();
  get length() { return this.#m.size; }
  key(i) { return [...this.#m.keys()][i] ?? null; }
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null; }
  setItem(k, v) { this.#m.set(k, String(v)); }
  removeItem(k) { this.#m.delete(k); }
}

const respond = (status, body = {}) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });

beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });

test('describeCode covers WMO groups', () => {
  assert.equal(describeCode(0).type, 'clear');
  assert.equal(describeCode(3).label, 'Overcast');
  assert.equal(describeCode(45).type, 'fog');
  assert.equal(describeCode(53).light, true);
  assert.equal(describeCode(65).type, 'rain');
  assert.equal(describeCode(75).type, 'snow');
  assert.equal(describeCode(81).type, 'rain');
  assert.equal(describeCode(86).type, 'snow');
  assert.equal(describeCode(99).type, 'thunder');
  assert.equal(describeCode(12345).label, 'Unknown');
});

test('gridPoints gives useful density over North America at the starting zoom', () => {
  const pts = gridPoints({ south: 24, north: 62, west: -141, east: -51 });
  assert.ok(pts.length >= 12, `only ${pts.length} points`);
});

test('gridPoints never exceeds the point budget and stays inside the view', () => {
  const views = [
    { south: 20, north: 60, west: -130, east: -60 },
    { south: 44.9, north: 45.3, west: -75.9, east: -75.4 },
    { south: -85, north: 85, west: -540, east: 540 },       // zoomed all the way out
    { south: 10, north: 11, west: -170, east: -100 },       // very wide, very short
  ];
  for (const b of views) {
    const pts = gridPoints(b);
    assert.ok(pts.length > 0 && pts.length <= 30, `got ${pts.length} points for ${JSON.stringify(b)}`);
    for (const p of pts) {
      assert.ok(p.lat >= Math.max(-85, b.south) && p.lat <= Math.min(85, b.north));
      assert.ok(p.mapLon >= b.west && p.mapLon <= b.east);
      assert.ok(p.lon >= -180 && p.lon < 180);
    }
  }
});

test('gridPoints snaps to a fixed lattice so nearby views reuse the same coordinates', () => {
  const a = gridPoints({ south: 20, north: 60, west: -130, east: -60 });
  const b = gridPoints({ south: 21, north: 61, west: -129, east: -59 });
  const key = p => `${p.lat},${p.lon}`;
  const shared = a.map(key).filter(k => b.map(key).includes(k));
  assert.ok(shared.length >= a.length / 2, 'most points should be identical after a small pan');
});

test('gridPoints wraps longitude across the date line but keeps markers in view', () => {
  const pts = gridPoints({ south: 40, north: 60, west: 170, east: 200 });
  assert.ok(pts.some(p => p.mapLon > 180 && p.lon < 0), 'points east of 180 should map to negative longitudes');
});

test('currentHourIndex picks the hour at or before the model\'s current time', () => {
  const fc = { current: { time: '2026-09-30T06:15' }, hourly: { time: ['2026-09-30T05:00', '2026-09-30T06:00', '2026-09-30T07:00'] } };
  assert.equal(currentHourIndex(fc), 1);
});

test('demo data is well-formed and flagged as demo', () => {
  const fc = demoForecast(new Date(2026, 8, 30, 6, 30));
  assert.equal(fc.demo, true);
  assert.equal(fc.hourly.time.length, 72);
  assert.equal(fc.hourly.time[0], '2026-09-30T06:00');
  for (const k of Object.keys(fc.hourly)) assert.equal(fc.hourly[k].length, 72, k);
  assert.equal(currentHourIndex(fc), 0);
  const g = demoGrid([{ lat: 0, lon: 10, mapLon: 370 }]);
  assert.equal(g[0].mapLon, 370);
  assert.equal(g[0].temp, 30);
});

test('getJSON caches fresh responses', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return respond(200, { a: 1 })(); };
  const r1 = await getJSON('https://x/test', 10);
  const r2 = await getJSON('https://x/test', 10);
  assert.deepEqual(r2.data, { a: 1 });
  assert.equal(r1.stale, false);
  assert.equal(calls, 1);
});

test('getJSON falls back to the saved copy when rate-limited', async () => {
  globalThis.fetch = respond(200, { a: 1 });
  await getJSON('https://x/rl', 10);
  globalThis.fetch = respond(429);
  const r = await getJSON('https://x/rl', 0); // ttl 0 forces a refresh attempt
  assert.equal(r.stale, true);
  assert.deepEqual(r.data, { a: 1 });
  assert.equal(r.error.rateLimited, true);
});

test('getJSON throws a friendly error when rate-limited with nothing saved', async () => {
  globalThis.fetch = respond(429);
  await assert.rejects(getJSON('https://x/none', 10), e => e instanceof DataError && e.rateLimited && /Too many requests/.test(e.message));
});

test('getJSON reports network failures', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(getJSON('https://x/offline', 10), e => e instanceof DataError && /Failed to fetch/.test(e.message));
});

test('getJSON still works when storage is unavailable', async () => {
  delete globalThis.localStorage;
  globalThis.fetch = respond(200, { ok: true });
  const r = await getJSON('https://x/nostore', 10);
  assert.deepEqual(r.data, { ok: true });
});
