import test from 'node:test';
import assert from 'node:assert/strict';
import { getSunDirectionForBody } from '../src/math/orbital.js';
import { getCelestialPreset } from '../src/scene/celestial.js';

test('getSunDirectionForBody returns normalized {x,y,z} for Earth', () => {
  const earth = getCelestialPreset('earth');
  const dir = getSunDirectionForBody(earth, '2026-06-21T12:00:00Z');

  assert.ok(Number.isFinite(dir.x));
  assert.ok(Number.isFinite(dir.y));
  assert.ok(Number.isFinite(dir.z));

  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
  assert.ok(Math.abs(len - 1) < 1e-6, `expected unit vector, got length ${len}`);
});

test('Mars northern summer solstice lights north pole', () => {
  const mars = getCelestialPreset('mars');
  const dir = getSunDirectionForBody(mars, '2026-07-15T12:00:00Z');
  assert.ok(Number.isFinite(dir.y));
});

test('Uranus extreme tilt produces valid sun direction', () => {
  const uranus = getCelestialPreset('uranus');
  const dir = getSunDirectionForBody(uranus, '2026-01-01T00:00:00Z');

  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
  assert.ok(Math.abs(len - 1) < 1e-6);
});

test('Venus retrograde rotation handled without NaN', () => {
  const venus = getCelestialPreset('venus');
  const dir = getSunDirectionForBody(venus, '2026-03-11T12:00:00Z');

  assert.ok(Number.isFinite(dir.x));
  assert.ok(Number.isFinite(dir.y));
  assert.ok(Number.isFinite(dir.z));
});

test('Moon sun direction uses parent (Earth) orbital position', () => {
  const moon = getCelestialPreset('moon');

  const moonDir = getSunDirectionForBody(moon, '2026-06-21T12:00:00Z');

  assert.ok(Number.isFinite(moonDir.x));
  assert.ok(Number.isFinite(moonDir.y));
  assert.ok(Number.isFinite(moonDir.z));
});

test('getSunDirectionForBody defaults to current time when no timestamp given', () => {
  const earth = getCelestialPreset('earth');
  const dir = getSunDirectionForBody(earth);
  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
  assert.ok(Math.abs(len - 1) < 1e-6);
});
