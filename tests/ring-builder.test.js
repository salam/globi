import test from 'node:test';
import assert from 'node:assert/strict';
import { createRingMesh } from '../src/renderer/ringBuilder.js';
import { getCelestialPreset } from '../src/scene/celestial.js';
import { Mesh, DoubleSide } from 'three';

test('createRingMesh returns null for bodies without rings', () => {
  const earth = getCelestialPreset('earth');
  assert.equal(createRingMesh(earth), null);
});

test('createRingMesh returns null when rings config is null', () => {
  assert.equal(createRingMesh({ rings: null }), null);
});

test('createRingMesh returns a Mesh for Saturn', () => {
  const saturn = getCelestialPreset('saturn');
  const ring = createRingMesh(saturn);
  assert.ok(ring instanceof Mesh);
});

test('Saturn ring is double-sided and transparent', () => {
  const saturn = getCelestialPreset('saturn');
  const ring = createRingMesh(saturn);
  assert.equal(ring.material.side, DoubleSide);
  assert.equal(ring.material.transparent, true);
  assert.equal(ring.material.depthWrite, false);
});

test('ring geometry has correct inner/outer radius', () => {
  const saturn = getCelestialPreset('saturn');
  const ring = createRingMesh(saturn);
  const params = ring.geometry.parameters;
  assert.equal(params.innerRadius, saturn.rings.innerRadius);
  assert.equal(params.outerRadius, saturn.rings.outerRadius);
});

test('Jupiter ring has very low opacity', () => {
  const jupiter = getCelestialPreset('jupiter');
  const ring = createRingMesh(jupiter);
  assert.ok(ring.material.opacity <= 0.1);
});
