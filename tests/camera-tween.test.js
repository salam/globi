import test from 'node:test';
import assert from 'node:assert/strict';

import {
  easeInOutCubic,
  interpolateCameraState,
  shortestLongitudeDelta,
} from '../src/components/cameraTween.js';

test('shortestLongitudeDelta chooses minimal wrapped path', () => {
  assert.equal(shortestLongitudeDelta(170, -170), 20);
  assert.equal(shortestLongitudeDelta(-170, 170), -20);
  assert.equal(shortestLongitudeDelta(10, 40), 30);
});

test('easeInOutCubic returns eased endpoints', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.ok(easeInOutCubic(0.5) > 0.4);
  assert.ok(easeInOutCubic(0.5) < 0.6);
});

test('interpolateCameraState interpolates lat/lon with wrapped longitude', () => {
  const start = { lat: 10, lon: 170 };
  const end = { lat: 30, lon: -170 };
  const mid = interpolateCameraState(start, end, 0.5);

  assert.ok(mid.lat > 10 && mid.lat < 30);
  assert.ok(mid.lon > 170 || mid.lon < -170);
});
