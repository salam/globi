import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ViewStateQuery } from '../src/accessibility/viewStateQuery.js';

function mockGlobeRenderer(cameraState = { centerLat: 45, centerLon: 23, zoom: 1.5 }) {
  return {
    type: 'globe',
    getCameraState: () => cameraState,
    projectPointToClient(point) {
      // Real 3D renderer returns { clientX, clientY, visible }
      return { clientX: (point.lon + 180) * 2, clientY: (90 - point.lat) * 2, visible: true };
    },
    getCanvasRect: () => ({ left: 0, top: 0, width: 720, height: 360 }),
    hitTest: (x, y) => null,
  };
}

function mockFlatRenderer(cameraState = { centerLat: 45, centerLon: 23, zoom: 1.5 }) {
  return {
    type: 'flat',
    getCameraState: () => cameraState,
    projectPointToClient(lat, lon) {
      return { x: (lon + 180) * 2, y: (90 - lat) * 2 };
    },
    getCanvasRect: () => ({ left: 0, top: 0, width: 720, height: 360 }),
    hitTest: (x, y) => null,
  };
}

function sampleScene() {
  return {
    version: 1, locale: 'en', theme: 'photo',
    planet: { id: 'earth', radius: 1 }, projection: 'globe',
    markers: [
      { id: 'm1', name: { en: 'Berlin' }, lat: 52.5, lon: 13.4, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'always' },
      { id: 'm2', name: { en: 'Tokyo' }, lat: 35.7, lon: 139.7, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'hover' },
    ],
    arcs: [{ id: 'a1', name: { en: 'Berlin-Tokyo' }, start: { lat: 52.5, lon: 13.4 }, end: { lat: 35.7, lon: 139.7 }, maxAltitude: 0.3, color: '#ff0' }],
    paths: [], regions: [], filters: [], animations: [], dataSources: [], timeRange: null,
  };
}

describe('ViewStateQuery', () => {
  it('returns null view angle when no renderer set', () => {
    const vsq = new ViewStateQuery();
    assert.equal(vsq.getViewAngle(), null);
  });

  it('returns view angle from globe renderer', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer());
    const angle = vsq.getViewAngle();
    assert.equal(angle.lat, 45);
    assert.equal(angle.lon, 23);
    assert.equal(angle.zoom, 1.5);
  });

  it('returns view angle from flat renderer', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockFlatRenderer({ centerLat: 10, centerLon: 20, zoom: 2 }));
    const angle = vsq.getViewAngle();
    assert.equal(angle.lat, 10);
    assert.equal(angle.lon, 20);
    assert.equal(angle.zoom, 2);
  });

  it('returns visible entities within viewport', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer());
    const visible = vsq.getVisibleEntities(sampleScene());
    assert.equal(visible.markers.length, 2);
    assert.equal(visible.arcs.length, 1);
  });

  it('returns empty visible entities when no renderer', () => {
    const vsq = new ViewStateQuery();
    const visible = vsq.getVisibleEntities(sampleScene());
    assert.deepEqual(visible, { markers: [], arcs: [], paths: [], regions: [] });
  });

  it('projects point uniformly across renderer types', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer());
    const p1 = vsq.project(52.5, 13.4, 0);
    assert.ok(p1 !== null);
    vsq.setRenderer(mockFlatRenderer());
    const p2 = vsq.project(52.5, 13.4, 0);
    assert.ok(p2 !== null);
  });

  it('getViewportBounds returns bounding box', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer({ centerLat: 45, centerLon: 23, zoom: 1 }));
    const bounds = vsq.getViewportBounds();
    assert.ok(typeof bounds.north === 'number');
    assert.ok(bounds.north > bounds.south);
  });
});

describe('ViewStateQuery.project() property normalization', () => {
  it('normalizes { clientX, clientY } from 3D renderer to { x, y }', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer());
    const pt = vsq.project(52.5, 13.4, 0);
    assert.ok(pt !== null);
    assert.equal(typeof pt.x, 'number');
    assert.equal(typeof pt.y, 'number');
    assert.equal(pt.clientX, undefined, 'should not expose clientX');
  });

  it('passes through { x, y } from flat renderer unchanged', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockFlatRenderer());
    const pt = vsq.project(52.5, 13.4, 0);
    assert.ok(pt !== null);
    assert.equal(typeof pt.x, 'number');
    assert.equal(typeof pt.y, 'number');
  });

  it('getVisibleEntities finds markers with 3D renderer returning { clientX, clientY }', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer());
    const visible = vsq.getVisibleEntities(sampleScene());
    assert.ok(visible.markers.length > 0, 'should find at least one visible marker');
  });
});
