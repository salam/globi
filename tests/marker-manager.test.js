import test from 'node:test';
import assert from 'node:assert/strict';
import { MarkerManager } from '../src/renderer/markerManager.js';
import { Group } from 'three';

test('MarkerManager creates sprites for dot markers', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, visualType: 'dot', color: '#ff0000' },
  ], 'en');
  assert.equal(group.children.length, 1);
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
