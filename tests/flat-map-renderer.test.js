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
  assert.ok(renderer.getCameraState().zoom <= 100);
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

test('FlatMapRenderer – flyTo then getCameraState round-trips', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.flyTo({ lat: 30, lon: 60, zoom: 2 });
  const state = renderer.getCameraState();
  assert.equal(state.centerLat, 30);
  assert.equal(state.centerLon, 60);
  assert.equal(state.zoom, 2);
});

test('FlatMapRenderer – panBy wraps longitude', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.flyTo({ lat: 0, lon: 170, zoom: 1 });
  renderer.panBy(20, 0);
  const state = renderer.getCameraState();
  assert.ok(state.centerLon >= -180 && state.centerLon <= 180,
    `lon should be in [-180,180], got ${state.centerLon}`);
});

test('FlatMapRenderer – panBy clamps latitude', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.panBy(0, 100);
  assert.ok(renderer.getCameraState().centerLat < 90,
    'lat should be clamped below 90');
});

test('FlatMapRenderer – setProjection and getProjectionName', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  assert.equal(renderer.getProjectionName(), 'azimuthalEquidistant');
  renderer.setProjection('orthographic');
  assert.equal(renderer.getProjectionName(), 'orthographic');
  renderer.setProjection('equirectangular');
  assert.equal(renderer.getProjectionName(), 'equirectangular');
});

test('FlatMapRenderer – filterMarkers stores predicate', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  const pred = (m) => m.id === 'test';
  assert.doesNotThrow(() => renderer.filterMarkers(pred));
});

// BUG21 – filterMarkers receives ID array from GlobeController, not a predicate.
// The crash happens during render when #markerFilter is called as a function.
// zoomBy triggers #render → #renderMarkers which calls #markerFilter(marker).
test('FlatMapRenderer – filterMarkers accepts array of IDs without crash on zoom', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  // GlobeController passes an array of marker IDs (or null to clear)
  renderer.filterMarkers(['marker-1', 'marker-2']);
  // zoomBy triggers #render → #renderMarkers which would crash pre-fix
  assert.doesNotThrow(() => renderer.zoomBy(0.1));
  // null clears the filter
  renderer.filterMarkers(null);
  assert.doesNotThrow(() => renderer.zoomBy(0.1));
});

// BUG21 – filterCallouts has the same mismatch
test('FlatMapRenderer – filterCallouts accepts array of IDs without crash on zoom', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.filterCallouts(['callout-a']);
  assert.doesNotThrow(() => renderer.zoomBy(0.1));
  renderer.filterCallouts(null);
  assert.doesNotThrow(() => renderer.zoomBy(0.1));
});

test('FlatMapRenderer – destroy does not throw without init', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  assert.doesNotThrow(() => renderer.destroy());
});

// BUG27 – FlatMapTextureProjector allocates full-size OffscreenCanvas on every
// project() call during animation, causing ~4GB/s allocation pressure and tab crash.
// Repeated project() calls with the same view key must NOT create new refinement
// buffers if a refinement is already in progress for that view.
test('FlatMapTextureProjector – repeated project() calls with same view reuse refinement', async () => {
  // Mock OffscreenCanvas and requestAnimationFrame for Node.js
  let offscreenAllocations = 0;
  const origOC = globalThis.OffscreenCanvas;
  const origRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 0; // no-op (don't run refinement chunks)
  globalThis.OffscreenCanvas = class {
    constructor(w, h) { this.width = w; this.height = h; offscreenAllocations++; }
    getContext() {
      return {
        drawImage() {},
        getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
        createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
        putImageData() {},
      };
    }
  };

  const { FlatMapTextureProjector } = await import('../src/renderer/flatMapTextureProjector.js');
  const projector = new FlatMapTextureProjector();

  const projection = {
    inverse(x, y, cLat, cLon) {
      const lat = cLat + y * (180 / Math.PI);
      if (lat > 90 || lat < -90) return null;
      return { lat, lon: cLon + x * (180 / Math.PI) };
    },
  };
  const texture = { width: 32, height: 16 };
  const ctx = { drawImage() {}, imageSmoothingEnabled: true };
  const w = 200, h = 100;
  const pixToProj = (px, py) => ({ x: (px - 100) / 50, y: -(py - 50) / 50 });

  // First call — allocates texture read canvas + lo-res + hi-res refinement
  offscreenAllocations = 0;
  projector.project(ctx, texture, projection, 'equirectangular', 0, 0, w, h,
    () => ({}), pixToProj, false, null);
  const firstCallAllocs = offscreenAllocations;
  assert.ok(firstCallAllocs >= 2, `first call should allocate >=2 OffscreenCanvases, got ${firstCallAllocs}`);

  // Subsequent calls with same view key — should NOT allocate new refinement buffers
  offscreenAllocations = 0;
  for (let i = 0; i < 10; i++) {
    projector.project(ctx, texture, projection, 'equirectangular', 0, 0, w, h,
      () => ({}), pixToProj, false, null);
  }
  assert.ok(offscreenAllocations <= 1,
    `BUG27: repeated project() with same view allocated ${offscreenAllocations} OffscreenCanvases, expected <=1`);

  globalThis.OffscreenCanvas = origOC;
  globalThis.requestAnimationFrame = origRAF;
  projector.destroy();
});
