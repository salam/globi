import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScene, validateScene } from '../src/scene/schema.js';

test('normalizeMarker defaults calloutMode to always', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', lat: 0, lon: 0 }],
  });
  assert.equal(scene.markers[0].calloutMode, 'always');
});

test('normalizeMarker preserves valid calloutMode values', () => {
  for (const mode of ['always', 'hover', 'click', 'none']) {
    const scene = normalizeScene({
      markers: [{ id: `m-${mode}`, lat: 0, lon: 0, calloutMode: mode }],
    });
    assert.equal(scene.markers[0].calloutMode, mode);
  }
});

test('normalizeMarker rejects invalid calloutMode and defaults to always', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', lat: 0, lon: 0, calloutMode: 'invalid' }],
  });
  assert.equal(scene.markers[0].calloutMode, 'always');
});

test('normalizeMarker normalizes calloutLabel as localized text', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', lat: 0, lon: 0, calloutLabel: 'Zurich' }],
  });
  assert.deepEqual(scene.markers[0].calloutLabel, { en: 'Zurich' });
});

test('normalizeMarker defaults calloutLabel to empty object', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', lat: 0, lon: 0 }],
  });
  assert.deepEqual(scene.markers[0].calloutLabel, {});
});

test('validateScene accepts valid calloutMode values', () => {
  const result = validateScene({
    markers: [{ id: 'm1', name: { en: 'Test' }, description: { en: '' }, lat: 0, lon: 0, calloutMode: 'hover' }],
  });
  assert.equal(result.valid, true);
});

test('validateScene rejects invalid calloutMode', () => {
  const result = validateScene({
    markers: [{
      id: 'm1', name: { en: 'Test' }, description: { en: '' },
      lat: 0, lon: 0, calloutMode: 'blink',
    }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('calloutMode')));
});
