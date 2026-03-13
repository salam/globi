import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatLlmsTxt } from '../src/io/llmsTxt.js';

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
      { id: 'a1', name: { en: 'Berlin-Tokyo' }, start: { lat: 52.5, lon: 13.4 }, end: { lat: 35.7, lon: 139.7 }, maxAltitude: 0.3, color: '#ff0' },
    ],
    paths: [],
    regions: [],
    filters: [],
    animations: [],
    dataSources: [],
    timeRange: null,
  };
}

function mockViewState(visibleMarkers, visibleArcs) {
  return {
    getViewAngle: () => ({ lat: 45.2, lon: 23.4, zoom: 1.5 }),
    getViewportBounds: () => ({ north: 70, south: 20, east: 60, west: -15 }),
    getVisibleEntities: (scene) => ({
      markers: visibleMarkers ?? scene.markers,
      arcs: visibleArcs ?? scene.arcs,
      paths: [],
      regions: [],
    }),
  };
}

describe('formatLlmsTxt', () => {
  it('produces structured text with headers', () => {
    const scene = sampleScene();
    const vsq = mockViewState();
    const output = formatLlmsTxt(scene, vsq);
    assert.ok(output.includes('# Globi View State'));
    assert.ok(output.includes('body: earth'));
    assert.ok(output.includes('projection: globe'));
    assert.ok(output.includes('theme: photo'));
  });

  it('includes view angle', () => {
    const output = formatLlmsTxt(sampleScene(), mockViewState());
    assert.ok(output.includes('view: lat=45.2 lon=23.4 zoom=1.5'));
  });

  it('includes visible markers with total count', () => {
    const scene = sampleScene();
    const vsq = mockViewState([scene.markers[0]], []); // only Berlin visible, no arcs
    const output = formatLlmsTxt(scene, vsq);
    assert.ok(output.includes('# Visible Markers (1 of 2)'));
    assert.ok(output.includes('Berlin'));
    assert.ok(!output.includes('Tokyo'));
  });

  it('includes available actions section', () => {
    const output = formatLlmsTxt(sampleScene(), mockViewState());
    assert.ok(output.includes('# Available Actions'));
    assert.ok(output.includes('flyTo'));
  });

  it('handles empty scene', () => {
    const scene = { ...sampleScene(), markers: [], arcs: [], paths: [], regions: [] };
    const output = formatLlmsTxt(scene, mockViewState([], []));
    assert.ok(output.includes('# Visible Markers (0)'));
    assert.ok(output.includes('# Visible Arcs (0)'));
  });
});
