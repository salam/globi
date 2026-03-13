import test from 'node:test';
import assert from 'node:assert/strict';
import { createEarthMesh, createBodyMesh, createAtmosphereMesh } from '../src/renderer/earthBuilder.js';
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

test('createBodyMesh with shaderMode "single" has single-texture uniforms', () => {
  const body = createBodyMesh({ shaderMode: 'single' });
  assert.ok(body instanceof Mesh);
  assert.ok('dayTexture' in body.material.uniforms);
  assert.ok('sunDirection' in body.material.uniforms);
});

test('createBodyMesh with shaderMode "venusAtmosphere" has atmosphereTexture uniform', () => {
  const body = createBodyMesh({ shaderMode: 'venusAtmosphere' });
  assert.ok('atmosphereTexture' in body.material.uniforms);
  assert.ok('atmosphereTextureBlend' in body.material.uniforms);
});

test('createAtmosphereMesh with custom thickness changes geometry radius', () => {
  const thin = createAtmosphereMesh({ thickness: 0.03 });
  const thick = createAtmosphereMesh({ thickness: 0.15 });
  assert.ok(thin.geometry.parameters.radius < thick.geometry.parameters.radius);
});

test('createAtmosphereMesh with density uniform', () => {
  const atmos = createAtmosphereMesh({ density: 0.25 });
  assert.ok('atmosphereDensity' in atmos.material.uniforms);
  assert.equal(atmos.material.uniforms.atmosphereDensity.value, 0.25);
});

test('createBodyMesh shaderMode "dayNight" is backward compatible with createEarthMesh', () => {
  const body = createBodyMesh({ shaderMode: 'dayNight' });
  assert.ok('dayTexture' in body.material.uniforms);
  assert.ok('nightTexture' in body.material.uniforms);
});

test('createEarthMesh with wireframeMode "shaded" returns mesh without texture uniforms', () => {
  const mesh = createEarthMesh({ wireframeMode: 'shaded' });
  assert.ok(mesh instanceof Mesh);
  assert.ok(mesh.material instanceof ShaderMaterial);
  assert.ok(!('dayTexture' in mesh.material.uniforms));
});

test('createEarthMesh with wireframeMode "flat" returns mesh', () => {
  const mesh = createEarthMesh({ wireframeMode: 'flat' });
  assert.ok(mesh instanceof Mesh);
  assert.ok(!('dayTexture' in mesh.material.uniforms));
});

test('createEarthMesh with desaturate uniform', () => {
  const mesh = createEarthMesh({ desaturate: 1.0 });
  assert.ok(mesh instanceof Mesh);
  assert.equal(mesh.material.uniforms.desaturate.value, 1.0);
});

test('createEarthMesh with rimColor uniform', () => {
  const mesh = createEarthMesh({ rimColor: [0.2, 0.2, 0.2] });
  assert.ok(mesh instanceof Mesh);
  assert.deepEqual(mesh.material.uniforms.uRimColor.value, [0.2, 0.2, 0.2]);
});

test('createEarthMesh with flatLighting uniform', () => {
  const mesh = createEarthMesh({ flatLighting: 1.0 });
  assert.ok(mesh instanceof Mesh);
  assert.equal(mesh.material.uniforms.flatLighting.value, 1.0);
});

test('createBodyMesh with wireframeMode "shaded" works', () => {
  const mesh = createBodyMesh({ wireframeMode: 'shaded' });
  assert.ok(mesh instanceof Mesh);
});

// BUG18: sunLocked uniform tests
test('createEarthMesh has sunLocked uniform, defaults to false', () => {
  const earth = createEarthMesh();
  assert.ok('sunLocked' in earth.material.uniforms);
  assert.equal(earth.material.uniforms.sunLocked.value, false);
});

test('createEarthMesh sunLocked=true sets uniform', () => {
  const earth = createEarthMesh({ sunLocked: true });
  assert.equal(earth.material.uniforms.sunLocked.value, true);
});

test('createBodyMesh has sunLocked uniform for all shader modes', () => {
  for (const mode of ['dayNight', 'single', 'venusAtmosphere']) {
    const body = createBodyMesh({ shaderMode: mode });
    assert.ok('sunLocked' in body.material.uniforms, `sunLocked missing in ${mode}`);
    assert.equal(body.material.uniforms.sunLocked.value, false);
  }
});

test('createBodyMesh sunLocked=true propagates to uniform', () => {
  const body = createBodyMesh({ shaderMode: 'dayNight', sunLocked: true });
  assert.equal(body.material.uniforms.sunLocked.value, true);
});

test('createAtmosphereMesh has sunLocked uniform, defaults to false', () => {
  const atmos = createAtmosphereMesh();
  assert.ok('sunLocked' in atmos.material.uniforms);
  assert.equal(atmos.material.uniforms.sunLocked.value, false);
});

test('createAtmosphereMesh sunLocked=true sets uniform', () => {
  const atmos = createAtmosphereMesh({ sunLocked: true });
  assert.equal(atmos.material.uniforms.sunLocked.value, true);
});
