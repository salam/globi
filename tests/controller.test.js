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
