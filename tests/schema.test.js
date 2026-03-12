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

test('createEmptyScene includes empty dataSources array', () => {
  const scene = createEmptyScene();
  assert.deepEqual(scene.dataSources, []);
});

test('normalizeScene defaults dataSources to empty array', () => {
  const scene = normalizeScene({});
  assert.deepEqual(scene.dataSources, []);
});

test('normalizeScene normalizes dataSources entries', () => {
  const scene = normalizeScene({
    dataSources: [
      { id: 'src-1', name: 'Source One', shortName: 'S1', url: 'https://example.com' },
      { id: 'src-2', name: 'Source Two', shortName: 'S2', url: 'https://example.org', description: 'Desc', license: 'MIT' },
    ],
  });
  assert.equal(scene.dataSources.length, 2);
  assert.equal(scene.dataSources[0].id, 'src-1');
  assert.equal(scene.dataSources[0].description, '');
  assert.equal(scene.dataSources[0].license, '');
  assert.equal(scene.dataSources[1].description, 'Desc');
  assert.equal(scene.dataSources[1].license, 'MIT');
});

test('normalizeScene adds sourceId to markers, paths, arcs, regions', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', name: 'M', lat: 0, lon: 0, sourceId: 'src-1' }],
    paths: [{ id: 'p1', name: 'P', points: [{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }] }],
    arcs: [{ id: 'a1', name: 'A', start: { lat: 0, lon: 0 }, end: { lat: 1, lon: 1 }, sourceId: 'src-2' }],
    regions: [{ id: 'r1', name: 'R', geojson: { type: 'Polygon', coordinates: [] } }],
  });
  assert.equal(scene.markers[0].sourceId, 'src-1');
  assert.equal(scene.paths[0].sourceId, '');
  assert.equal(scene.arcs[0].sourceId, 'src-2');
  assert.equal(scene.regions[0].sourceId, '');
});

test('validateScene accepts valid dataSources', () => {
  const scene = createEmptyScene();
  scene.dataSources = [
    { id: 'src-1', name: 'Source', shortName: 'S', url: 'https://x.com' },
  ];
  scene.markers = [{ id: 'm1', name: { en: 'M' }, description: { en: '' }, lat: 0, lon: 0, sourceId: 'src-1' }];
  const result = validateScene(scene);
  assert.equal(result.valid, true);
});

test('validateScene reports duplicate dataSources ids', () => {
  const scene = createEmptyScene();
  scene.dataSources = [
    { id: 'dup', name: 'A', shortName: 'A', url: 'https://a.com' },
    { id: 'dup', name: 'B', shortName: 'B', url: 'https://b.com' },
  ];
  const result = validateScene(scene);
  assert.ok(result.errors.some((e) => e.includes('duplicate')));
});

test('validateScene reports missing dataSources name', () => {
  const scene = createEmptyScene();
  scene.dataSources = [
    { id: 'src-1', name: '', shortName: 'S', url: 'https://x.com' },
  ];
  const result = validateScene(scene);
  assert.ok(result.errors.some((e) => e.includes('name')));
});

test('validateScene warns on unresolved sourceId', () => {
  const scene = createEmptyScene();
  scene.dataSources = [
    { id: 'src-1', name: 'Source', shortName: 'S', url: 'https://x.com' },
  ];
  scene.markers = [{ id: 'm1', name: { en: 'M' }, description: { en: '' }, lat: 0, lon: 0, sourceId: 'unknown' }];
  const result = validateScene(scene);
  assert.ok(result.errors.some((e) => e.includes('sourceId')));
});

test('normalizeScene – defaults projection to globe', () => {
  const scene = normalizeScene({});
  assert.equal(scene.projection, 'globe');
});

test('normalizeScene – preserves valid projection', () => {
  const scene = normalizeScene({ projection: 'azimuthalEquidistant' });
  assert.equal(scene.projection, 'azimuthalEquidistant');
});

test('normalizeScene – unknown projection normalizes to globe', () => {
  const scene = normalizeScene({ projection: 'mercator' });
  assert.equal(scene.projection, 'globe');
});

test('validateScene – rejects unknown projection with error', () => {
  const { valid, errors } = validateScene({ projection: 'mercator' });
  assert.ok(errors.some(e => e.includes('projection')));
});

test('validateScene – accepts all valid projections', () => {
  for (const p of ['globe', 'azimuthalEquidistant', 'orthographic', 'equirectangular']) {
    const { errors } = validateScene({ projection: p });
    const projErrors = errors.filter(e => e.includes('projection'));
    assert.equal(projErrors.length, 0, `projection '${p}' should be valid`);
  }
});
