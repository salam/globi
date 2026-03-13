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
  assert.equal(typeof renderer.screenToLatLon, 'function');
  assert.equal(typeof renderer.pauseIdleRotation, 'function');
  assert.equal(typeof renderer.resumeIdleRotation, 'function');
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
  // ZOOM_MAX ≈ 2.727 — camera must not penetrate the surface
  assert.ok(renderer.getCameraState().zoom <= 2.8);
  renderer.zoomBy(-100);
  assert.ok(renderer.getCameraState().zoom >= 0.3);
});

// BUG11 — camera must not zoom through the planetary surface
test('zoom cannot push camera inside the globe surface', () => {
  const renderer = new ThreeGlobeRenderer();
  // Try to zoom in as far as possible
  renderer.zoomBy(100);
  const state = renderer.getCameraState();
  // Camera distance = 3 / zoom; must stay >= 1.1 (outside atmosphere)
  const cameraDistance = 3 / state.zoom;
  assert.ok(cameraDistance >= 1.1,
    `camera distance ${cameraDistance.toFixed(3)} must be >= 1.1 (outside surface)`);
});

test('flyTo zoom is clamped to surface limit', () => {
  const renderer = new ThreeGlobeRenderer();
  renderer.flyTo({ lat: 0, lon: 0 }, { zoom: 10 });
  const state = renderer.getCameraState();
  const cameraDistance = 3 / state.zoom;
  assert.ok(cameraDistance >= 1.1,
    `flyTo camera distance ${cameraDistance.toFixed(3)} must be >= 1.1`);
});

test('flyTo sets camera to target coordinates', () => {
  const renderer = new ThreeGlobeRenderer();
  renderer.flyTo({ lat: 47.37, lon: 8.54 }, { zoom: 2 });
  const state = renderer.getCameraState();
  assert.ok(Math.abs(state.centerLat - 47.37) < 1);
  assert.ok(Math.abs(state.centerLon - 8.54) < 1);
  assert.equal(state.zoom, 2);
});

test('screenToLatLon is a function on the renderer', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.equal(typeof renderer.screenToLatLon, 'function');
});

test('screenToLatLon returns null when renderer is not initialized', () => {
  const renderer = new ThreeGlobeRenderer();
  const result = renderer.screenToLatLon(100, 200);
  assert.equal(result, null);
});

test('destroy is callable without init', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.doesNotThrow(() => renderer.destroy());
});

test('pauseIdleRotation and resumeIdleRotation are functions', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.equal(typeof renderer.pauseIdleRotation, 'function');
  assert.equal(typeof renderer.resumeIdleRotation, 'function');
});

// BUG28 — verify getThemePalette returns correct properties for each theme
test('getThemePalette returns correct useTextures for each theme', async () => {
  const { getThemePalette } = await import('../src/renderer/themePalette.js');
  const photo = getThemePalette('photo');
  const wireframe = getThemePalette('wireframe-shaded');
  const grayscale = getThemePalette('grayscale-flat');

  assert.equal(photo.useTextures, true, 'photo should use textures');
  assert.equal(wireframe.useTextures, false, 'wireframe should not use textures');
  assert.equal(grayscale.useTextures, true, 'grayscale should use textures');
  assert.equal(grayscale.desaturate, 1.0, 'grayscale should have desaturate=1');
  assert.equal(grayscale.flatLighting, true, 'grayscale-flat should have flatLighting=true');
  assert.equal(photo.background, 0x020b18, 'photo background should be dark');
  assert.equal(wireframe.background, 0xffffff, 'wireframe background should be white');
});
