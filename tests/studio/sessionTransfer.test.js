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

  it('writes and reads a scene', () => {
    const scene = { version: 1, markers: [{ id: 'm1' }] };
    writeScene(scene);
    const result = readScene();
    assert.deepEqual(result, scene);
  });

  it('returns null when nothing stored', () => {
    assert.equal(readScene(), null);
  });

  it('clears after read', () => {
    writeScene({ version: 1 });
    readScene();
    assert.equal(readScene(), null);
  });

  it('uses the documented storage key', () => {
    assert.equal(STORAGE_KEY, 'globi-studio-scene');
  });
});
