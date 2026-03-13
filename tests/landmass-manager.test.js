import test from 'node:test';
import assert from 'node:assert/strict';
import { LandmassManager } from '../src/renderer/landmassManager.js';
import { Group } from 'three';

const SIMPLE_GEOJSON = {
  features: [{
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    },
  }],
};

const MULTI_GEOJSON = {
  features: [{
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
        [[[20, 20], [25, 20], [25, 25], [20, 25], [20, 20]]],
      ],
    },
  }],
};

test('LandmassManager creates meshes for polygon features', () => {
  const manager = new LandmassManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { color: 'rgba(200, 200, 200, 0.35)' });
  assert.ok(group.children.length >= 1, 'should create at least one mesh');
  assert.equal(group.children[0].userData.kind, 'landmass');
});

test('LandmassManager creates meshes for MultiPolygon features', () => {
  const manager = new LandmassManager();
  const group = new Group();
  manager.update(group, MULTI_GEOJSON, { color: 'rgba(200, 200, 200, 0.35)' });
  assert.ok(group.children.length >= 2, 'should create meshes for each polygon');
});

test('LandmassManager does nothing when color is null', () => {
  const manager = new LandmassManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { color: null });
  assert.equal(group.children.length, 0);
});

test('LandmassManager does nothing when geojson is null', () => {
  const manager = new LandmassManager();
  const group = new Group();
  manager.update(group, null, { color: 'rgba(200, 200, 200, 0.35)' });
  assert.equal(group.children.length, 0);
});

test('LandmassManager clears previous meshes on update', () => {
  const manager = new LandmassManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { color: 'rgba(200, 200, 200, 0.35)' });
  assert.ok(group.children.length >= 1);
  manager.update(group, SIMPLE_GEOJSON, { color: null });
  assert.equal(group.children.length, 0);
});

test('LandmassManager parses rgba opacity correctly', () => {
  const manager = new LandmassManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { color: 'rgba(200, 200, 200, 0.35)' });
  const mesh = group.children[0];
  assert.equal(mesh.material.opacity, 0.35);
  assert.equal(mesh.material.transparent, true);
});

test('LandmassManager disposes cleanly', () => {
  const manager = new LandmassManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { color: 'rgba(200, 200, 200, 0.35)' });
  assert.ok(group.children.length >= 1);
  manager.dispose();
  assert.equal(group.children.length, 0);
});
