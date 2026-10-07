import { test } from 'node:test';
import assert from 'node:assert/strict';
import { niceTicks, domain, summarize } from '../js/charts.js';
import { dewPoint, conv } from '../js/units.js';
import { demoForecast, withDewPoint } from '../js/data.js';

test('niceTicks uses round steps that cover the range', () => {
  assert.deepEqual(niceTicks(0, 10, 4), [0, 2.5, 5, 7.5, 10]);
  assert.deepEqual(niceTicks(1003, 1017, 4), [1000, 1005, 1010, 1015, 1020]);
  const t = niceTicks(-3.2, 17.9, 4);
  assert.ok(t[0] <= -3.2 && t.at(-1) >= 17.9);
});

test('domain never zooms in tighter than the minimum span', () => {
  const d = domain([1012, 1012.4], 12);
  assert.ok(d.hi - d.lo >= 12, `span ${d.hi - d.lo}`);
});

test('precipitation domain starts at zero and keeps a floor so drizzle stays small', () => {
  const d = domain([0, 0.2, 0.1], 2, true);
  assert.equal(d.lo, 0);
  assert.ok(d.hi >= 2);
});

test('dew point matches reference values', () => {
  // Saturated air: dew point equals temperature.
  assert.ok(Math.abs(dewPoint(20, 100) - 20) < 0.01);
  // 20 °C at 50% RH has a dew point of about 9.3 °C.
  assert.ok(Math.abs(dewPoint(20, 50) - 9.3) < 0.1);
  // Dew point can never exceed the air temperature.
  for (const rh of [10, 40, 80, 99]) assert.ok(dewPoint(25, rh) < 25);
});

test('withDewPoint fills a missing series and keeps an existing one', () => {
  const fc = { hourly: { time: ['a', 'b'], temperature_2m: [20, 10], relative_humidity_2m: [50, 100] } };
  withDewPoint(fc);
  assert.equal(fc.hourly.dew_point_2m.length, 2);
  assert.equal(fc.hourly.dew_point_2m[1], 10);
  const kept = { hourly: { time: ['a'], temperature_2m: [20], relative_humidity_2m: [50], dew_point_2m: [7] } };
  assert.deepEqual(withDewPoint(kept).hourly.dew_point_2m, [7]);
});

test('demo data shows pressure falling before the rain starts', () => {
  const h = demoForecast(new Date(2026, 8, 30, 6)).hourly;
  const firstRain = h.precipitation.findIndex(v => v > 0);
  assert.ok(firstRain > 0);
  assert.ok(h.pressure_msl[firstRain] < h.pressure_msl[0] - 5);
  assert.ok(h.temperature_2m[firstRain] - h.dew_point_2m[firstRain] < 1.5, 'air near saturation when rain begins');
});

test('summarize reports range, pressure trend, and rain in the chosen units', () => {
  const h = demoForecast(new Date(2026, 8, 30, 6)).hourly;
  const m = summarize(h, 'metric'), i = summarize(h, 'imperial');
  assert.match(m, /°C/);
  assert.match(i, /°F/);
  assert.match(m, /Total precipitation: \d/);
  assert.match(m, /nearly reaches the temperature/);
  assert.match(m, /falls from 1016 hPa to a low of 1005 hPa around .+, then rises to 1018 hPa/);
  const flat = { ...h, pressure_msl: h.pressure_msl.map(() => 1012) };
  assert.match(summarize(flat, 'metric'), /Pressure stays about the same/);
  assert.equal(conv('imperial').tempUnit, '°F');
});
