import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chooseScaleKilometers,
  computeNorthArrowState,
  computeScaleBar,
} from '../src/components/navigationHud.js';

test('chooseScaleKilometers picks nice rounded values', () => {
  assert.equal(chooseScaleKilometers(0), 0);
  assert.equal(chooseScaleKilometers(87), 50);
  assert.equal(chooseScaleKilometers(800), 500);
  assert.equal(chooseScaleKilometers(14200), 10000);
});

test('computeNorthArrowState returns rotation, tilt, and dotOpacity', () => {
  const state = computeNorthArrowState({ centerLat: 25, centerLon: 135 });
  assert.equal(typeof state.rotation, 'number');
  assert.equal(typeof state.tilt, 'number');
  assert.equal(typeof state.dotOpacity, 'number');
});

test('rotation points north for default camera orientation', () => {
  const { rotation } = computeNorthArrowState({
    centerLat: 25,
    centerLon: 135,
  });

  assert.equal(rotation, 0);
});

test('rotation safely falls back near poles', () => {
  const { rotation } = computeNorthArrowState({
    centerLat: 89.999,
    centerLon: 30,
  });

  assert.equal(rotation, 0);
});

test('tilt is zero at the equator', () => {
  const { tilt } = computeNorthArrowState({ centerLat: 0, centerLon: 0 });
  assert.equal(tilt, 0);
});

test('tilt increases with latitude', () => {
  const equator = computeNorthArrowState({ centerLat: 0 });
  const mid = computeNorthArrowState({ centerLat: 45 });
  const polar = computeNorthArrowState({ centerLat: 80 });

  assert.ok(mid.tilt > equator.tilt, 'tilt at 45° > tilt at 0°');
  assert.ok(polar.tilt > mid.tilt, 'tilt at 80° > tilt at 45°');
});

test('tilt is clamped to 85 degrees maximum', () => {
  const { tilt } = computeNorthArrowState({ centerLat: 89.999 });
  assert.ok(tilt <= 85, `tilt ${tilt} should be ≤ 85`);
});

test('tilt works symmetrically for southern latitudes', () => {
  const north = computeNorthArrowState({ centerLat: 60 });
  const south = computeNorthArrowState({ centerLat: -60 });
  assert.equal(north.tilt, south.tilt);
});

test('dotOpacity is 0 at low latitudes', () => {
  const { dotOpacity } = computeNorthArrowState({ centerLat: 30 });
  assert.equal(dotOpacity, 0);
});

test('dotOpacity fades in above 65 degrees', () => {
  const at60 = computeNorthArrowState({ centerLat: 60 });
  const at75 = computeNorthArrowState({ centerLat: 75 });
  const at85 = computeNorthArrowState({ centerLat: 85 });

  assert.equal(at60.dotOpacity, 0, 'no dot at 60°');
  assert.ok(at75.dotOpacity > 0, 'dot begins to appear at 75°');
  assert.ok(at85.dotOpacity >= at75.dotOpacity, 'dot stronger at 85°');
  assert.ok(at85.dotOpacity <= 1, 'dot opacity ≤ 1');
});

test('computeScaleBar returns km label and pixel width', () => {
  const result = computeScaleBar({
    width: 800,
    height: 500,
    zoom: 1,
    planetRadiusRatio: 1,
  });

  assert.ok(result.kilometers > 0);
  assert.ok(result.pixels > 0);
  assert.ok(result.label.endsWith(' km'));
});

test('computeScaleBar decreases kilometers when zooming in', () => {
  const zoomedOut = computeScaleBar({
    width: 800,
    height: 500,
    zoom: 1,
    planetRadiusRatio: 1,
  });
  const zoomedIn = computeScaleBar({
    width: 800,
    height: 500,
    zoom: 2,
    planetRadiusRatio: 1,
  });

  assert.ok(zoomedIn.kilometers < zoomedOut.kilometers);
});
