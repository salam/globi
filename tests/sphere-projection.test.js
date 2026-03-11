import test from 'node:test';
import assert from 'node:assert/strict';

import {
  orthographicProject,
  inverseOrthographicProject,
  getGlobeRadius,
} from '../src/math/sphereProjection.js';

test('getGlobeRadius uses 90% of the limiting container dimension at zoom 1', () => {
  const radius = getGlobeRadius(1000, 800, 1);

  assert.equal(radius, 360);
});

test('BUG1: orthographic projection centers the target coordinate on screen', () => {
  const width = 800;
  const height = 600;
  const radius = getGlobeRadius(width, height, 1);

  const projected = orthographicProject(
    { lat: 0, lon: 0, alt: 0 },
    {
      width,
      height,
      globeRadius: radius,
      centerLat: 0,
      centerLon: 0,
    }
  );

  assert.equal(projected.visible, true);
  assert.equal(Math.round(projected.x), 400);
  assert.equal(Math.round(projected.y), 300);
});

test('orthographic projection hides back hemisphere points', () => {
  const width = 800;
  const height = 600;
  const radius = getGlobeRadius(width, height, 1);

  const front = orthographicProject(
    { lat: 0, lon: 0, alt: 0 },
    { width, height, globeRadius: radius, centerLat: 0, centerLon: 0 }
  );

  const back = orthographicProject(
    { lat: 0, lon: 180, alt: 0 },
    { width, height, globeRadius: radius, centerLat: 0, centerLon: 0 }
  );

  assert.equal(front.visible, true);
  assert.equal(back.visible, false);
});

test('orthographic projection keeps visible points within globe boundary', () => {
  const width = 900;
  const height = 900;
  const radius = getGlobeRadius(width, height, 1);
  const cx = width / 2;
  const cy = height / 2;

  const samplePoints = [
    { lat: 0, lon: 0, alt: 0 },
    { lat: 20, lon: 20, alt: 0 },
    { lat: -45, lon: 50, alt: 0 },
    { lat: 70, lon: -30, alt: 0 },
  ];

  for (const point of samplePoints) {
    const projected = orthographicProject(point, {
      width,
      height,
      globeRadius: radius,
      centerLat: 0,
      centerLon: 0,
    });

    assert.equal(projected.visible, true);
    const dx = projected.x - cx;
    const dy = projected.y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    assert.ok(distance <= radius + 1e-6);
  }
});

// BUG4: Inverse orthographic projection tests

test('BUG4: inverseOrthographicProject returns center lat/lon for globe center pixel', () => {
  const width = 800;
  const height = 600;
  const radius = getGlobeRadius(width, height, 1);
  const centerX = width / 2;
  const centerY = height / 2;

  const result = inverseOrthographicProject(centerX, centerY, {
    width,
    height,
    globeRadius: radius,
    centerLat: 30,
    centerLon: -45,
  });

  assert.ok(result !== null);
  assert.ok(Math.abs(result.lat - 30) < 0.01);
  assert.ok(Math.abs(result.lon - (-45)) < 0.01);
});

test('BUG4: inverseOrthographicProject returns null for pixels outside globe', () => {
  const width = 800;
  const height = 600;
  const radius = getGlobeRadius(width, height, 1);

  const result = inverseOrthographicProject(0, 0, {
    width,
    height,
    globeRadius: radius,
    centerLat: 0,
    centerLon: 0,
  });

  assert.equal(result, null);
});

test('BUG4: inverseOrthographicProject is the inverse of orthographicProject', () => {
  const width = 800;
  const height = 600;
  const radius = getGlobeRadius(width, height, 1);
  const opts = { width, height, globeRadius: radius, centerLat: 25, centerLon: -60 };

  const testPoints = [
    { lat: 25, lon: -60 },
    { lat: 0, lon: 0 },
    { lat: 50, lon: -30 },
    { lat: -10, lon: -90 },
    { lat: 40, lon: -45 },
  ];

  for (const point of testPoints) {
    const forward = orthographicProject({ ...point, alt: 0 }, opts);
    if (!forward.visible) continue;

    const inverse = inverseOrthographicProject(forward.x, forward.y, opts);
    assert.ok(inverse !== null, `inverse failed for ${JSON.stringify(point)}`);
    assert.ok(Math.abs(inverse.lat - point.lat) < 0.1, `lat mismatch for ${JSON.stringify(point)}: got ${inverse.lat}`);

    let lonDiff = Math.abs(inverse.lon - point.lon);
    if (lonDiff > 180) lonDiff = 360 - lonDiff;
    assert.ok(lonDiff < 0.1, `lon mismatch for ${JSON.stringify(point)}: got ${inverse.lon}`);
  }
});

test('BUG4: inverseOrthographicProject handles camera at different positions', () => {
  const width = 600;
  const height = 600;
  const radius = getGlobeRadius(width, height, 1);

  const cameras = [
    { centerLat: 0, centerLon: 0 },
    { centerLat: 60, centerLon: 120 },
    { centerLat: -45, centerLon: -170 },
  ];

  for (const cam of cameras) {
    const opts = { width, height, globeRadius: radius, ...cam };
    const centerX = width / 2;
    const centerY = height / 2;

    const center = inverseOrthographicProject(centerX, centerY, opts);
    assert.ok(center !== null);
    assert.ok(Math.abs(center.lat - cam.centerLat) < 0.01);

    let lonDiff = Math.abs(center.lon - cam.centerLon);
    if (lonDiff > 180) lonDiff = 360 - lonDiff;
    assert.ok(lonDiff < 0.01);
  }
});
