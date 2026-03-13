import test from 'node:test';
import assert from 'node:assert/strict';
import { RegionManager } from '../src/renderer/regionManager.js';
import { Group } from 'three';

test('RegionManager creates mesh for polygon region', () => {
  const manager = new RegionManager();
  const group = new Group();
  manager.update(group, [{
    id: 'r1',
    geojson: {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    },
    capColor: '#ff0000',
    sideColor: '#cc0000',
    altitude: 0,
  }]);
  assert.ok(group.children.length >= 1);
});

test('RegionManager creates mesh for MultiPolygon', () => {
  const manager = new RegionManager();
  const group = new Group();
  manager.update(group, [{
    id: 'r1',
    geojson: {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
        [[[10, 10], [15, 10], [15, 15], [10, 15], [10, 10]]],
      ],
    },
    capColor: '#00ff00',
    altitude: 0,
  }]);
  assert.ok(group.children.length >= 2);
});

test('RegionManager clears on update', () => {
  const manager = new RegionManager();
  const group = new Group();
  manager.update(group, [{
    id: 'r1',
    geojson: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] },
  }]);
  const before = group.children.length;
  manager.update(group, []);
  assert.equal(group.children.length, 0);
});

// BUG19 – rgba() capColor passed to THREE.Color triggers alpha warning
test('RegionManager handles rgba capColor without THREE.Color warnings', () => {
  const manager = new RegionManager();
  const group = new Group();
  manager.update(group, [{
    id: 'r1',
    geojson: { type: 'Polygon', coordinates: [[[0,0],[5,0],[5,5],[0,5],[0,0]]] },
    capColor: 'rgba(72, 124, 88, 0.28)',
  }]);
  const mesh = group.children[0];
  // Color should be rgb only, no alpha component
  assert.ok(mesh.material.color);
  assert.equal(mesh.material.opacity, 0.28);
  // The color string should NOT contain 'a' (rgba) — verify it was stripped
  const hex = '#' + mesh.material.color.getHexString();
  assert.ok(!hex.includes('NaN'), 'color should be a valid hex');
});

test('RegionManager disposes cleanly', () => {
  const manager = new RegionManager();
  const group = new Group();
  manager.update(group, [{
    id: 'r1',
    geojson: { type: 'Polygon', coordinates: [[[0,0],[5,0],[5,5],[0,5],[0,0]]] },
  }]);
  manager.dispose();
  assert.equal(group.children.length, 0);
});
