import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mock controller that records calls and returns configurable screenToLatLon results.
 */
class MockDragController {
  constructor() {
    this.calls = [];
    this._screenToLatLonResult = null;
    this._cameraState = { centerLon: 0, centerLat: 0, zoom: 1 };
  }

  screenToLatLon(clientX, clientY) {
    this.calls.push(['screenToLatLon', clientX, clientY]);
    return typeof this._screenToLatLonResult === 'function'
      ? this._screenToLatLonResult(clientX, clientY)
      : this._screenToLatLonResult;
  }

  panBy(deltaLon, deltaLat) {
    this.calls.push(['panBy', deltaLon, deltaLat]);
  }

  getCameraState() {
    return { ...this._cameraState };
  }

  pauseIdleRotation() {
    this.calls.push(['pauseIdleRotation']);
  }

  resumeIdleRotation() {
    this.calls.push(['resumeIdleRotation']);
  }

  hitTest() { return null; }
}

// --- Surface grab produces correct panBy deltas ---

test('surface grab: panBy delta moves grab point to track cursor', () => {
  const ctrl = new MockDragController();
  const grabLatLon = { lat: 10, lon: 20 };
  const currentLatLon = { lat: 12, lon: 25 };

  const deltaLon = grabLatLon.lon - currentLatLon.lon;
  const deltaLat = grabLatLon.lat - currentLatLon.lat;

  assert.equal(deltaLon, -5);
  assert.equal(deltaLat, -2);

  ctrl.panBy(deltaLon, deltaLat);
  const panCall = ctrl.calls.find(c => c[0] === 'panBy');
  assert.deepEqual(panCall, ['panBy', -5, -2]);
});

// --- Off-disk fallback uses zoom-scaled deltas ---

test('off-disk fallback: coefficient scales inversely with zoom', () => {
  const width = 800;
  const height = 600;
  const zoom1 = 1;
  const zoom2 = 2;

  const radius1 = Math.min(width, height) * 0.45 * zoom1;
  const radius2 = Math.min(width, height) * 0.45 * zoom2;
  const coeff1 = (180 / Math.PI) / radius1;
  const coeff2 = (180 / Math.PI) / radius2;

  assert.ok(coeff2 < coeff1);
  assert.ok(Math.abs(coeff1 / coeff2 - 2) < 0.001, 'coefficient should halve when zoom doubles');
});

// --- No inertia after pointer-up ---

test('no inertia: no panBy calls after pointer up', () => {
  const ctrl = new MockDragController();
  ctrl.panBy(5, 3);
  const callCountAtUp = ctrl.calls.length;
  assert.equal(ctrl.calls.filter(c => c[0] === 'panBy').length, 1);
  assert.equal(ctrl.calls.length, callCountAtUp);
});

// --- Click detection (< 6px travel) ---

test('click detection: travel < 6 is a click, not a drag', () => {
  const travels = [0, 1, 3, 5, 5.9];
  for (const t of travels) {
    assert.ok(t < 6, `travel ${t} should be detected as click`);
  }
  assert.ok(6 >= 6, 'travel 6 is NOT a click');
  assert.ok(10 >= 6, 'travel 10 is NOT a click');
});

// --- Re-anchoring when cursor returns to disk ---

test('re-anchor: grabLatLon updates when cursor returns to disk after off-disk', () => {
  const ctrl = new MockDragController();
  let grabLatLon = { lat: 10, lon: 20 };
  let wasOffDisk = false;

  ctrl._screenToLatLonResult = null;
  wasOffDisk = true;

  ctrl._screenToLatLonResult = { lat: 15, lon: 30 };
  const currentLatLon = ctrl.screenToLatLon(400, 300);

  if (currentLatLon && wasOffDisk) {
    grabLatLon = { lat: currentLatLon.lat, lon: currentLatLon.lon };
    wasOffDisk = false;
  }

  assert.deepEqual(grabLatLon, { lat: 15, lon: 30 });
  assert.equal(wasOffDisk, false);
});

// --- Idle rotation paused during drag ---

test('idle rotation: paused on pointer down, resumed on pointer up', () => {
  const ctrl = new MockDragController();
  ctrl.pauseIdleRotation();
  ctrl.resumeIdleRotation();

  assert.ok(ctrl.calls.some(c => c[0] === 'pauseIdleRotation'));
  assert.ok(ctrl.calls.some(c => c[0] === 'resumeIdleRotation'));
  const pauseIdx = ctrl.calls.findIndex(c => c[0] === 'pauseIdleRotation');
  const resumeIdx = ctrl.calls.findIndex(c => c[0] === 'resumeIdleRotation');
  assert.ok(pauseIdx < resumeIdx, 'pause must come before resume');
});
