import test from 'node:test';
import assert from 'node:assert/strict';
import { createEarthMesh, createAtmosphereMesh } from '../src/renderer/earthBuilder.js';
import { Mesh, ShaderMaterial, BackSide } from 'three';

test('createEarthMesh returns a Mesh with ShaderMaterial', () => {
  const earth = createEarthMesh();
  assert.ok(earth instanceof Mesh);
  assert.ok(earth.material instanceof ShaderMaterial);
});

test('createEarthMesh material has required uniforms', () => {
  const earth = createEarthMesh();
  const uniforms = earth.material.uniforms;
  assert.ok('dayTexture' in uniforms);
  assert.ok('nightTexture' in uniforms);
  assert.ok('sunDirection' in uniforms);
});

test('createAtmosphereMesh returns a transparent BackSide mesh', () => {
  const atmos = createAtmosphereMesh();
  assert.equal(atmos.material.transparent, true);
  assert.equal(atmos.material.side, BackSide);
  assert.equal(atmos.material.depthWrite, false);
});

test('createEarthMesh geometry has 64x64 segments', () => {
  const earth = createEarthMesh();
  const params = earth.geometry.parameters;
  assert.equal(params.widthSegments, 64);
  assert.equal(params.heightSegments, 64);
});

test('createEarthMesh accepts nightLayer false to skip night texture uniform usage', () => {
  const earth = createEarthMesh({ nightLayer: false });
  assert.ok(earth instanceof Mesh);
  // Night texture uniform should still exist but shader won't blend it
  assert.ok('dayTexture' in earth.material.uniforms);
});

test('createAtmosphereMesh accepts custom atmosphereColor', () => {
  const atmos = createAtmosphereMesh({ atmosphereColor: [1.0, 0.3, 0.1] });
  assert.ok(atmos.material.uniforms.atmosphereColor);
});
