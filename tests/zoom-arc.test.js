import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { interpolateZoomArc } from '../src/components/cameraTween.js';

describe('interpolateZoomArc', () => {
  it('returns startZoom at t=0', () => {
    const z = interpolateZoomArc(3.0, 4.0, 30, 0);
    assert.ok(Math.abs(z - 3.0) < 0.01, `expected ~3.0, got ${z}`);
  });

  it('returns targetZoom at t=1', () => {
    const z = interpolateZoomArc(3.0, 4.0, 30, 1);
    assert.ok(Math.abs(z - 4.0) < 0.01, `expected ~4.0, got ${z}`);
  });

  it('dips below the lerp midpoint at t=0.5', () => {
    const startZoom = 4.0;
    const targetZoom = 4.0;
    const angularDist = 30; // medium pan
    const z = interpolateZoomArc(startZoom, targetZoom, angularDist, 0.5);
    // At t=0.5, lerp(4,4,0.5) = 4.0, but the dip should push below
    assert.ok(z < startZoom, `expected zoom dip at midpoint, got ${z} (start: ${startZoom})`);
  });

  it('short hops have smaller dip than long pans', () => {
    const startZoom = 4.0;
    const targetZoom = 4.0;
    const zShort = interpolateZoomArc(startZoom, targetZoom, 2, 0.5);
    const zLong = interpolateZoomArc(startZoom, targetZoom, 60, 0.5);
    const dipShort = startZoom - zShort;
    const dipLong = startZoom - zLong;
    assert.ok(dipLong > dipShort, `long pan dip (${dipLong}) should exceed short hop dip (${dipShort})`);
  });

  it('dip is proportional to max(startZoom, targetZoom)', () => {
    const zHighStart = interpolateZoomArc(6.0, 3.0, 30, 0.5);
    const zLowStart = interpolateZoomArc(2.0, 3.0, 30, 0.5);
    // Higher max zoom should produce larger absolute dip
    const lerpMidHigh = (6.0 + 3.0) / 2;
    const lerpMidLow = (2.0 + 3.0) / 2;
    const dipHigh = lerpMidHigh - zHighStart;
    const dipLow = lerpMidLow - zLowStart;
    assert.ok(dipHigh > dipLow, `high-zoom dip (${dipHigh}) should exceed low-zoom dip (${dipLow})`);
  });

  it('clamps dip fraction for very short distances', () => {
    // Even for 0 angular distance, dip should be at least 5%
    const z = interpolateZoomArc(4.0, 4.0, 0, 0.5);
    const dip = 4.0 - z;
    assert.ok(dip > 0, 'should have a minimum dip even for zero distance');
    assert.ok(dip >= 0.05 * 4.0 * 0.95, 'minimum dip should be around 5% of zoom');
  });

  it('clamps dip fraction for very large distances', () => {
    // For 180 degrees, dip fraction should cap at 0.35
    const z = interpolateZoomArc(4.0, 4.0, 180, 0.5);
    const dip = 4.0 - z;
    const maxDip = 0.35 * 4.0;
    assert.ok(dip <= maxDip + 0.01, `dip (${dip}) should not exceed max (${maxDip})`);
  });

  it('handles equal start and target zoom', () => {
    const z = interpolateZoomArc(3.0, 3.0, 20, 0.5);
    assert.ok(z < 3.0, 'should dip even when start === target');
    const z0 = interpolateZoomArc(3.0, 3.0, 20, 0);
    const z1 = interpolateZoomArc(3.0, 3.0, 20, 1);
    assert.ok(Math.abs(z0 - 3.0) < 0.01);
    assert.ok(Math.abs(z1 - 3.0) < 0.01);
  });
});
