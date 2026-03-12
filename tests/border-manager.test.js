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

test('BorderManager accepts custom color and opacity', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true, color: 0x222222, opacity: 1.0 });
  const child = group.children[0];
  assert.equal(child.material.color.getHex(), 0x222222);
  assert.equal(child.material.opacity, 1.0);
});

test('BorderManager defaults to white 0.35 opacity when no color/opacity given', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true });
  const child = group.children[0];
  assert.equal(child.material.color.getHex(), 0xffffff);
  assert.equal(child.material.opacity, 0.35);
});

test('BorderManager updates material when color changes after build', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true, color: 0xffffff, opacity: 0.35 });
  assert.equal(group.children[0].material.color.getHex(), 0xffffff);
  manager.update(group, SIMPLE_GEOJSON, { show: true, color: 0x222222, opacity: 1.0 });
  assert.equal(group.children[0].material.color.getHex(), 0x222222);
  assert.equal(group.children[0].material.opacity, 1.0);
});
