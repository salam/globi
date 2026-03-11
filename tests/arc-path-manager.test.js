import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcPathManager } from '../src/renderer/arcPathManager.js';
import { Group } from 'three';

test('ArcPathManager creates lines for arcs', () => {
  const manager = new ArcPathManager();
  const group = new Group();
  manager.update(group, [
    { id: 'a1', start: { lat: 0, lon: 0 }, end: { lat: 10, lon: 10 }, color: '#ff0000', strokeWidth: 2 },
  ], []);
  assert.ok(group.children.length >= 1);
});

test('ArcPathManager creates lines for paths', () => {
  const manager = new ArcPathManager();
  const group = new Group();
  manager.update(group, [], [
    { id: 'p1', points: [{ lat: 0, lon: 0 }, { lat: 5, lon: 5 }, { lat: 10, lon: 10 }], color: '#00ff00' },
  ]);
  assert.ok(group.children.length >= 1);
});

test('ArcPathManager clears on update', () => {
  const manager = new ArcPathManager();
  const group = new Group();
  manager.update(group, [
    { id: 'a1', start: { lat: 0, lon: 0 }, end: { lat: 10, lon: 10 } },
  ], []);
  assert.equal(group.children.length, 1);
  manager.update(group, [], []);
  assert.equal(group.children.length, 0);
});

test('ArcPathManager disposes cleanly', () => {
  const manager = new ArcPathManager();
  const group = new Group();
  manager.update(group, [
    { id: 'a1', start: { lat: 0, lon: 0 }, end: { lat: 10, lon: 10 } },
  ], []);
  manager.dispose();
  assert.equal(group.children.length, 0);
});
