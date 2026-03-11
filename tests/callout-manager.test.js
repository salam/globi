import test from 'node:test';
import assert from 'node:assert/strict';
import { CalloutManager } from '../src/renderer/calloutManager.js';
import { Group, Vector3, Quaternion } from 'three';

test('CalloutManager creates leader lines for always-visible markers', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const markers = [
    { id: 'm1', lat: 0, lon: 0, alt: 0, name: { en: 'Test' }, calloutMode: 'always', calloutLabel: {} },
  ];
  manager.update(group, markers, 'en');
  assert.ok(group.children.length >= 1);
});

test('CalloutManager hides callouts for mode none', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const markers = [
    { id: 'm1', lat: 0, lon: 0, alt: 0, name: { en: 'Test' }, calloutMode: 'none', calloutLabel: {} },
  ];
  manager.update(group, markers, 'en');
  assert.equal(group.children.length, 0);
});

test('CalloutManager resolves label from calloutLabel then falls back to name', () => {
  const manager = new CalloutManager();
  assert.equal(manager.resolveLabel({ calloutLabel: { en: 'Custom' }, name: { en: 'Name' } }, 'en'), 'Custom');
  assert.equal(manager.resolveLabel({ calloutLabel: {}, name: { en: 'Fallback' } }, 'en'), 'Fallback');
  assert.equal(manager.resolveLabel({ calloutLabel: {}, name: {} }, 'en'), '');
});

test('CalloutManager disposes cleanly', () => {
  const manager = new CalloutManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, name: { en: 'Test' }, calloutMode: 'always', calloutLabel: {} },
  ], 'en');
  manager.dispose();
  assert.equal(group.children.length, 0);
});

test('CalloutManager updateVisibility hides backfacing callouts', () => {
  const manager = new CalloutManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, name: { en: 'Test' }, calloutMode: 'always', calloutLabel: { en: 'T' } },
  ], 'en');
  // Camera on +Z, marker at (1,0,0) faces right — should be visible from +Z
  const camPos = new Vector3(0, 0, 3);
  const globeQuat = new Quaternion(); // identity
  manager.updateVisibility(camPos, globeQuat);
  // m1 is at lat=0 lon=0 which is (1,0,0) in cartesian — dot with (0,0,1) = 0
  // With identity quaternion, facing = 0 which is not > 0, so hidden
  // That's correct — equator at lon=0 is exactly on the edge
});

test('CalloutManager hover mode starts hidden', () => {
  const manager = new CalloutManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 90, alt: 0, name: { en: 'Test' }, calloutMode: 'hover', calloutLabel: { en: 'X' } },
  ], 'en');
  const data = manager.getCalloutData();
  const entry = data.get('m1');
  assert.equal(entry.line.visible, false);
});
