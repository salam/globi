import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { describeView } from '../src/accessibility/viewDescriber.js';

function sampleScene() {
  return {
    version: 1,
    locale: 'en',
    theme: 'photo',
    planet: { id: 'earth', radius: 1 },
    projection: 'globe',
    markers: [
      { id: 'm1', name: { en: 'Berlin' }, lat: 52.5, lon: 13.4, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'always' },
      { id: 'm2', name: { en: 'Tokyo' }, lat: 35.7, lon: 139.7, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'hover' },
    ],
    arcs: [
      { id: 'a1', name: { en: 'Route' }, start: { lat: 52.5, lon: 13.4 }, end: { lat: 35.7, lon: 139.7 } },
    ],
    paths: [],
    regions: [],
    filters: [],
    animations: [],
    dataSources: [],
    timeRange: null,
  };
}

function mockViewState(opts = {}) {
  return {
    getViewAngle: () => opts.angle ?? { lat: 45, lon: 23, zoom: 1.5 },
    getViewportBounds: () => opts.bounds ?? { north: 70, south: 20, east: 60, west: -15 },
    getVisibleEntities: (scene) => ({
      markers: opts.markers ?? scene.markers,
      arcs: opts.arcs ?? scene.arcs,
      paths: opts.paths ?? [],
      regions: opts.regions ?? [],
    }),
  };
}

describe('describeView', () => {
  it('brief mode produces short text', () => {
    const text = describeView(sampleScene(), mockViewState(), 'brief');
    assert.ok(text.length < 300, `Brief text too long: ${text.length} chars`);
    assert.ok(text.includes('Earth'));
    assert.ok(text.includes('Berlin'));
  });

  it('detailed mode produces longer text', () => {
    const text = describeView(sampleScene(), mockViewState(), 'detailed');
    assert.ok(text.length > 100);
    assert.ok(text.includes('52.5'));
    assert.ok(text.includes('Berlin'));
    assert.ok(text.includes('Tokyo'));
  });

  it('defaults to brief', () => {
    const text = describeView(sampleScene(), mockViewState());
    assert.ok(text.length < 300);
  });

  it('handles empty scene', () => {
    const emptyScene = { ...sampleScene(), markers: [], arcs: [], paths: [], regions: [] };
    const text = describeView(emptyScene, mockViewState({ markers: [], arcs: [] }), 'brief');
    assert.ok(text.includes('Earth'));
    assert.ok(text.includes('0'));
  });

  it('includes zoom description', () => {
    const text = describeView(sampleScene(), mockViewState({ angle: { lat: 0, lon: 0, zoom: 3 } }), 'detailed');
    assert.ok(text.includes('close') || text.includes('zoom'));
  });
});
