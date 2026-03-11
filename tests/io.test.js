import test from 'node:test';
import assert from 'node:assert/strict';

import { createEmptyScene } from '../src/scene/schema.js';
import { exportSceneToJSON, importSceneFromJSON } from '../src/io/json.js';
import { exportSceneToGeoJSON, importGeoJSONToScene } from '../src/io/geojson.js';
import { exportSceneToOBJ } from '../src/io/obj.js';

test('JSON import/export roundtrip keeps marker IDs', () => {
  const scene = createEmptyScene();
  scene.markers.push({ id: 'm1', lat: 1, lon: 2 });

  const text = exportSceneToJSON(scene);
  const parsed = importSceneFromJSON(text);

  assert.equal(parsed.markers[0].id, 'm1');
});

test('GeoJSON export includes marker points and regions', () => {
  const scene = createEmptyScene();
  scene.markers.push({ id: 'm1', lat: 47.3, lon: 8.5, alt: 0.1 });
  scene.regions.push({
    id: 'r1',
    geojson: {
      type: 'Polygon',
      coordinates: [[[8, 47], [9, 47], [9, 48], [8, 47]]],
    },
  });

  const geojson = exportSceneToGeoJSON(scene);

  assert.equal(geojson.type, 'FeatureCollection');
  assert.equal(geojson.features.length, 2);
});

test('GeoJSON import maps point features to markers', () => {
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: 'm2', name: 'Marker 2' },
        geometry: { type: 'Point', coordinates: [10, 20, 0.3] },
      },
    ],
  };

  const scene = importGeoJSONToScene(geojson);

  assert.equal(scene.markers.length, 1);
  assert.equal(scene.markers[0].id, 'm2');
  assert.equal(scene.markers[0].lat, 20);
});

test('OBJ export produces vertex and line records', () => {
  const scene = createEmptyScene();
  scene.markers.push({ id: 'm1', lat: 0, lon: 0, alt: 0.1 });
  scene.paths.push({
    id: 'p1',
    points: [{ lat: 0, lon: 0, alt: 0 }, { lat: 0, lon: 10, alt: 0 }],
  });

  const obj = exportSceneToOBJ(scene);

  assert.ok(obj.includes('v '));
  assert.ok(obj.includes('l '));
});
