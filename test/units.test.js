import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compass, fmt, wallTime } from '../js/units.js';

test('compass maps bearings to 8 points, wrapping and negatives included', () => {
  assert.equal(compass(0), 'N');
  assert.equal(compass(359), 'N');
  assert.equal(compass(360), 'N');
  assert.equal(compass(90), 'E');
  assert.equal(compass(225), 'SW');
  assert.equal(compass(-90), 'W');
  assert.equal(compass(22), 'N');
  assert.equal(compass(23), 'NE');
});

test('metric formatting', () => {
  const f = fmt('metric');
  assert.equal(f.temp(21.6), '22°C');
  assert.equal(f.wind(12.4), '12 km/h');
  assert.equal(f.precip(2.54), '2.5 mm');
  assert.equal(f.pressure(1013.25), '1013 hPa');
  assert.equal(f.percent(59.5), '60%');
});

test('imperial conversions', () => {
  const f = fmt('imperial');
  assert.equal(f.temp(0), '32°F');
  assert.equal(f.temp(100), '212°F');
  assert.equal(f.temp(-40), '-40°F');
  assert.equal(f.wind(100), '62 mph');
  assert.equal(f.precip(25.4), '1.00 in');
});

test('wallTime shows the place\'s clock time regardless of the viewer\'s time zone', () => {
  // 2026-09-30 is a Wednesday. Open-Meteo sends local wall time without an offset.
  // ICU versions differ on the comma ("Wed, 6 AM" in Chrome, "Wed 6 AM" in some Node builds).
  assert.match(wallTime('2026-09-30T06:00'), /^Wed,? 6\sAM$/);
  assert.match(wallTime('2026-09-30T23:00'), /^Wed,? 11\sPM$/);
  assert.match(wallTime('2026-10-01T00:00'), /^Thu,? 12\sAM$/);
});
