import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let StudioOverlay, dom;
beforeEach(async () => {
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="host"><div id="viewer"></div></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.confirm = () => true;
  ({ StudioOverlay } = await import('../../studio/studioOverlay.js'));
});

describe('StudioOverlay', () => {
  it('creates overlay on document.body', () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    const overlayEl = document.querySelector('.studio-overlay');
    assert.ok(overlayEl, 'overlay element should exist');
    overlay.close();
  });

  it('reparents viewer into overlay viewport', () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    const viewport = document.querySelector('.studio-overlay .viewport');
    assert.ok(viewport, 'viewport slot should exist');
    assert.equal(viewer.parentElement, viewport, 'viewer should be inside viewport');
    overlay.close();
  });

  it('restores viewer to original position on close', () => {
    const viewer = document.getElementById('viewer');
    const host = document.getElementById('host');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    overlay.close();
    assert.equal(viewer.parentElement, host, 'viewer should be back in host');
    assert.ok(!document.querySelector('.studio-overlay'), 'overlay should be removed');
  });

  it('blocks close when isDirty and user cancels', () => {
    globalThis.confirm = () => false;
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    overlay.isDirty = true;
    overlay.close();
    assert.ok(document.querySelector('.studio-overlay'), 'overlay should still exist');
    // Cleanup
    globalThis.confirm = () => true;
    overlay.close();
  });

  it('uses .studio class (not #studio id) on inner container', () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    const studioDiv = document.querySelector('.studio-overlay .studio');
    assert.ok(studioDiv, 'should use .studio class to match styles.css');
    overlay.close();
  });
});
