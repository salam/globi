import test from 'node:test';
import assert from 'node:assert/strict';

import {
  pointDistance,
  pointToSegmentDistance,
  pointInPolygon,
  polylineMinDistance,
} from '../src/math/hit.js';

test('pointDistance computes euclidean distance', () => {
  assert.equal(pointDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test('pointToSegmentDistance clamps to segment endpoints', () => {
  const distance1 = pointToSegmentDistance({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 });
  const distance2 = pointToSegmentDistance({ x: 1, y: 2 }, { x: 0, y: 0 }, { x: 2, y: 0 });

  assert.equal(Math.round(distance1 * 1000) / 1000, 3);
  assert.equal(Math.round(distance2 * 1000) / 1000, 2);
});

test('pointInPolygon identifies inside vs outside points', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ];

  assert.equal(pointInPolygon({ x: 2, y: 2 }, square), true);
  assert.equal(pointInPolygon({ x: 8, y: 2 }, square), false);
});

test('polylineMinDistance finds nearest segment distance', () => {
  const line = [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 10, y: 0 },
  ];

  const distance = polylineMinDistance({ x: 4, y: 3 }, line);
  assert.equal(Math.round(distance * 1000) / 1000, 3);
});
