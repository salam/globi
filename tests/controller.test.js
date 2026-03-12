import test from 'node:test';
import assert from 'node:assert/strict';

import { GlobeController } from '../src/controller/globeController.js';

class MockRenderer {
  constructor() {
    this.calls = [];
  }

  init() {
    this.calls.push(['init']);
  }

  renderScene(scene) {
    this.calls.push(['renderScene', scene.markers.length]);
  }

  flyTo(target, options) {
    this.calls.push(['flyTo', target, options]);
  }

  hitTest(clientX, clientY) {
    this.calls.push(['hitTest', clientX, clientY]);
    return { kind: 'marker', id: 'm1', entity: { id: 'm1' } };
  }

  projectPointToClient(point) {
    this.calls.push(['projectPointToClient', point]);
    return { clientX: 12, clientY: 24, visible: true };
  }

  getCameraState() {
    this.calls.push(['getCameraState']);
    return { centerLon: 2, centerLat: 1, zoom: 1.3 };
  }

  screenToLatLon(clientX, clientY) {
    this.calls.push(['screenToLatLon', clientX, clientY]);
    return { lat: 10, lon: 20 };
  }

  pauseIdleRotation() {
    this.calls.push(['pauseIdleRotation']);
  }

  resumeIdleRotation() {
    this.calls.push(['resumeIdleRotation']);
  }

  destroy() {
    this.calls.push(['destroy']);
  }
}

test('GlobeController renders on scene updates and proxies flyTo', () => {
  const renderer = new MockRenderer();
  const controller = new GlobeController({ renderer });

  controller.setMarkers([{ id: 'm1', lat: 0, lon: 0 }]);
  controller.flyTo({ lat: 1, lon: 2, alt: 0.3 }, { durationMs: 300 });
  const hit = controller.hitTest(10, 20);
  const projected = controller.projectPointToClient({ lat: 0, lon: 0, alt: 0 });
  const camera = controller.getCameraState();

  assert.ok(renderer.calls.some((call) => call[0] === 'renderScene'));
  assert.ok(renderer.calls.some((call) => call[0] === 'flyTo'));
  assert.ok(renderer.calls.some((call) => call[0] === 'getCameraState'));
  assert.equal(hit?.id, 'm1');
  assert.equal(projected?.clientX, 12);
  assert.equal(projected?.clientY, 24);
  assert.equal(camera?.centerLat, 1);
  assert.equal(camera?.centerLon, 2);
  assert.equal(camera?.zoom, 1.3);

  controller.destroy();
  assert.ok(renderer.calls.some((call) => call[0] === 'destroy'));
});

test('GlobeController proxies screenToLatLon to renderer', () => {
  const renderer = new MockRenderer();
  const controller = new GlobeController({ renderer });
  const result = controller.screenToLatLon(100, 200);
  assert.deepEqual(result, { lat: 10, lon: 20 });
  assert.ok(renderer.calls.some(c => c[0] === 'screenToLatLon'));
});

test('GlobeController proxies pauseIdleRotation and resumeIdleRotation', () => {
  const renderer = new MockRenderer();
  const controller = new GlobeController({ renderer });
  controller.pauseIdleRotation();
  controller.resumeIdleRotation();
  assert.ok(renderer.calls.some(c => c[0] === 'pauseIdleRotation'));
  assert.ok(renderer.calls.some(c => c[0] === 'resumeIdleRotation'));
});

test('controller – defaults to globe projection', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  assert.equal(controller.getProjection(), 'globe');
});

test('controller – getProjection reflects setProjection', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  controller.setProjection('azimuthalEquidistant');
  assert.equal(controller.getProjection(), 'azimuthalEquidistant');
});

test('controller – setProjection back to globe', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  controller.setProjection('orthographic');
  assert.equal(controller.getProjection(), 'orthographic');
  controller.setProjection('globe');
  assert.equal(controller.getProjection(), 'globe');
});

test('controller – scene with projection triggers setProjection', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  controller.setScene({ projection: 'equirectangular', markers: [] });
  assert.equal(controller.getProjection(), 'equirectangular');
});

test('controller – switching between flat projections', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  controller.setProjection('azimuthalEquidistant');
  assert.equal(controller.getProjection(), 'azimuthalEquidistant');
  controller.setProjection('orthographic');
  assert.equal(controller.getProjection(), 'orthographic');
  controller.setProjection('equirectangular');
  assert.equal(controller.getProjection(), 'equirectangular');
});
