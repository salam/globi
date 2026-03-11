import test from 'node:test';
import assert from 'node:assert/strict';
import { BorderManager } from '../src/renderer/borderManager.js';
import { Group } from 'three';

const SIMPLE_GEOJSON = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    },
  }],
};

const MULTI_GEOJSON = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
        [[[10, 10], [15, 10], [15, 15], [10, 15], [10, 10]]],
      ],
    },
  }],
};

test('BorderManager creates LineSegments from Polygon', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true });
  assert.ok(group.children.length >= 1);
  const child = group.children[0];
  assert.ok(child.geometry.attributes.position.count > 0);
});

test('BorderManager creates LineSegments from MultiPolygon', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, MULTI_GEOJSON, { show: true });
  assert.ok(group.children.length >= 1);
});

test('BorderManager toggles visibility without rebuilding', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true });
  const childCount = group.children.length;

  manager.update(group, SIMPLE_GEOJSON, { show: false });
  assert.equal(group.visible, false);
  assert.equal(group.children.length, childCount);

  manager.update(group, SIMPLE_GEOJSON, { show: true });
  assert.equal(group.visible, true);
});

test('BorderManager handles empty FeatureCollection', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, { type: 'FeatureCollection', features: [] }, { show: true });
  assert.equal(group.children.length, 0);
});

test('BorderManager handles null geojson gracefully', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, null, { show: true });
  assert.equal(group.children.length, 0);
});

test('BorderManager dispose clears geometry', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true });
  manager.dispose();
  assert.equal(group.children.length, 0);
});
