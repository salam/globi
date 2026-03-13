import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAgentAPI, AGENT_MANIFEST } from '../src/accessibility/agentInterface.js';

function mockViewer() {
  const scene = {
    version: 1, locale: 'en', theme: 'photo',
    planet: { id: 'earth' }, projection: 'globe',
    markers: [{ id: 'm1', name: { en: 'Berlin' }, lat: 52.5, lon: 13.4, alt: 0, visualType: 'dot', category: 'capital' }],
    arcs: [], paths: [], regions: [], filters: [], animations: [], dataSources: [], timeRange: null,
  };
  return {
    exportScene: () => ({ ...scene, markers: [...scene.markers] }),
    setScene: (s) => s,
    flyTo: (t, o) => undefined,
    setTheme: (t) => undefined,
    setPlanet: (id) => undefined,
    setInspectMode: (b) => undefined,
    getTheme: () => 'photo',
  };
}

function mockViewState() {
  return {
    getViewAngle: () => ({ lat: 45, lon: 23, zoom: 1.5 }),
    getVisibleEntities: () => ({ markers: [], arcs: [], paths: [], regions: [] }),
    getEntityAtPoint: () => null,
    getViewportBounds: () => ({ north: 70, south: 20, east: 60, west: -15 }),
  };
}

function mockDescriber() {
  return { describeView: (scene, vsq, level) => `Description (${level})` };
}

function mockLlmsTxt() {
  return { formatLlmsTxt: () => '# Globi View State\nbody: earth' };
}

describe('createAgentAPI', () => {
  it('creates an API object with expected methods', () => {
    const api = createAgentAPI({ viewer: mockViewer(), viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    assert.equal(typeof api.state, 'function');
    assert.equal(typeof api.scene, 'function');
    assert.equal(typeof api.visible, 'function');
    assert.equal(typeof api.describe, 'function');
    assert.equal(typeof api.llmsTxt, 'function');
    assert.equal(typeof api.help, 'function');
    assert.equal(typeof api.flyTo, 'function');
    assert.equal(typeof api.addMarker, 'function');
    assert.equal(typeof api.removeMarker, 'function');
    assert.equal(typeof api.export, 'function');
  });

  it('state() returns current view', () => {
    const api = createAgentAPI({ viewer: mockViewer(), viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    const state = api.state();
    assert.equal(state.lat, 45);
    assert.equal(state.lon, 23);
    assert.equal(state.body, 'earth');
  });

  it('help() returns manifest with commands', () => {
    const api = createAgentAPI({ viewer: mockViewer(), viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    const manifest = api.help();
    assert.equal(manifest.version, '1.0');
    assert.ok(Array.isArray(manifest.commands));
    assert.ok(manifest.commands.length > 0);
    assert.ok(manifest.commands.find((c) => c.name === 'flyTo'));
  });

  it('addMarker clones scene and adds marker', () => {
    let setSceneCalled = false;
    const viewer = mockViewer();
    viewer.setScene = (s) => { setSceneCalled = true; return s; };
    const api = createAgentAPI({ viewer, viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    api.addMarker({ name: 'Test', lat: 10, lon: 20 });
    assert.ok(setSceneCalled);
  });

  it('removeMarker clones scene and removes marker', () => {
    let resultScene = null;
    const viewer = mockViewer();
    viewer.setScene = (s) => { resultScene = s; return s; };
    const api = createAgentAPI({ viewer, viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    api.removeMarker('m1');
    assert.ok(resultScene);
    assert.equal(resultScene.markers.length, 0);
  });
});

describe('AGENT_MANIFEST', () => {
  it('has version and commands', () => {
    assert.equal(AGENT_MANIFEST.version, '1.0');
    assert.ok(AGENT_MANIFEST.commands.length > 5);
  });
});
