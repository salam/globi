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

import { orthographic } from '../src/math/projections/orthographic.js';

test('orthographic – project center maps to origin', () => {
  const { x, y } = orthographic.project(0, 0, 0, 0);
  assert.ok(Math.abs(x) < 1e-10);
  assert.ok(Math.abs(y) < 1e-10);
});

test('orthographic – project 90 deg east from center (0,0)', () => {
  const { x, y } = orthographic.project(0, 90, 0, 0);
  assert.ok(Math.abs(x - 1) < 1e-6, `x should be 1, got ${x}`);
  assert.ok(Math.abs(y) < 1e-6, `y should be 0, got ${y}`);
});

test('orthographic – inverse round-trips for visible point', () => {
  const centerLat = 20, centerLon = 40;
  const lat = 30, lon = 50;
  const { x, y } = orthographic.project(lat, lon, centerLat, centerLon);
  const inv = orthographic.inverse(x, y, centerLat, centerLon);
  assert.ok(inv !== null);
  assert.ok(Math.abs(inv.lat - lat) < 1e-4);
  assert.ok(Math.abs(inv.lon - lon) < 1e-4);
});

test('orthographic – isVisible false for back hemisphere', () => {
  assert.equal(orthographic.isVisible(0, 180, 0, 0), false);
});

test('orthographic – isVisible true for front hemisphere', () => {
  assert.ok(orthographic.isVisible(0, 45, 0, 0));
});

test('orthographic – inverse returns null outside disc', () => {
  const result = orthographic.inverse(1.5, 0, 0, 0);
  assert.equal(result, null);
});

import { equirectangular } from '../src/math/projections/equirectangular.js';

test('equirectangular – project center maps to origin', () => {
  const { x, y } = equirectangular.project(30, 60, 30, 60);
  assert.ok(Math.abs(x) < 1e-10);
  assert.ok(Math.abs(y) < 1e-10);
});

test('equirectangular – x is longitude delta in radians', () => {
  const { x, y } = equirectangular.project(0, 45, 0, 0);
  assert.ok(Math.abs(x - 45 * Math.PI / 180) < 1e-6);
  assert.ok(Math.abs(y) < 1e-6);
});

test('equirectangular – y is latitude delta in radians', () => {
  const { x, y } = equirectangular.project(60, 0, 30, 0);
  assert.ok(Math.abs(x) < 1e-6);
  assert.ok(Math.abs(y - 30 * Math.PI / 180) < 1e-6);
});

test('equirectangular – inverse round-trips', () => {
  const centerLat = -10, centerLon = 120;
  const lat = 50, lon = -170;
  const { x, y } = equirectangular.project(lat, lon, centerLat, centerLon);
  const inv = equirectangular.inverse(x, y, centerLat, centerLon);
  assert.ok(inv !== null);
  assert.ok(Math.abs(inv.lat - lat) < 1e-6);
  const normExpected = ((lon + 180) % 360 + 360) % 360 - 180;
  const normActual = ((inv.lon + 180) % 360 + 360) % 360 - 180;
  assert.ok(Math.abs(normActual - normExpected) < 1e-4);
});

test('equirectangular – wraps longitude across antimeridian', () => {
  const { x } = equirectangular.project(0, -170, 0, 170);
  const expectedX = 20 * Math.PI / 180;
  assert.ok(Math.abs(x - expectedX) < 1e-6, `x should be ${expectedX}, got ${x}`);
});

test('equirectangular – isVisible always true', () => {
  assert.ok(equirectangular.isVisible(90, 0, 0, 0));
  assert.ok(equirectangular.isVisible(-90, 180, 45, -45));
});

test('equirectangular – inverse returns null beyond poles', () => {
  const result = equirectangular.inverse(0, 2, 0, 0);
  assert.equal(result, null, 'should return null for lat > 90');
});

import { getProjection, PROJECTION_NAMES } from '../src/math/projections/index.js';

test('registry – getProjection returns known projections', () => {
  assert.ok(getProjection('azimuthalEquidistant'));
  assert.ok(getProjection('orthographic'));
  assert.ok(getProjection('equirectangular'));
});

test('registry – getProjection returns null for unknown', () => {
  assert.equal(getProjection('mercator'), null);
  assert.equal(getProjection('globe'), null);
});

test('registry – PROJECTION_NAMES lists all flat projections', () => {
  assert.deepEqual(PROJECTION_NAMES.sort(), ['azimuthalEquidistant', 'equirectangular', 'orthographic']);
});

test('registry – every projection has project, inverse, isVisible', () => {
  for (const name of PROJECTION_NAMES) {
    const p = getProjection(name);
    assert.equal(typeof p.project, 'function', `${name}.project`);
    assert.equal(typeof p.inverse, 'function', `${name}.inverse`);
    assert.equal(typeof p.isVisible, 'function', `${name}.isVisible`);
  }
});
