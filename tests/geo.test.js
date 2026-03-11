import test from 'node:test';
import assert from 'node:assert/strict';

import {
  latLonToCartesian,
  cartesianToLatLon,
  greatCircleArc,
  densifyPath,
} from '../src/math/geo.js';

function almostEqual(a, b, epsilon = 1e-6) {
  return Math.abs(a - b) < epsilon;
}

test('latLonToCartesian and cartesianToLatLon are reversible', () => {
  const cart = latLonToCartesian(47.3769, 8.5417, 1, 0.02);
  const geo = cartesianToLatLon(cart.x, cart.y, cart.z);

  assert.equal(almostEqual(geo.lat, 47.3769, 1e-4), true);
  assert.equal(almostEqual(geo.lon, 8.5417, 1e-4), true);
  assert.equal(almostEqual(geo.radius, 1.02, 1e-4), true);
});

test('greatCircleArc returns endpoints and altitude peak', () => {
  const start = { lat: 0, lon: 0, alt: 0 };
  const end = { lat: 0, lon: 90, alt: 0 };

  const arc = greatCircleArc(start, end, { segments: 8, maxAltitude: 0.5 });

  assert.equal(arc.length, 9);
  assert.equal(almostEqual(arc[0].lat, start.lat), true);
  assert.equal(almostEqual(arc[0].lon, start.lon), true);
  assert.equal(almostEqual(arc.at(-1).lon, end.lon), true);
  assert.ok(arc.some((p) => p.alt > 0.45));
});

test('densifyPath inserts extra points on long segments', () => {
  const path = [
    { lat: 0, lon: 0, alt: 0 },
    { lat: 0, lon: 120, alt: 0 },
  ];

  const dense = densifyPath(path, { maxStepDegrees: 10 });

  assert.ok(dense.length > path.length);
  assert.equal(almostEqual(dense[0].lon, 0), true);
  assert.equal(almostEqual(dense.at(-1).lon, 120, 1e-3), true);
});
