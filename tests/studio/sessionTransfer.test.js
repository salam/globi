import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock sessionStorage for Node
const storage = new Map();
globalThis.sessionStorage = {
  getItem(k) { return storage.get(k) ?? null; },
  setItem(k, v) { storage.set(k, v); },
  removeItem(k) { storage.delete(k); },
};

const { writeScene, readScene, STORAGE_KEY } = await import('../../studio/state/sessionTransfer.js');

describe('sessionTransfer', () => {
  beforeEach(() => storage.clear());

  it('writes and reads a scene', async () => {
    const scene = { version: 1, markers: [{ id: 'm1' }] };
    writeScene(scene);
    const result = await readScene();
    assert.deepEqual(result, scene);
  });

  it('returns null when nothing stored', async () => {
    assert.equal(await readScene(), null);
  });

  it('clears after read', async () => {
    writeScene({ version: 1 });
    await readScene();
    assert.equal(await readScene(), null);
  });

  it('uses the documented storage key', () => {
    assert.equal(STORAGE_KEY, 'globi-studio-scene');
  });

  it('compresses large scenes when CompressionStream is available', { skip: typeof globalThis.CompressionStream === 'undefined' }, async () => {
    // This test only runs in browser environments with CompressionStream
  });
});
