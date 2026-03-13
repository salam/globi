import test from 'node:test';
import assert from 'node:assert/strict';
import { MarkerManager } from '../src/renderer/markerManager.js';
import { Group } from 'three';

test('MarkerManager creates sphere meshes for dot markers', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, visualType: 'dot', color: '#ff0000' },
  ], 'en');
  assert.equal(group.children.length, 1);
  const child = group.children[0];
  assert.ok(child.isMesh, 'dot marker should be a Mesh (sphere), not a Sprite');
});

test('MarkerManager removes old markers on update', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, visualType: 'dot' },
    { id: 'm2', lat: 10, lon: 10, alt: 0, visualType: 'dot' },
  ], 'en');
  assert.equal(group.children.length, 2);

  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, visualType: 'dot' },
  ], 'en');
  assert.equal(group.children.length, 1);
});

test('MarkerManager returns marker map for hit testing', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    { id: 'zrh', lat: 47.37, lon: 8.54, alt: 0, visualType: 'dot' },
  ], 'en');
  const map = manager.getMarkerMap();
  assert.ok(map.has('zrh'));
});

test('MarkerManager disposes all resources', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, visualType: 'dot' },
  ], 'en');
  manager.dispose();
  assert.equal(manager.getMarkerMap().size, 0);
});

// BUG13: ISS current marker should render only the 3D model, not a sphere dot
test('BUG13: ISS current marker renders only 3D model group, no sphere dot', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    {
      id: 'iss-current',
      lat: 12.5,
      lon: 89.1,
      alt: 0.06,
      visualType: 'dot',
      category: 'iss',
      color: '#f5d547',
      pulse: true,
    },
  ], 'en');

  // Should have: 1 ISS model group + 2 pulse ring sprites = 3 children
  // Should NOT have a sphere dot mesh
  const children = group.children;
  const issModel = children.find((c) => c.isGroup);
  assert.ok(issModel, 'ISS model group should exist');
  assert.equal(issModel.userData.markerId, 'iss-current');

  // No SphereGeometry mesh should be present
  const sphereDot = children.find((c) => c.isMesh && c.geometry?.type === 'SphereGeometry');
  assert.equal(sphereDot, undefined, 'No sphere dot should be rendered for ISS current marker');
});

test('ISS marker gets two staggered pulse rings', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    {
      id: 'iss-current',
      lat: 12.5,
      lon: 89.1,
      alt: 0.06,
      visualType: 'dot',
      category: 'iss',
      color: '#f5d547',
      pulse: true,
    },
  ], 'en');

  const pulseRings = group.children.filter((c) => c.userData?.isPulseRing);
  assert.equal(pulseRings.length, 2, 'ISS should have 2 pulse rings');
  assert.equal(pulseRings[0].userData.phaseOffset, 0, 'First ring has no phase offset');
  assert.equal(pulseRings[1].userData.phaseOffset, 0.75, 'Second ring is staggered');
  assert.ok(pulseRings[0].userData.isIssRing, 'Ring is flagged as ISS ring');
});

test('non-ISS pulse marker gets a single pulse ring', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    {
      id: 'alert-marker',
      lat: 40,
      lon: -74,
      alt: 0,
      visualType: 'dot',
      color: '#ff0000',
      pulse: true,
    },
  ], 'en');

  const pulseRings = group.children.filter((c) => c.userData?.isPulseRing);
  assert.equal(pulseRings.length, 1, 'Non-ISS should have 1 pulse ring');
  assert.equal(pulseRings[0].userData.isIssRing, false);
});

test('ISS marker with orbitWaypoints enables hasPulseAnimations', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    {
      id: 'iss-current',
      lat: 0,
      lon: 0,
      alt: 0.06,
      visualType: 'dot',
      category: 'iss',
      color: '#f5d547',
      pulse: true,
      fetchedAtMs: 1000000,
      orbitWaypoints: [
        { lat: 0, lon: 0, alt: 0.06, timestampMs: 1000000 },
        { lat: 5, lon: 10, alt: 0.06, timestampMs: 1060000 },
      ],
    },
  ], 'en');

  assert.ok(manager.hasPulseAnimations(), 'ISS with orbit waypoints enables animation');
});
