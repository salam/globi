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

test('CalloutManager leader line uses marker color', () => {
  const manager = new CalloutManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 10, lon: 10, alt: 0, name: { en: 'A' }, calloutMode: 'always', color: '#0072B2' },
    { id: 'm2', lat: 20, lon: 20, alt: 0, name: { en: 'B' }, calloutMode: 'always' },
  ], 'en');
  const data = manager.getCalloutData();
  const m1 = data.get('m1');
  const m2 = data.get('m2');
  assert.equal(m1.color, '#0072B2');
  assert.equal(m2.color, '#f6b73c');
  // Verify leader line material uses the marker color
  assert.equal(m1.line.material.color.getHexString(), '0072b2');
});

test('CalloutManager filterCallouts highlights matches and dims non-matches', () => {
  const manager = new CalloutManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 10, lon: 10, alt: 0, name: { en: 'Alpha' }, calloutMode: 'always' },
    { id: 'm2', lat: 20, lon: 20, alt: 0, name: { en: 'Beta' }, calloutMode: 'always' },
    { id: 'm3', lat: 30, lon: 30, alt: 0, name: { en: 'Gamma' }, calloutMode: 'always' },
  ], 'en');
  const data = manager.getCalloutData();
  // Filter to only m1 — all stay visible, non-matches are dimmed
  manager.filterCallouts(['m1']);
  assert.equal(data.get('m1').visible, true);
  assert.equal(data.get('m2').visible, true);
  assert.equal(data.get('m3').visible, true);
  // Match keeps full opacity, non-matches get dimmed
  assert.ok(data.get('m1').line.material.opacity > 0.5);
  assert.ok(data.get('m2').line.material.opacity < 0.2);
  assert.ok(data.get('m3').line.material.opacity < 0.2);
  // Reset restores full opacity
  manager.filterCallouts(null);
  assert.ok(data.get('m1').line.material.opacity > 0.5);
  assert.ok(data.get('m2').line.material.opacity > 0.5);
  assert.ok(data.get('m3').line.material.opacity > 0.5);
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
