import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chooseScaleKilometers,
  computeNorthArrowRotation,
  computeScaleBar,
} from '../src/components/navigationHud.js';

test('chooseScaleKilometers picks nice rounded values', () => {
  assert.equal(chooseScaleKilometers(0), 0);
  assert.equal(chooseScaleKilometers(87), 50);
  assert.equal(chooseScaleKilometers(800), 500);
  assert.equal(chooseScaleKilometers(14200), 10000);
});

test('computeNorthArrowRotation points north for default camera orientation', () => {
  const rotation = computeNorthArrowRotation({
    centerLat: 25,
    centerLon: 135,
  });

  assert.equal(rotation, 0);
});

test('computeNorthArrowRotation safely falls back near poles', () => {
  const rotation = computeNorthArrowRotation({
    centerLat: 89.999,
    centerLon: 30,
  });

  assert.equal(rotation, 0);
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
