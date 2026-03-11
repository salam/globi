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

test('all presets have obliquity, orbitalPeriod, siderealRotation', () => {
  const presets = listCelestialPresets();
  for (const p of presets) {
    assert.ok(typeof p.obliquity === 'number', `${p.id} missing obliquity`);
    assert.ok(Number.isFinite(p.obliquity), `${p.id} obliquity not finite`);
    assert.ok(p.obliquity >= 0 && p.obliquity <= 360, `${p.id} obliquity out of range`);

    assert.ok(typeof p.orbitalPeriod === 'number', `${p.id} missing orbitalPeriod`);
    assert.ok(p.orbitalPeriod > 0, `${p.id} orbitalPeriod must be > 0`);

    assert.ok(typeof p.siderealRotation === 'number', `${p.id} missing siderealRotation`);
    assert.ok(p.siderealRotation !== 0, `${p.id} siderealRotation must not be 0`);
  }
});

test('atmosphere config is correct per body', () => {
  const withAtmo = ['venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'titan'];
  const withoutAtmo = ['mercury', 'moon', 'io', 'europa', 'ganymede'];

  for (const id of withAtmo) {
    const p = getCelestialPreset(id);
    assert.ok(p.atmosphere !== null, `${id} should have atmosphere`);
    assert.ok(p.atmosphere.enabled === true, `${id} atmosphere should be enabled`);
    assert.ok(p.atmosphere.scaleHeight > 0, `${id} missing scaleHeight`);
    assert.ok(typeof p.atmosphere.scatterColor === 'string', `${id} missing scatterColor`);
    assert.ok(p.atmosphere.thickness > 0, `${id} missing thickness`);
    assert.ok(p.atmosphere.density >= 0 && p.atmosphere.density <= 1, `${id} density out of range`);
  }

  for (const id of withoutAtmo) {
    const p = getCelestialPreset(id);
    assert.ok(p.atmosphere === null, `${id} should have no atmosphere`);
  }
});

test('ring config is correct per body', () => {
  const withRings = ['jupiter', 'saturn', 'uranus', 'neptune'];
  const withoutRings = ['mercury', 'venus', 'earth', 'mars', 'moon', 'io', 'europa', 'ganymede', 'titan'];

  for (const id of withRings) {
    const p = getCelestialPreset(id);
    assert.ok(p.rings !== null, `${id} should have rings`);
    assert.ok(p.rings.innerRadius < p.rings.outerRadius, `${id} ring inner < outer`);
    assert.ok(p.rings.opacity > 0 && p.rings.opacity <= 1, `${id} ring opacity`);
    assert.ok(typeof p.rings.color === 'string', `${id} ring color`);
  }

  for (const id of withoutRings) {
    const p = getCelestialPreset(id);
    assert.ok(p.rings === null, `${id} should have no rings`);
  }
});

test('saturn has ring textureUri, other ring bodies do not', () => {
  const saturn = getCelestialPreset('saturn');
  assert.ok(saturn.rings.textureUri.length > 0);

  for (const id of ['jupiter', 'uranus', 'neptune']) {
    const p = getCelestialPreset(id);
    assert.equal(p.rings.textureUri, '');
  }
});

test('moon presets have parentId linking to their parent planet', () => {
  assert.equal(getCelestialPreset('moon').parentId, 'earth');
  assert.equal(getCelestialPreset('io').parentId, 'jupiter');
  assert.equal(getCelestialPreset('europa').parentId, 'jupiter');
  assert.equal(getCelestialPreset('ganymede').parentId, 'jupiter');
  assert.equal(getCelestialPreset('titan').parentId, 'saturn');
});

test('resolvePlanetConfig merges atmosphere override (shallow merge)', () => {
  const planet = resolvePlanetConfig({ id: 'earth', atmosphere: { scatterColor: '#ff0000' } });
  assert.equal(planet.atmosphere.scatterColor, '#ff0000');
  // Other atmosphere fields preserved from preset
  assert.equal(planet.atmosphere.scaleHeight, 8.5);
  assert.equal(planet.atmosphere.enabled, true);
});

test('resolvePlanetConfig custom body gets default orbital values', () => {
  const planet = resolvePlanetConfig({ id: 'custom-world', baseColor: '#ff0000' });
  assert.equal(planet.obliquity, 0);
  assert.equal(planet.orbitalPeriod, 365.256);
  assert.equal(planet.siderealRotation, 24);
  assert.equal(planet.atmosphere, null);
  assert.equal(planet.rings, null);
});

test('resolvePlanetConfig preserves rings override', () => {
  const planet = resolvePlanetConfig({ id: 'saturn', rings: { opacity: 0.5 } });
  assert.equal(planet.rings.opacity, 0.5);
  assert.equal(planet.rings.innerRadius, 1.24);
});
