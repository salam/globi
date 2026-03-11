import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreeGlobeRenderer } from '../src/renderer/threeGlobeRenderer.js';

test('ThreeGlobeRenderer exports the expected public API', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.equal(typeof renderer.init, 'function');
  assert.equal(typeof renderer.renderScene, 'function');
  assert.equal(typeof renderer.flyTo, 'function');
  assert.equal(typeof renderer.panBy, 'function');
  assert.equal(typeof renderer.zoomBy, 'function');
  assert.equal(typeof renderer.hitTest, 'function');
  assert.equal(typeof renderer.projectPointToClient, 'function');
  assert.equal(typeof renderer.getCameraState, 'function');
  assert.equal(typeof renderer.resize, 'function');
  assert.equal(typeof renderer.destroy, 'function');
});

test('getCameraState returns default center and zoom', () => {
  const renderer = new ThreeGlobeRenderer();
  const state = renderer.getCameraState();
  assert.equal(typeof state.centerLon, 'number');
  assert.equal(typeof state.centerLat, 'number');
  assert.equal(typeof state.zoom, 'number');
  assert.equal(state.zoom, 1);
});

test('panBy changes camera state', () => {
  const renderer = new ThreeGlobeRenderer();
  const before = renderer.getCameraState();
  renderer.panBy(10, 5);
  const after = renderer.getCameraState();
  assert.notEqual(before.centerLon, after.centerLon);
});

test('zoomBy clamps within range', () => {
  const renderer = new ThreeGlobeRenderer();
  renderer.zoomBy(100);
  assert.ok(renderer.getCameraState().zoom <= 4);
  renderer.zoomBy(-100);
  assert.ok(renderer.getCameraState().zoom >= 0.3);
});

test('flyTo sets camera to target coordinates', () => {
  const renderer = new ThreeGlobeRenderer();
  renderer.flyTo({ lat: 47.37, lon: 8.54 }, { zoom: 2 });
  const state = renderer.getCameraState();
  assert.ok(Math.abs(state.centerLat - 47.37) < 1);
  assert.ok(Math.abs(state.centerLon - 8.54) < 1);
  assert.equal(state.zoom, 2);
});

test('destroy is callable without init', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.doesNotThrow(() => renderer.destroy());
});
