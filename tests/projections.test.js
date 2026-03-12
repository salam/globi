import test from 'node:test';
import assert from 'node:assert/strict';
import { azimuthalEquidistant } from '../src/math/projections/azimuthalEquidistant.js';

test('azimuthalEquidistant – project center maps to origin', () => {
  const { x, y } = azimuthalEquidistant.project(45, 90, 45, 90);
  assert.ok(Math.abs(x) < 1e-10);
  assert.ok(Math.abs(y) < 1e-10);
});

test('azimuthalEquidistant – project north pole from equator/0', () => {
  const { x, y } = azimuthalEquidistant.project(90, 0, 0, 0);
  assert.ok(Math.abs(x) < 1e-10, 'x should be ~0');
  assert.ok(Math.abs(y - Math.PI / 2) < 1e-6, `y should be pi/2, got ${y}`);
});

test('azimuthalEquidistant – project antipodal point', () => {
  const { x, y } = azimuthalEquidistant.project(0, 180, 0, 0);
  const r = Math.sqrt(x * x + y * y);
  assert.ok(Math.abs(r - Math.PI) < 1e-6, `radius should be pi, got ${r}`);
});

test('azimuthalEquidistant – inverse round-trips', () => {
  const centerLat = 30, centerLon = -60;
  const lat = 45, lon = -30;
  const { x, y } = azimuthalEquidistant.project(lat, lon, centerLat, centerLon);
  const inv = azimuthalEquidistant.inverse(x, y, centerLat, centerLon);
  assert.ok(inv !== null);
  assert.ok(Math.abs(inv.lat - lat) < 1e-6, `lat round-trip: expected ${lat}, got ${inv.lat}`);
  assert.ok(Math.abs(inv.lon - lon) < 1e-6, `lon round-trip: expected ${lon}, got ${inv.lon}`);
});

test('azimuthalEquidistant – isVisible always true (full globe)', () => {
  assert.ok(azimuthalEquidistant.isVisible(0, 180, 0, 0));
  assert.ok(azimuthalEquidistant.isVisible(-90, 0, 45, 90));
});

test('azimuthalEquidistant – inverse returns null beyond pi', () => {
  const result = azimuthalEquidistant.inverse(0, Math.PI + 0.1, 0, 0);
  assert.equal(result, null);
});
