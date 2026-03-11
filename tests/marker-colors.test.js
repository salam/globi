import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COLOR_BLIND_SAFE_DOT_PALETTE,
  getDotColorForIndex,
  assignAutoDotColors,
} from '../src/scene/markerColors.js';

test('color-blind-safe palette contains 10 base colors', () => {
  assert.equal(COLOR_BLIND_SAFE_DOT_PALETTE.length, 10);
  assert.equal(new Set(COLOR_BLIND_SAFE_DOT_PALETTE).size, 10);
});

test('first 10 dot colors come from base palette', () => {
  const firstTen = Array.from({ length: 10 }, (_, idx) => getDotColorForIndex(idx));
  assert.deepEqual(firstTen, COLOR_BLIND_SAFE_DOT_PALETTE);
});

test('after first 10 colors, algorithm generates shade variants', () => {
  const base = getDotColorForIndex(0);
  const shade = getDotColorForIndex(10);

  assert.notEqual(base, shade);
  assert.equal(/^#[0-9a-f]{6}$/i.test(shade), true);
});

test('assignAutoDotColors assigns unique sequential colors to unspecified dot markers', () => {
  const markers = [
    { id: 'a', visualType: 'dot' },
    { id: 'b', visualType: 'dot' },
    { id: 'c', visualType: 'model' },
    { id: 'd', visualType: 'dot', color: '#111111' },
    { id: 'e', visualType: 'dot' },
  ];

  const updated = assignAutoDotColors(markers);

  assert.equal(updated[0].color, getDotColorForIndex(0));
  assert.equal(updated[1].color, getDotColorForIndex(1));
  assert.equal(updated[2].color, undefined);
  assert.equal(updated[3].color, '#111111');
  assert.equal(updated[4].color, getDotColorForIndex(3));
});
