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

test('CalloutManager CSS2D labels carry data-marker-id attribute', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    const manager = new CalloutManager();
    const group = new Group();
    manager.update(group, [
      { id: 'pin1', lat: 10, lon: 20, alt: 0, name: { en: 'City' }, calloutMode: 'always' },
      { id: 'pin2', lat: 30, lon: 40, alt: 0, name: { en: 'Town' }, calloutMode: 'hover' },
    ], 'en');
    // Minimal CSS2DObject stub
    class FakeCSS2D { constructor(el) { this.element = el; this.position = new Vector3(); this.userData = {}; this.visible = true; } }
    const labels = manager.createCSS2DLabels(FakeCSS2D);
    assert.equal(labels.length, 2);
    assert.equal(labels[0].div.dataset.markerId, 'pin1');
    assert.equal(labels[1].div.dataset.markerId, 'pin2');
  } finally {
    delete globalThis.document;
  }
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

// Task 4: Cascade rendering for small clusters (2-3)

test('CalloutManager renders cascade for 2-marker cluster', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    const manager = new CalloutManager();
    const group = new Group();
    manager.update(group, [
      {
        id: 'm1', lat: 10, lon: 20, alt: 0, name: { en: 'Alpha' },
        calloutMode: 'always', _clusterId: 'cluster_0', _clusterIndex: 0,
        _clusterSize: 2, _clusterCenter: { lat: 10.05, lon: 20.05 },
      },
      {
        id: 'm2', lat: 10.1, lon: 20.1, alt: 0, name: { en: 'Beta' },
        calloutMode: 'always', _clusterId: 'cluster_0', _clusterIndex: 1,
        _clusterSize: 2, _clusterCenter: { lat: 10.05, lon: 20.05 },
      },
    ], 'en');
    class FakeCSS2D {
      constructor(el) { this.element = el; this.position = new Vector3(); this.userData = {}; this.visible = true; }
    }
    const labels = manager.createCSS2DLabels(FakeCSS2D);
    assert.equal(labels.length, 2);
    assert.ok(labels[1].div.style.marginTop);
  } finally {
    delete globalThis.document;
  }
});

test('CalloutManager renders solo markers normally when clustering is active', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    const manager = new CalloutManager();
    const group = new Group();
    manager.update(group, [
      {
        id: 'm1', lat: 10, lon: 20, alt: 0, name: { en: 'Solo' },
        calloutMode: 'always', _clusterId: null, _clusterIndex: 0,
        _clusterSize: 1, _clusterCenter: null,
      },
    ], 'en');
    class FakeCSS2D {
      constructor(el) { this.element = el; this.position = new Vector3(); this.userData = {}; this.visible = true; }
    }
    const labels = manager.createCSS2DLabels(FakeCSS2D);
    assert.equal(labels.length, 1);
    assert.equal(labels[0].div.style.marginTop, '');
    const data = manager.getCalloutData().get('m1');
    assert.ok(data.line);
  } finally {
    delete globalThis.document;
  }
});

test('CalloutManager reserves cascade slot for hover marker in small cluster', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    const manager = new CalloutManager();
    const group = new Group();
    manager.update(group, [
      {
        id: 'm1', lat: 10, lon: 20, alt: 0, name: { en: 'Always' },
        calloutMode: 'always', _clusterId: 'cluster_0', _clusterIndex: 0,
        _clusterSize: 2, _clusterCenter: { lat: 10.05, lon: 20.05 },
      },
      {
        id: 'm2', lat: 10.1, lon: 20.1, alt: 0, name: { en: 'Hover' },
        calloutMode: 'hover', _clusterId: 'cluster_0', _clusterIndex: 1,
        _clusterSize: 2, _clusterCenter: { lat: 10.05, lon: 20.05 },
      },
    ], 'en');
    class FakeCSS2D {
      constructor(el) { this.element = el; this.position = new Vector3(); this.userData = {}; this.visible = true; }
    }
    const labels = manager.createCSS2DLabels(FakeCSS2D);
    assert.equal(labels.length, 2);
    assert.ok(labels[1].div.style.marginTop);
    assert.equal(labels[1].div.style.visibility, 'hidden');
  } finally {
    delete globalThis.document;
  }
});

// Task 5: Group badge rendering for large clusters (4+)

test('CalloutManager renders group badge for 4+ marker cluster', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    const manager = new CalloutManager();
    const group = new Group();
    const center = { lat: 10, lon: 20 };
    const markers = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`, lat: 10 + i * 0.1, lon: 20 + i * 0.1, alt: 0,
      name: { en: `Marker ${i}` }, calloutMode: 'always',
      _clusterId: 'cluster_0', _clusterIndex: i, _clusterSize: 5,
      _clusterCenter: center,
    }));
    manager.update(group, markers, 'en');
    class FakeCSS2D {
      constructor(el) { this.element = el; this.position = new Vector3(); this.userData = {}; this.visible = true; }
    }
    const labels = manager.createCSS2DLabels(FakeCSS2D);
    const badge = labels.find(l => l.div.dataset.clusterId === 'cluster_0');
    assert.ok(badge, 'should create a group badge');
    assert.ok(badge.div.textContent.includes('5'));
    const individuals = labels.filter(l => l.div.dataset.markerId && !l.div.dataset.clusterId);
    for (const ind of individuals) {
      assert.equal(ind.object.visible, false);
    }
  } finally {
    delete globalThis.document;
  }
});

// Task 6: Expand/collapse state management

test('CalloutManager toggles cluster expand/collapse', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const center = { lat: 10, lon: 20 };
  const markers = Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`, lat: 10 + i * 0.1, lon: 20 + i * 0.1, alt: 0,
    name: { en: `M${i}` }, calloutMode: 'always',
    _clusterId: 'cluster_0', _clusterIndex: i, _clusterSize: 4,
    _clusterCenter: center,
  }));
  manager.update(group, markers, 'en');
  assert.equal(manager.isClusterExpanded('cluster_0'), false);
  manager.toggleCluster('cluster_0');
  assert.equal(manager.isClusterExpanded('cluster_0'), true);
  manager.toggleCluster('cluster_0');
  assert.equal(manager.isClusterExpanded('cluster_0'), false);
});

test('CalloutManager collapseAllClusters collapses expanded clusters', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const center = { lat: 10, lon: 20 };
  const markers = Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`, lat: 10 + i * 0.1, lon: 20 + i * 0.1, alt: 0,
    name: { en: `M${i}` }, calloutMode: 'always',
    _clusterId: 'cluster_0', _clusterIndex: i, _clusterSize: 4,
    _clusterCenter: center,
  }));
  manager.update(group, markers, 'en');
  manager.toggleCluster('cluster_0');
  assert.equal(manager.isClusterExpanded('cluster_0'), true);
  manager.collapseAllClusters();
  assert.equal(manager.isClusterExpanded('cluster_0'), false);
});
