// tests/flat-map-renderer.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

test('FlatMapRenderer – exports a class', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  assert.equal(typeof FlatMapRenderer, 'function');
});

test('FlatMapRenderer – has required public API methods', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const methods = [
    'init', 'renderScene', 'flyTo', 'panBy', 'zoomBy',
    'screenToLatLon', 'hitTest', 'projectPointToClient',
    'filterMarkers', 'filterCallouts', 'getCameraState',
    'resize', 'destroy', 'pauseIdleRotation', 'resumeIdleRotation',
  ];
  const renderer = new FlatMapRenderer();
  for (const m of methods) {
    assert.equal(typeof renderer[m], 'function', `missing method: ${m}`);
  }
});

test('FlatMapRenderer – getCameraState returns defaults', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  const state = renderer.getCameraState();
  assert.equal(state.centerLat, 0);
  assert.equal(state.centerLon, 0);
  assert.equal(state.zoom, 1);
});

test('FlatMapRenderer – panBy updates center', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.panBy(10, 5);
  const state = renderer.getCameraState();
  assert.equal(state.centerLon, 10);
  assert.equal(state.centerLat, 5);
});

test('FlatMapRenderer – zoomBy clamps to range', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.zoomBy(100);
  assert.ok(renderer.getCameraState().zoom <= 4);
  renderer.zoomBy(-100);
  assert.ok(renderer.getCameraState().zoom >= 0.3);
});

test('FlatMapRenderer – flyTo sets center and zoom', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.flyTo({ lat: 45, lon: -90, zoom: 2 });
  const state = renderer.getCameraState();
  assert.equal(state.centerLat, 45);
  assert.equal(state.centerLon, -90);
  assert.equal(state.zoom, 2);
});

test('FlatMapRenderer – pauseIdleRotation is no-op', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  assert.doesNotThrow(() => renderer.pauseIdleRotation());
  assert.doesNotThrow(() => renderer.resumeIdleRotation());
});
