import test from 'node:test';
import assert from 'node:assert/strict';

import { getSubsolarPoint, getSunLightVector } from '../src/math/solar.js';

test('getSubsolarPoint returns valid latitude/longitude ranges', () => {
  const point = getSubsolarPoint('2026-03-01T12:00:00Z');

  assert.ok(Number.isFinite(point.lat));
  assert.ok(Number.isFinite(point.lon));
  assert.ok(point.lat >= -90 && point.lat <= 90);
  assert.ok(point.lon >= -180 && point.lon <= 180);
});

test('getSubsolarPoint tracks seasonal hemisphere shift', () => {
  const june = getSubsolarPoint('2026-06-21T12:00:00Z');
  const december = getSubsolarPoint('2026-12-21T12:00:00Z');

  assert.ok(june.lat > 20);
  assert.ok(december.lat < -20);
});

test('getSunLightVector returns normalized camera-space vector', () => {
  const vector = getSunLightVector(
    { centerLat: 0, centerLon: 0 },
    '2026-03-01T12:00:00Z'
  );
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);

  assert.ok(Number.isFinite(vector.x));
  assert.ok(Number.isFinite(vector.y));
  assert.ok(Number.isFinite(vector.z));
  assert.ok(Math.abs(length - 1) < 1e-9);
});
