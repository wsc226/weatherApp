import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempColor, STOPS } from '../js/map.js';

test('tempColor clamps at both ends', () => {
  assert.equal(tempColor(-50), STOPS[0][1]);
  assert.equal(tempColor(60), STOPS[STOPS.length - 1][1]);
});

test('tempColor hits each stop exactly', () => {
  for (const [t, c] of STOPS) assert.equal(tempColor(t), c);
});

test('tempColor interpolates to a valid hex color', () => {
  for (let t = -25; t <= 40; t += 0.5) assert.match(tempColor(t), /^#[0-9a-f]{6}$/);
});
