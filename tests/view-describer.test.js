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
      { id: 'm3', name: { en: 'Olympus Mons' }, description: { en: 'Largest volcano in the solar system' }, lat: 21.9, lon: -134.0, alt: 0, visualType: 'dot', category: 'landmarks', calloutMode: 'always' },
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

describe('describeView description content', () => {
  it('brief includes description in parentheses when different from name', () => {
    const scene = sampleScene();
    const vsq = mockViewState({ markers: scene.markers });
    const text = describeView(scene, vsq, 'brief');
    assert.ok(text.includes('Olympus Mons (Largest volcano in the solar system)'),
      `Expected description in parentheses, got: ${text}`);
  });

  it('brief omits parentheses when description equals name', () => {
    const scene = sampleScene();
    const vsq = mockViewState({ markers: scene.markers });
    const text = describeView(scene, vsq, 'brief');
    // Berlin has no description, so fallback = name — no parentheses
    assert.ok(!text.includes('Berlin (Berlin)'), 'should not repeat name as description');
  });

  it('detailed includes description as indented line', () => {
    const scene = sampleScene();
    const vsq = mockViewState({ markers: scene.markers });
    const text = describeView(scene, vsq, 'detailed');
    assert.ok(text.includes('Largest volcano in the solar system'),
      `Expected description line, got: ${text}`);
  });

  it('falls back to calloutLabel when description is empty', () => {
    const scene = {
      ...sampleScene(),
      markers: [
        { id: 'm4', name: { en: 'ISS' }, calloutLabel: { en: 'International Space Station' }, lat: 10, lon: 20, alt: 0, visualType: 'model', category: 'default', calloutMode: 'always' },
      ],
    };
    const vsq = mockViewState({ markers: scene.markers });
    const text = describeView(scene, vsq, 'brief');
    assert.ok(text.includes('ISS (International Space Station)'),
      `Expected calloutLabel fallback, got: ${text}`);
  });

  it('falls back to name when both description and calloutLabel are empty', () => {
    const scene = sampleScene();
    const vsq = mockViewState({ markers: [scene.markers[0]] }); // Berlin, no description/calloutLabel
    const text = describeView(scene, vsq, 'brief');
    assert.ok(text.includes('Berlin'), 'should include name');
    assert.ok(!text.includes('Berlin ('), 'should not have parenthetical when falling back to name');
  });
});
