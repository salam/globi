import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScene } from '../../src/scene/schema.js';

describe('schema visibility + cameraAnimation', () => {
  it('preserves visibility array on markers', () => {
    const scene = normalizeScene({
      markers: [{ id: 'm1', lat: 0, lon: 0, visibility: [{ from: 0, to: 5000 }] }],
    });
    assert.deepEqual(scene.markers[0].visibility, [{ from: 0, to: 5000 }]);
  });

  it('defaults visibility to undefined (always visible)', () => {
    const scene = normalizeScene({
      markers: [{ id: 'm1', lat: 0, lon: 0 }],
    });
    assert.equal(scene.markers[0].visibility, undefined);
  });

  it('preserves cameraAnimation at scene level', () => {
    const scene = normalizeScene({
      cameraAnimation: [
        { t: 0, value: { lat: 0, lon: 0, alt: 1, tilt: 0, rotation: 0 } },
        { t: 5000, value: { lat: 45, lon: 90, alt: 2, tilt: 30, rotation: 0 } },
      ],
    });
    assert.equal(scene.cameraAnimation.length, 2);
    assert.equal(scene.cameraAnimation[0].t, 0);
  });

  it('defaults cameraAnimation to empty array', () => {
    const scene = normalizeScene({});
    assert.deepEqual(scene.cameraAnimation, []);
  });

  it('preserves easing field on animation keyframes', () => {
    const scene = normalizeScene({
      markers: [{ id: 'm1', lat: 0, lon: 0 }],
      animations: [{
        entityId: 'm1',
        keyframes: [
          { t: 0, value: { lat: 0, lon: 0 }, easing: 'ease-in' },
          { t: 1000, value: { lat: 10, lon: 10 } },
        ],
      }],
    });
    assert.equal(scene.animations[0].keyframes[0].easing, 'ease-in');
    assert.equal(scene.animations[0].keyframes[1].easing, undefined);
  });

  it('preserves visibility on arcs and paths', () => {
    const scene = normalizeScene({
      arcs: [{ id: 'a1', start: { lat: 0, lon: 0 }, end: { lat: 1, lon: 1 }, visibility: [{ from: 100, to: 200 }] }],
      paths: [{ id: 'p1', points: [{ lat: 0, lon: 0 }], visibility: [{ from: 300, to: 400 }] }],
    });
    assert.deepEqual(scene.arcs[0].visibility, [{ from: 100, to: 200 }]);
    assert.deepEqual(scene.paths[0].visibility, [{ from: 300, to: 400 }]);
  });
});
