import test from 'node:test';
import assert from 'node:assert/strict';

import { SceneStore } from '../src/scene/store.js';
import { createEmptyScene } from '../src/scene/schema.js';
import { getCelestialPreset } from '../src/scene/celestial.js';

test('SceneStore emits sceneChange events on writes', () => {
  const store = new SceneStore(createEmptyScene());
  let seen = 0;

  store.on('sceneChange', () => {
    seen += 1;
  });

  store.setMarkers([{ id: 'zrh', lat: 47.3769, lon: 8.5417 }]);
  store.setPaths([{ id: 'p1', points: [{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }] }]);

  assert.equal(seen, 2);
  assert.equal(store.getScene().markers.length, 1);
  assert.equal(store.getScene().paths.length, 1);
});

test('SceneStore upsertMarker replaces existing marker', () => {
  const store = new SceneStore(createEmptyScene());
  store.upsertMarker({ id: 'id-1', lat: 1, lon: 1 });
  store.upsertMarker({ id: 'id-1', lat: 2, lon: 3 });

  const marker = store.getScene().markers[0];
  assert.equal(store.getScene().markers.length, 1);
  assert.equal(marker.lat, 2);
  assert.equal(marker.lon, 3);
});

test('SceneStore setPlanet by id applies preset defaults', () => {
  const store = new SceneStore(createEmptyScene());
  store.setPlanet({ id: 'mars' });

  const scene = store.getScene();
  const mars = getCelestialPreset('mars');

  assert.equal(scene.planet.id, 'mars');
  assert.equal(scene.planet.label, mars.label);
  assert.equal(scene.planet.radius, mars.radius);
});

test('SceneStore auto-assigns color-blind-safe colors to unspecified dot markers', () => {
  const store = new SceneStore(createEmptyScene());

  store.setMarkers([
    { id: 'm1', visualType: 'dot', lat: 0, lon: 0 },
    { id: 'm2', visualType: 'dot', lat: 1, lon: 1 },
    { id: 'm3', visualType: 'model', lat: 2, lon: 2 },
    { id: 'm4', visualType: 'dot', lat: 3, lon: 3 },
  ]);

  const [m1, m2, m3, m4] = store.getScene().markers;
  assert.equal(m1.color, '#0072B2');
  assert.equal(m2.color, '#E69F00');
  assert.equal(m3.color, '');
  assert.equal(m4.color, '#009E73');
});
