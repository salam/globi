// tests/studio/editorStore.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EditorStore } from '../../studio/state/editorStore.js';

describe('EditorStore', () => {
  it('starts with default state', () => {
    const store = new EditorStore();
    const s = store.getState();
    assert.equal(s.activeTool, 'select');
    assert.deepEqual(s.selectedIds, []);
    assert.equal(s.propertiesVisible, true);
    assert.equal(s.timelineVisible, true);
    assert.equal(s.hudVisible, true);
    assert.equal(s.playbackState, 'stopped');
    assert.equal(s.playheadMs, 0);
  });

  it('dispatches tool change', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'setTool', tool: 'marker' });
    assert.equal(store.getState().activeTool, 'marker');
  });

  it('dispatches selection', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'select', ids: ['m1', 'm2'] });
    assert.deepEqual(store.getState().selectedIds, ['m1', 'm2']);
  });

  it('dispatches deselect', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'select', ids: ['m1'] });
    store.dispatch({ type: 'deselect' });
    assert.deepEqual(store.getState().selectedIds, []);
  });

  it('toggles panel visibility', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'togglePanel', panel: 'properties' });
    assert.equal(store.getState().propertiesVisible, false);
    store.dispatch({ type: 'togglePanel', panel: 'properties' });
    assert.equal(store.getState().propertiesVisible, true);
  });

  it('emits change event', () => {
    const store = new EditorStore();
    let called = false;
    store.on('change', () => { called = true; });
    store.dispatch({ type: 'setTool', tool: 'arc' });
    assert.equal(called, true);
  });

  it('sets playback state', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'setPlayback', state: 'playing' });
    assert.equal(store.getState().playbackState, 'playing');
  });

  it('sets playhead position', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'setPlayhead', ms: 3500 });
    assert.equal(store.getState().playheadMs, 3500);
  });

  it('has scene graph defaults', () => {
    const store = new EditorStore();
    const s = store.getState();
    assert.equal(s.sceneGraphDock, 'left');
    assert.equal(s.sceneGraphPinned, false);
    assert.equal(s.showHiddenObjects, false);
  });

  it('dispatches setSceneGraphDock', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'setSceneGraphDock', dock: 'right' });
    assert.equal(store.getState().sceneGraphDock, 'right');
  });

  it('dispatches toggleSceneGraphPinned', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'toggleSceneGraphPinned' });
    assert.equal(store.getState().sceneGraphPinned, true);
    store.dispatch({ type: 'toggleSceneGraphPinned' });
    assert.equal(store.getState().sceneGraphPinned, false);
  });

  it('dispatches toggleShowHiddenObjects', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'toggleShowHiddenObjects' });
    assert.equal(store.getState().showHiddenObjects, true);
  });
});
