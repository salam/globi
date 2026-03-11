import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCENE_SCHEMA_VERSION,
  createEmptyScene,
  normalizeScene,
  validateScene,
} from '../src/scene/schema.js';
import { resolvePlanetConfig } from '../src/scene/celestial.js';

test('createEmptyScene creates a valid baseline scene', () => {
  const scene = createEmptyScene('de');
  const result = validateScene(scene);

  assert.equal(scene.version, SCENE_SCHEMA_VERSION);
  assert.equal(scene.locale, 'de');
  assert.equal(scene.theme, 'dark');
  assert.equal(scene.planet.id, 'earth');
  assert.equal(scene.planet.label, 'Earth');
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('normalizeScene applies earth defaults when planet data is missing', () => {
  const normalized = normalizeScene({});

  assert.equal(normalized.planet.id, 'earth');
  assert.equal(normalized.planet.label, 'Earth');
  assert.equal(normalized.planet.lightingMode, 'fixed');
  assert.equal(normalized.theme, 'dark');
  assert.ok(normalized.planet.radius > 0.9);
});

test('normalizeScene keeps valid sun lighting mode', () => {
  const normalized = normalizeScene({
    planet: {
      id: 'earth',
      lightingMode: 'sun',
    },
  });

  assert.equal(normalized.planet.lightingMode, 'sun');
});

test('normalizeScene migrates legacy shape and keeps schema valid', () => {
  const legacy = {
    planet: { id: 'earth' },
    markers: [{ id: 'm-1', name: 'Zurich', lat: 47.3769, lon: 8.5417 }],
  };

  const normalized = normalizeScene(legacy);
  const result = validateScene(normalized);

  assert.equal(normalized.version, SCENE_SCHEMA_VERSION);
  assert.equal(typeof normalized.markers[0].name, 'object');
  assert.equal(normalized.markers[0].name.en, 'Zurich');
  assert.equal(result.valid, true);
});

test('validateScene reports coordinate and duplicate id violations', () => {
  const scene = createEmptyScene();
  scene.markers.push(
    { id: 'dup', lat: 100, lon: 8 },
    { id: 'dup', lat: 47, lon: 200 }
  );

  const result = validateScene(scene);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('lat')));
  assert.ok(result.errors.some((e) => e.includes('lon')));
  assert.ok(result.errors.some((e) => e.includes('duplicate')));
});

test('normalizeScene falls back to fixed for unsupported planet lighting modes', () => {
  const normalized = normalizeScene({
    planet: {
      id: 'earth',
      lightingMode: 'unknown',
    },
  });

  assert.equal(normalized.planet.lightingMode, 'fixed');
});

test('normalizeScene applies default viewerUi settings', () => {
  const normalized = normalizeScene({});

  assert.equal(normalized.viewerUi.controlStyle, 'text');
  assert.equal(normalized.viewerUi.showBodySelector, true);
  assert.equal(normalized.viewerUi.showFullscreenButton, true);
  assert.equal(normalized.viewerUi.showLegendButton, true);
  assert.equal(normalized.viewerUi.showInspectButton, true);
  assert.equal(normalized.viewerUi.showCompass, true);
  assert.equal(normalized.viewerUi.showScale, true);
});

test('validateScene rejects invalid viewerUi values', () => {
  const scene = createEmptyScene();
  scene.viewerUi = {
    controlStyle: 'emoji',
    showBodySelector: 'yes',
  };

  const result = validateScene(scene);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('viewerUi.controlStyle')));
  assert.ok(result.errors.some((error) => error.includes('viewerUi.showBodySelector')));
});

test('normalizeScene defaults showBorders and showLabels to true', () => {
  const normalized = normalizeScene({});
  assert.equal(normalized.planet.showBorders, true);
  assert.equal(normalized.planet.showLabels, true);
});

test('validateScene accepts showBorders and showLabels booleans', () => {
  const scene = createEmptyScene();
  scene.planet.showBorders = false;
  scene.planet.showLabels = false;
  const result = validateScene(scene);
  assert.equal(result.valid, true);
});

test('validateScene accepts text markers as a valid visual type', () => {
  const scene = createEmptyScene();
  scene.markers.push({
    id: 'label-zurich',
    name: { en: 'Zurich' },
    description: { en: 'Text marker label' },
    lat: 47.3769,
    lon: 8.5417,
    alt: 0,
    visualType: 'text',
    color: '#ffffff',
  });

  const result = validateScene(scene);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validateScene rejects invalid obliquity', () => {
  const scene = createEmptyScene();
  scene.planet.obliquity = -10;
  const result = validateScene(scene);
  assert.ok(result.errors.some(e => e.includes('obliquity')));
});

test('validateScene rejects zero siderealRotation', () => {
  const scene = createEmptyScene();
  scene.planet.siderealRotation = 0;
  const result = validateScene(scene);
  assert.ok(result.errors.some(e => e.includes('siderealRotation')));
});

test('validateScene rejects rings with innerRadius >= outerRadius', () => {
  const scene = createEmptyScene();
  scene.planet.rings = { innerRadius: 3, outerRadius: 2, opacity: 0.5, color: '#fff', textureUri: '' };
  const result = validateScene(scene);
  assert.ok(result.errors.some(e => e.includes('rings')));
});

test('validateScene rejects atmosphere density > 1', () => {
  const scene = createEmptyScene();
  scene.planet.atmosphere = { enabled: true, scaleHeight: 8, surfacePressure: 1, scatterColor: '#fff', thickness: 0.06, density: 1.5 };
  const result = validateScene(scene);
  assert.ok(result.errors.some(e => e.includes('density')));
});

test('validateScene accepts valid planet with atmosphere and rings', () => {
  const scene = createEmptyScene();
  scene.planet = resolvePlanetConfig('saturn');
  const result = validateScene(scene);
  assert.equal(result.valid, true);
});
