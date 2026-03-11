import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CELESTIAL_PRESET_IDS,
  listCelestialPresets,
  getCelestialPreset,
  isCelestialPresetId,
  resolvePlanetConfig,
} from '../src/scene/celestial.js';

const EXPECTED_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'moon',
  'io',
  'europa',
  'ganymede',
  'titan',
];

test('listCelestialPresets returns planets and popular moons', () => {
  const presets = listCelestialPresets();
  const ids = presets.map((entry) => entry.id);

  assert.deepEqual(ids, EXPECTED_IDS);
  assert.equal(presets.length, 13);
});

test('getCelestialPreset returns earth by default and resolves labels', () => {
  const earth = getCelestialPreset('earth');
  const fallback = getCelestialPreset();

  assert.equal(earth.id, 'earth');
  assert.equal(earth.label, 'Earth');
  assert.equal(earth.lightingMode, 'fixed');
  assert.equal(fallback.id, 'earth');
});

test('isCelestialPresetId returns true only for supported ids', () => {
  assert.equal(isCelestialPresetId('mars'), true);
  assert.equal(isCelestialPresetId('unknown-world'), false);
  assert.ok(CELESTIAL_PRESET_IDS.includes('moon'));
});

test('resolvePlanetConfig defaults showBorders and showLabels to true', () => {
  const earth = resolvePlanetConfig('earth');
  assert.equal(earth.showBorders, true);
  assert.equal(earth.showLabels, true);

  const custom = resolvePlanetConfig({ id: 'myplanet' });
  assert.equal(custom.showBorders, true);
  assert.equal(custom.showLabels, true);
});

test('resolvePlanetConfig preserves explicit showBorders/showLabels false', () => {
  const planet = resolvePlanetConfig({ id: 'earth', showBorders: false, showLabels: false });
  assert.equal(planet.showBorders, false);
  assert.equal(planet.showLabels, false);
});
