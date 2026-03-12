import test from 'node:test';
import assert from 'node:assert/strict';

import { AttributionManager } from '../src/renderer/attributionManager.js';

function makeScene({ dataSources = [], markers = [], paths = [], arcs = [], regions = [] } = {}) {
  return { dataSources, markers, paths, arcs, regions };
}

test('categorizeSources returns empty arrays when no dataSources', () => {
  const mgr = new AttributionManager();
  const result = mgr.categorizeSources(makeScene(), () => null, { left: 0, top: 0, right: 800, bottom: 600 });
  assert.deepEqual(result.visible, []);
  assert.deepEqual(result.outsideView, []);
  assert.deepEqual(result.noData, []);
});

test('categorizeSources puts source with visible marker in visible', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    markers: [{ id: 'm1', lat: 10, lon: 20, alt: 0, sourceId: 'src-1' }],
  });
  const projectFn = () => ({ clientX: 400, clientY: 300, visible: true });
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };
  const result = mgr.categorizeSources(scene, projectFn, rect);
  assert.equal(result.visible.length, 1);
  assert.equal(result.visible[0].id, 'src-1');
  assert.equal(result.outsideView.length, 0);
  assert.equal(result.noData.length, 0);
});

test('categorizeSources puts source with off-screen marker in outsideView', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    markers: [{ id: 'm1', lat: 10, lon: 20, alt: 0, sourceId: 'src-1' }],
  });
  const projectFn = () => ({ clientX: 400, clientY: 300, visible: false });
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };
  const result = mgr.categorizeSources(scene, projectFn, rect);
  assert.equal(result.visible.length, 0);
  assert.equal(result.outsideView.length, 1);
  assert.equal(result.outsideView[0].id, 'src-1');
});

test('categorizeSources puts unreferenced source in noData', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    markers: [{ id: 'm1', lat: 10, lon: 20, alt: 0, sourceId: '' }],
  });
  const projectFn = () => ({ clientX: 400, clientY: 300, visible: true });
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };
  const result = mgr.categorizeSources(scene, projectFn, rect);
  assert.equal(result.noData.length, 1);
  assert.equal(result.noData[0].id, 'src-1');
});

test('categorizeSources checks arc start and end points', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    arcs: [{ id: 'a1', start: { lat: 0, lon: 0, alt: 0 }, end: { lat: 10, lon: 10, alt: 0 }, sourceId: 'src-1' }],
  });
  let callCount = 0;
  const projectFn = () => {
    callCount++;
    return callCount === 2
      ? { clientX: 400, clientY: 300, visible: true }
      : { clientX: 400, clientY: 300, visible: false };
  };
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };
  const result = mgr.categorizeSources(scene, projectFn, rect);
  assert.equal(result.visible.length, 1);
});

test('categorizeSources samples region geojson vertices', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    regions: [{
      id: 'r1',
      geojson: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
      sourceId: 'src-1',
    }],
  });
  const projectFn = (point) => {
    if (point.lon === 10 && point.lat === 10) return { clientX: 400, clientY: 300, visible: true };
    return { clientX: 400, clientY: 300, visible: false };
  };
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };
  const result = mgr.categorizeSources(scene, projectFn, rect);
  assert.equal(result.visible.length, 1);
});

test('buildAbbreviatedText joins visible source shortNames with middle dot', () => {
  const mgr = new AttributionManager();
  const sources = [
    { id: 'a', shortName: 'NE' },
    { id: 'b', shortName: 'RC' },
    { id: 'c', shortName: 'ISS' },
  ];
  assert.equal(mgr.buildAbbreviatedText(sources), 'NE \u00B7 RC \u00B7 ISS');
});

test('buildAbbreviatedText returns empty string for no sources', () => {
  const mgr = new AttributionManager();
  assert.equal(mgr.buildAbbreviatedText([]), '');
});
