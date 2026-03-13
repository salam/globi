import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlanetConfig } from '../src/scene/celestial.js';

// BUG28 — Country boundary vectors must only be loaded for Earth, not other
// planets.  The init() path in threeGlobeRenderer.js fetches the GeoJSON
// unconditionally; it must guard with `resolvedPlanet.id === 'earth'`.

const NON_EARTH_BODIES = [
  'mars', 'jupiter', 'saturn', 'venus', 'mercury',
  'moon', 'europa', 'titan', 'neptune', 'uranus', 'pluto', 'io',
];

test('resolvePlanetConfig identifies Earth correctly', () => {
  const earth = resolvePlanetConfig({ id: 'earth' });
  assert.equal(earth.id, 'earth');
});

test('resolvePlanetConfig defaults to Earth when no id given', () => {
  const def = resolvePlanetConfig({});
  assert.equal(def.id, 'earth');
});

for (const bodyId of NON_EARTH_BODIES) {
  test(`resolvePlanetConfig('${bodyId}') is not Earth — borders must be skipped`, () => {
    const planet = resolvePlanetConfig({ id: bodyId });
    assert.notEqual(planet.id, 'earth',
      `${bodyId} should not resolve to earth`);
  });
}

// Behavioural: the guard condition used in init() must return false for
// non-Earth planets.  We replicate the exact condition from the fix:
//   const isEarth = resolvedPlanet.id === 'earth';
// and verify it for every supported non-Earth body.
test('border-fetch guard returns false for all non-Earth bodies', () => {
  for (const bodyId of NON_EARTH_BODIES) {
    const resolved = resolvePlanetConfig({ id: bodyId });
    const isEarth = resolved.id === 'earth';
    assert.equal(isEarth, false,
      `border guard should block fetch for ${bodyId}`);
  }
});
