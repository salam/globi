import test from 'node:test';
import assert from 'node:assert/strict';
import { GeoLabelManager } from '../src/renderer/geoLabelManager.js';
import { getBodyLabels, getBodyIdsWithLabels } from '../src/renderer/bodyLabels.js';
import { Group } from 'three';

test('getBodyLabels returns Earth labels by default', () => {
  const labels = getBodyLabels('earth');
  assert.ok(labels.length >= 12);
  const regions = labels.filter(l => l.style === 'region');
  const oceans = labels.filter(l => l.style === 'ocean');
  assert.equal(regions.length, 7);
  assert.equal(oceans.length, 5);
});

test('getBodyLabels returns Mars landmarks', () => {
  const labels = getBodyLabels('mars');
  const names = labels.map(l => l.text);
  assert.ok(names.includes('Olympus Mons'));
  assert.ok(names.includes('Valles Marineris'));
});

test('getBodyLabels returns Saturn landmarks', () => {
  const labels = getBodyLabels('saturn');
  const names = labels.map(l => l.text);
  assert.ok(names.includes('North Polar Hexagon'));
});

test('getBodyLabels returns Moon landmarks with maria', () => {
  const labels = getBodyLabels('moon');
  const names = labels.map(l => l.text);
  assert.ok(names.includes('Sea of Tranquility'));
  assert.ok(names.includes('Tycho'));
});

test('getBodyLabels falls back to Earth for unknown body', () => {
  const labels = getBodyLabels('unknown-planet');
  const names = labels.map(l => l.text);
  assert.ok(names.includes('AFRICA'));
});

test('getBodyIdsWithLabels returns all 13 bodies', () => {
  const ids = getBodyIdsWithLabels();
  assert.ok(ids.length >= 13);
  assert.ok(ids.includes('earth'));
  assert.ok(ids.includes('mars'));
  assert.ok(ids.includes('saturn'));
  assert.ok(ids.includes('titan'));
});

test('GeoLabelManager creates meshes for Earth labels', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true, bodyId: 'earth' });
  assert.equal(group.children.length, 12);
});

test('GeoLabelManager creates meshes for Mars labels', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true, bodyId: 'mars' });
  const marsLabels = getBodyLabels('mars');
  assert.equal(group.children.length, marsLabels.length);
  const labelTexts = group.children.map(c => c.userData.label);
  assert.ok(labelTexts.includes('Olympus Mons'));
});

test('GeoLabelManager rebuilds labels when bodyId changes', () => {
  const manager = new GeoLabelManager();
  const group = new Group();

  manager.update(group, { showLabels: true, bodyId: 'earth' });
  assert.equal(group.children.length, 12);
  const earthLabels = group.children.map(c => c.userData.label);
  assert.ok(earthLabels.includes('AFRICA'));

  manager.update(group, { showLabels: true, bodyId: 'mars' });
  const marsLabelCount = getBodyLabels('mars').length;
  assert.equal(group.children.length, marsLabelCount);
  const marsLabels = group.children.map(c => c.userData.label);
  assert.ok(marsLabels.includes('Olympus Mons'));
  assert.ok(!marsLabels.includes('AFRICA'));
});

test('GeoLabelManager toggles visibility without rebuilding', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true, bodyId: 'earth' });
  assert.equal(group.children.length, 12);

  manager.update(group, { showLabels: false, bodyId: 'earth' });
  assert.equal(group.visible, false);
  assert.equal(group.children.length, 12);

  manager.update(group, { showLabels: true, bodyId: 'earth' });
  assert.equal(group.visible, true);
});

test('GeoLabelManager dispose clears all meshes', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true, bodyId: 'earth' });
  manager.dispose();
  assert.equal(group.children.length, 0);
});

test('each label mesh has position attribute with vertices', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true, bodyId: 'earth' });
  for (const child of group.children) {
    assert.ok(child.geometry.attributes.position.count > 0, `mesh for ${child.userData.label} has no vertices`);
  }
});

test('label meshes have depthWrite false and transparent true', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true, bodyId: 'earth' });
  for (const child of group.children) {
    assert.equal(child.material.depthWrite, false);
    assert.equal(child.material.transparent, true);
  }
});

test('each label mesh has userData with label text', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true, bodyId: 'earth' });
  const labelTexts = group.children.map(c => c.userData.label);
  assert.ok(labelTexts.includes('AFRICA'));
  assert.ok(labelTexts.includes('Pacific Ocean'));
});

test('feature-style labels use warm color fill', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true, bodyId: 'mars' });
  const features = group.children.filter(c => {
    const label = getBodyLabels('mars').find(l => l.text === c.userData.label);
    return label?.style === 'feature';
  });
  assert.ok(features.length > 0, 'Mars should have feature-style labels');
});

test('GeoLabelManager accepts labelStyles override', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  const overrides = {
    continent: 'rgba(34, 34, 34, 0.5)',
    ocean: 'rgba(68, 68, 68, 0.4)',
    region: 'rgba(34, 34, 34, 0.5)',
    feature: 'rgba(51, 51, 51, 0.45)',
  };
  manager.update(group, { showLabels: true, bodyId: 'earth', labelStyles: overrides });
  assert.equal(group.children.length, 12);
});

test('GeoLabelManager rebuilds when labelStyles change', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true, bodyId: 'earth' });
  assert.equal(group.children.length, 12);

  const overrides = {
    continent: 'rgba(34, 34, 34, 0.5)',
    ocean: 'rgba(68, 68, 68, 0.4)',
    region: 'rgba(34, 34, 34, 0.5)',
    feature: 'rgba(51, 51, 51, 0.45)',
  };
  manager.update(group, { showLabels: true, bodyId: 'earth', labelStyles: overrides });
  assert.equal(group.children.length, 12);
});
