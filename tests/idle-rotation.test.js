import test from 'node:test';
import assert from 'node:assert/strict';

import { computeIdlePanDelta } from '../src/components/idleRotation.js';

test('computeIdlePanDelta uses rotationSpeed sign and elapsed time', () => {
  assert.equal(computeIdlePanDelta(0.001, 100), 0.05);
  assert.equal(computeIdlePanDelta(-0.001, 100), -0.05);
});

test('computeIdlePanDelta returns 0 for missing/invalid inputs', () => {
  assert.equal(computeIdlePanDelta(0, 1000), 0);
  assert.equal(computeIdlePanDelta(0.001, 0), 0);
  assert.equal(computeIdlePanDelta('bad', 1000), 0);
});

test('computeIdlePanDelta caps very large frame deltas', () => {
  assert.equal(computeIdlePanDelta(0.001, 100000), 0.125);
});
