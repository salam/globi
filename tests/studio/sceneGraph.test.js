// tests/studio/sceneGraph.test.js
import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Set up JSDOM once before import (ES module cache means only first import matters)
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="sg"></div></body></html>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.window = dom.window;

// Import once after DOM is set up
const { SceneGraph } = await import('../../studio/components/sceneGraph.js');

const SAMPLE_SCENE = {
  locale: 'en',
  markers: [
    { id: 'm1', name: { en: 'Berlin' }, lat: 52.52, lon: 13.4, color: '#ff6b6b' },
    { id: 'm2', name: { en: 'Tokyo' }, lat: 35.68, lon: 139.69, color: '#ff6b6b' },
  ],
  arcs: [
    { id: 'a1', name: { en: 'Berlin to Tokyo' }, start: { lat: 52.52, lon: 13.4 }, end: { lat: 35.68, lon: 139.69 }, color: '#ffd000' },
  ],
  paths: [],
  regions: [
    { id: 'r1', name: { en: 'Europe' }, geojson: { type: 'Polygon', coordinates: [] }, capColor: '#4caf50' },
  ],
};

describe('SceneGraph', () => {
  beforeEach(() => {
    // Reset the container for each test
    const sg = document.getElementById('sg');
    while (sg.firstChild) sg.removeChild(sg.firstChild);
  });

  it('renders group headers for all four entity types', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const headers = container.querySelectorAll('.sg-group-header');
    assert.equal(headers.length, 4);
  });

  it('renders entity items under correct groups', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const items = container.querySelectorAll('.sg-item');
    // 2 markers + 1 arc + 0 paths + 1 region = 4
    assert.equal(items.length, 4);
  });

  it('shows entity count in group header', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const headers = container.querySelectorAll('.sg-group-header');
    const markerHeader = headers[0];
    assert.ok(markerHeader.textContent.includes('2'));
  });

  it('marks selected items', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, ['m1']);
    const selected = container.querySelectorAll('.sg-item.selected');
    assert.equal(selected.length, 1);
  });

  it('displays localized entity names', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const items = container.querySelectorAll('.sg-item-name');
    assert.equal(items[0].textContent, 'Berlin');
  });

  it('collapses group when header clicked', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const header = container.querySelector('.sg-group-header');
    header.click();
    const chevron = header.querySelector('.sg-group-chevron');
    assert.ok(chevron.classList.contains('collapsed'));
  });

  it('dims entities with visible === false', () => {
    const sceneWithHidden = {
      ...SAMPLE_SCENE,
      markers: [
        { id: 'm1', name: { en: 'Berlin' }, visible: false, color: '#ff6b6b' },
      ],
    };
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(sceneWithHidden, []);
    const item = container.querySelector('.sg-item');
    assert.ok(item.classList.contains('hidden-entity'));
  });
});
