import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveTexturePaths,
  shouldUpgradeTexture,
} from '../src/renderer/textureLoader.js';

test('resolveTexturePaths returns correct 2K paths for Earth', () => {
  const paths = resolveTexturePaths({ id: 'earth' });
  assert.equal(paths.surface, '/assets/textures/earth/2k_day.jpg');
  assert.equal(paths.night, '/assets/textures/earth/2k_night.jpg');
  assert.equal(paths.surfaceHi, '/assets/textures/earth/8k_day.jpg');
  assert.equal(paths.nightHi, '/assets/textures/earth/8k_night.jpg');
});

test('resolveTexturePaths returns correct paths for Mars (no night texture)', () => {
  const paths = resolveTexturePaths({ id: 'mars' });
  assert.equal(paths.surface, '/assets/textures/mars/2k_surface.jpg');
  assert.equal(paths.night, null);
  assert.equal(paths.surfaceHi, '/assets/textures/mars/8k_surface.jpg');
});

test('resolveTexturePaths returns null surfaceHi for bodies with no 8K', () => {
  const paths = resolveTexturePaths({ id: 'uranus' });
  assert.equal(paths.surface, '/assets/textures/uranus/2k_surface.jpg');
  assert.equal(paths.surfaceHi, null);
});

test('resolveTexturePaths respects textureUri override', () => {
  const paths = resolveTexturePaths({ id: 'earth', textureUri: 'custom/earth.jpg' });
  assert.equal(paths.surface, 'custom/earth.jpg');
});

test('shouldUpgradeTexture returns true when zoom > threshold', () => {
  assert.equal(shouldUpgradeTexture(2.5, 8192), true);
  assert.equal(shouldUpgradeTexture(1.5, 8192), false);
});

test('shouldUpgradeTexture returns false when maxResolution is 2048', () => {
  assert.equal(shouldUpgradeTexture(3.0, 2048), false);
});

test('resolveTexturePaths returns Venus atmosphere path', () => {
  const paths = resolveTexturePaths({ id: 'venus' });
  assert.equal(paths.atmosphereOverlay, '/assets/textures/venus/2k_atmosphere.jpg');
});

test('resolveTexturePaths returns Saturn ring path', () => {
  const paths = resolveTexturePaths({ id: 'saturn' });
  assert.equal(paths.ring, '/assets/textures/saturn/2k_ring_alpha.png');
});
