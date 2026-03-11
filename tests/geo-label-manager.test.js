import test from 'node:test';
import assert from 'node:assert/strict';
import { GeoLabelManager, GEO_LABELS } from '../src/renderer/geoLabelManager.js';
import { Group } from 'three';

test('GEO_LABELS contains 12 entries (7 continents + 5 oceans)', () => {
  assert.equal(GEO_LABELS.length, 12);
  const continents = GEO_LABELS.filter(l => l.style === 'continent');
  const oceans = GEO_LABELS.filter(l => l.style === 'ocean');
  assert.equal(continents.length, 7);
  assert.equal(oceans.length, 5);
});

test('GeoLabelManager creates meshes for all labels', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  assert.equal(group.children.length, 12);
});

test('GeoLabelManager toggles visibility without rebuilding', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  assert.equal(group.children.length, 12);

  manager.update(group, { showLabels: false });
  assert.equal(group.visible, false);
  assert.equal(group.children.length, 12);

  manager.update(group, { showLabels: true });
  assert.equal(group.visible, true);
});

test('GeoLabelManager dispose clears all meshes', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  manager.dispose();
  assert.equal(group.children.length, 0);
});

test('each label mesh has position attribute with vertices', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  for (const child of group.children) {
    assert.ok(child.geometry.attributes.position.count > 0, `mesh for ${child.userData.label} has no vertices`);
  }
});

test('label meshes have depthWrite false and transparent true', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  for (const child of group.children) {
    assert.equal(child.material.depthWrite, false);
    assert.equal(child.material.transparent, true);
  }
});

test('each label mesh has userData with label text', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  const labelTexts = group.children.map(c => c.userData.label);
  assert.ok(labelTexts.includes('AFRICA'));
  assert.ok(labelTexts.includes('Pacific Ocean'));
});
