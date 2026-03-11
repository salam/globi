import test from 'node:test';
import assert from 'node:assert/strict';

import {
  interpolateKeyframes,
  normalizeKeyframes,
  AnimationEngine,
} from '../src/animation/engine.js';

test('interpolateKeyframes performs linear interpolation', () => {
  const keyframes = normalizeKeyframes([
    { t: 0, value: { x: 0, y: 0 } },
    { t: 10, value: { x: 10, y: 20 } },
  ]);

  const value = interpolateKeyframes(keyframes, 5);

  assert.deepEqual(value, { x: 5, y: 10 });
});

test('interpolateKeyframes clamps before and after', () => {
  const keyframes = normalizeKeyframes([
    { t: 5, value: { x: 5 } },
    { t: 15, value: { x: 15 } },
  ]);

  assert.deepEqual(interpolateKeyframes(keyframes, 0), { x: 5 });
  assert.deepEqual(interpolateKeyframes(keyframes, 25), { x: 15 });
});

test('AnimationEngine supports looped animations', () => {
  const engine = new AnimationEngine();
  const keyframes = normalizeKeyframes([
    { t: 0, value: { x: 0 } },
    { t: 100, value: { x: 100 } },
  ]);

  engine.register('a1', keyframes, { loop: true });
  const value = engine.sample('a1', 250);

  assert.deepEqual(value, { x: 50 });
});
