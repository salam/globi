import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let StudioOverlay, dom;
beforeEach(async () => {
  dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="host"><div id="viewer"></div></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.confirm = () => true;
  ({ StudioOverlay } = await import('../../studio/studioOverlay.js'));
});

describe('StudioOverlay', () => {
  it('creates overlay on document.body', async () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    await overlay.open();
    const overlayEl = document.querySelector('.studio-overlay');
    assert.ok(overlayEl, 'overlay element should exist');
    overlay.close();
  });

  it('reparents viewer into overlay viewport', async () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    await overlay.open();
    const viewport = document.querySelector('.studio-overlay .viewport');
    assert.ok(viewport, 'viewport slot should exist');
    assert.equal(viewer.parentElement, viewport, 'viewer should be inside viewport');
    overlay.close();
  });

  it('restores viewer to original position on close', async () => {
    const viewer = document.getElementById('viewer');
    const host = document.getElementById('host');
    const overlay = new StudioOverlay(viewer);
    await overlay.open();
    overlay.close();
    assert.equal(viewer.parentElement, host, 'viewer should be back in host');
    assert.ok(!document.querySelector('.studio-overlay'), 'overlay should be removed');
  });

  it('blocks close when isDirty and user cancels', async () => {
    globalThis.confirm = () => false;
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    await overlay.open();
    overlay.isDirty = true;
    overlay.close();
    assert.ok(document.querySelector('.studio-overlay'), 'overlay should still exist');
    // Cleanup
    globalThis.confirm = () => true;
    overlay.close();
  });

  it('uses .studio class and #studio id on inner container', async () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    await overlay.open();
    const studioDiv = document.querySelector('.studio-overlay .studio');
    assert.ok(studioDiv, 'should use .studio class to match styles.css');
    assert.equal(studioDiv.id, 'studio', 'should use #studio id for app.js');
    overlay.close();
  });

  it('injects Studio CSS link into head', async () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer, { studioBase: '/studio/' });
    await overlay.open();
    const link = document.querySelector('link[data-studio]');
    assert.ok(link, 'CSS link should be injected');
    assert.ok(link.href.includes('styles.css'), 'should point to styles.css');
    overlay.close();
    assert.ok(!document.querySelector('link[data-studio]'), 'CSS link should be removed on close');
  });
});
