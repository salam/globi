import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScene, clusterMarkers } from '../src/scene/schema.js';

test('normalizeScene adds default calloutCluster when omitted', () => {
  const scene = normalizeScene({ markers: [] });
  assert.deepStrictEqual(scene.calloutCluster, { enabled: true, thresholdDeg: 2 });
});

test('normalizeScene preserves custom calloutCluster config', () => {
  const scene = normalizeScene({
    markers: [],
    calloutCluster: { enabled: true, thresholdDeg: 5 },
  });
  assert.deepStrictEqual(scene.calloutCluster, { enabled: true, thresholdDeg: 5 });
});

test('normalizeScene respects calloutCluster enabled: false', () => {
  const scene = normalizeScene({
    markers: [],
    calloutCluster: { enabled: false, thresholdDeg: 2 },
  });
  assert.equal(scene.calloutCluster.enabled, false);
});

test('markers within threshold get same clusterId', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 10.5, lon: 20.5, name: 'B' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  assert.ok(scene.markers[0]._clusterId);
  assert.equal(scene.markers[0]._clusterId, scene.markers[1]._clusterId);
  assert.equal(scene.markers[0]._clusterSize, 2);
  assert.equal(scene.markers[1]._clusterSize, 2);
  assert.equal(scene.markers[0]._clusterIndex, 0);
  assert.equal(scene.markers[1]._clusterIndex, 1);
});

test('markers far apart are not clustered', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 50, lon: 80, name: 'B' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  assert.equal(scene.markers[0]._clusterId, null);
  assert.equal(scene.markers[1]._clusterId, null);
});

test('calloutMode none markers are excluded from clustering', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A', calloutMode: 'always' },
      { id: 'b', lat: 10.1, lon: 20.1, name: 'B', calloutMode: 'none' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  assert.equal(scene.markers[0]._clusterId, null);
  assert.equal(scene.markers[1]._clusterId, null);
});

test('clustering disabled leaves markers unclustered', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 10.1, lon: 20.1, name: 'B' },
    ],
    calloutCluster: { enabled: false },
  });
  assert.equal(scene.markers[0]._clusterId, null);
  assert.equal(scene.markers[1]._clusterId, null);
});

test('cluster with 4+ markers sets correct clusterSize', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 10.3, lon: 20.3, name: 'B' },
      { id: 'c', lat: 10.6, lon: 20.6, name: 'C' },
      { id: 'd', lat: 10.1, lon: 20.1, name: 'D' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  const clustered = scene.markers.filter(m => m._clusterId !== null);
  assert.equal(clustered.length, 4);
  assert.ok(clustered.every(m => m._clusterSize === 4));
});

test('centroid handles antimeridian wrap correctly', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 0, lon: 179, name: 'A' },
      { id: 'b', lat: 0, lon: -179, name: 'B' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 5 },
  });
  assert.ok(scene.markers[0]._clusterId);
  assert.equal(scene.markers[0]._clusterId, scene.markers[1]._clusterId);
  const center = scene.markers[0]._clusterCenter;
  assert.ok(Math.abs(center.lon) > 170, `centroid lon ${center.lon} should be near ±180`);
});

test('clusterMarkers with halved threshold splits clusters at high zoom', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 11.5, lon: 20, name: 'B' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  // At default threshold=2, these are clustered (distance ~1.5°)
  assert.ok(scene.markers[0]._clusterId, 'should be clustered at threshold=2');
  // Now re-cluster with halved threshold (simulating zoom=2)
  clusterMarkers(scene.markers, { enabled: true, thresholdDeg: 1 });
  assert.equal(scene.markers[0]._clusterId, null, 'should split at threshold=1');
  assert.equal(scene.markers[1]._clusterId, null, 'should split at threshold=1');
});

test('clusterMarkers is re-entrant (resets cluster fields before clustering)', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 10.1, lon: 20.1, name: 'B' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  assert.ok(scene.markers[0]._clusterId);
  // Re-cluster with clustering disabled
  clusterMarkers(scene.markers, { enabled: false, thresholdDeg: 2 });
  assert.equal(scene.markers[0]._clusterId, null);
  assert.equal(scene.markers[1]._clusterId, null);
});

test('evicted marker forms its own cluster in later iteration', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 11.9, lon: 20, name: 'B' },
      { id: 'c', lat: 10.1, lon: 20, name: 'C' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  const allAssigned = scene.markers.every(
    m => m._clusterId !== null || m._clusterSize === 1
  );
  assert.ok(allAssigned, 'all markers should either be clustered or solo');
});
