import test from 'node:test';
import assert from 'node:assert/strict';

import { ThreeGlobeRenderer } from '../src/renderer/threeGlobeRenderer.js';

test('ThreeGlobeRenderer has same public API as old CanvasGlobeRenderer', () => {
  const renderer = new ThreeGlobeRenderer();
  const methods = ['init', 'renderScene', 'flyTo', 'panBy', 'zoomBy', 'hitTest',
    'projectPointToClient', 'getCameraState', 'resize', 'destroy'];
  for (const method of methods) {
    assert.equal(typeof renderer[method], 'function', `missing method: ${method}`);
  }
});

test('ThreeGlobeRenderer getCameraState returns default state', () => {
  const renderer = new ThreeGlobeRenderer();
  const state = renderer.getCameraState();
  assert.equal(state.centerLon, 0);
  assert.equal(state.centerLat, 0);
  assert.equal(state.zoom, 1);
});

test('ThreeGlobeRenderer flyTo + getCameraState round-trip', () => {
  const renderer = new ThreeGlobeRenderer();
  renderer.flyTo({ lat: 47.37, lon: 8.54 }, { zoom: 2 });
  const state = renderer.getCameraState();
  assert.ok(Math.abs(state.centerLat - 47.37) < 1);
  assert.ok(Math.abs(state.centerLon - 8.54) < 1);
  assert.equal(state.zoom, 2);
});

test('ThreeGlobeRenderer destroy without init does not throw', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.doesNotThrow(() => renderer.destroy());
});
