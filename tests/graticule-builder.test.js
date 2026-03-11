import test from 'node:test';
import assert from 'node:assert/strict';
import { createGraticule } from '../src/renderer/graticuleBuilder.js';

test('createGraticule returns LineSegments', async () => {
  const { LineSegments } = await import('three');
  const g = createGraticule();
  assert.ok(g instanceof LineSegments);
});

test('createGraticule has vertices', () => {
  const g = createGraticule();
  assert.ok(g.geometry.attributes.position.count > 0);
});

test('createGraticule material is transparent', () => {
  const g = createGraticule();
  assert.equal(g.material.transparent, true);
  assert.equal(g.material.depthWrite, false);
});

test('createGraticule accepts custom color and opacity', () => {
  const g = createGraticule({ color: 0xff0000, opacity: 0.5 });
  assert.equal(g.material.opacity, 0.5);
});
