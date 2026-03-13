import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UndoRedo } from '../../studio/state/undoRedo.js';

describe('UndoRedo', () => {
  it('starts empty', () => {
    const ur = new UndoRedo();
    assert.equal(ur.canUndo, false);
    assert.equal(ur.canRedo, false);
  });

  it('pushes and undoes', () => {
    const ur = new UndoRedo();
    ur.push({ v: 1 });
    ur.push({ v: 2 });
    assert.equal(ur.canUndo, true);
    const prev = ur.undo();
    assert.deepEqual(prev, { v: 1 });
  });

  it('redoes after undo', () => {
    const ur = new UndoRedo();
    ur.push({ v: 1 });
    ur.push({ v: 2 });
    ur.undo();
    assert.equal(ur.canRedo, true);
    const next = ur.redo();
    assert.deepEqual(next, { v: 2 });
  });

  it('clears redo stack on new push', () => {
    const ur = new UndoRedo();
    ur.push({ v: 1 });
    ur.push({ v: 2 });
    ur.undo();
    ur.push({ v: 3 });
    assert.equal(ur.canRedo, false);
  });

  it('respects max depth', () => {
    const ur = new UndoRedo(3);
    ur.push({ v: 1 });
    ur.push({ v: 2 });
    ur.push({ v: 3 });
    ur.push({ v: 4 }); // pushes out v:1
    const a = ur.undo(); // v:3
    const b = ur.undo(); // v:2
    assert.deepEqual(a, { v: 3 });
    assert.deepEqual(b, { v: 2 });
    assert.equal(ur.canUndo, false); // v:1 was evicted
  });

  it('returns undefined when nothing to undo', () => {
    const ur = new UndoRedo();
    assert.equal(ur.undo(), undefined);
  });

  it('returns undefined when nothing to redo', () => {
    const ur = new UndoRedo();
    assert.equal(ur.redo(), undefined);
  });
});
