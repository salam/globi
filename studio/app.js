// studio/app.js
import '../src/components/globi-viewer.js';
import { readScene } from './state/sessionTransfer.js';
import { EditorStore } from './state/editorStore.js';
import { UndoRedo } from './state/undoRedo.js';
import { MenuBar } from './components/menuBar.js';
import { ToolStrip } from './components/toolStrip.js';
import { PropertiesPanel } from './components/propertiesPanel.js';
import { Timeline } from './components/timeline.js';
import { EasingEditor } from './components/easingEditor.js';
import { PreviewMode } from './components/previewMode.js';
import { ToolManager } from './tools/toolManager.js';
import { SelectTool } from './tools/selectTool.js';
import { MarkerTool } from './tools/markerTool.js';
import { ArcTool } from './tools/arcTool.js';
import { PathTool } from './tools/pathTool.js';
import { RegionTool } from './tools/regionTool.js';
import { DrawTool } from './tools/drawTool.js';

// --- Init ---
const viewer = document.getElementById('viewer');
const studioEl = document.getElementById('studio');
const viewportEl = document.getElementById('viewport');

const EMPTY_SCENE = { version: 1, markers: [], arcs: [], paths: [], regions: [], animations: [], cameraAnimation: [], filters: [], dataSources: [] };

// Load scene from sessionStorage or create empty
const transferred = await readScene();
let scene = transferred || EMPTY_SCENE;

// State
const editorStore = new EditorStore();
const undoRedo = new UndoRedo(50);
undoRedo.push(scene);

// Wait for viewer to be ready (custom element)
function getController() {
  return viewer._controller || viewer.controller || null;
}

// --- UI Components ---
const menuBar = new MenuBar(document.getElementById('menu-bar'), {
  onAction: handleMenuAction,
});

const toolStrip = new ToolStrip(document.getElementById('tool-strip'), {
  onToolChange: (toolName) => {
    editorStore.dispatch({ type: 'setTool', tool: toolName });
  },
});

const propsPanel = new PropertiesPanel(document.getElementById('properties'), {
  scene,
  selectedIds: [],
  locale: scene.locale || 'en',
  onChange: handlePropertyChange,
});
propsPanel.render();

const timeline = new Timeline(document.getElementById('timeline'), {
  scene,
  locale: scene.locale || 'en',
  playheadMs: 0,
  onPlayheadChange: (ms) => editorStore.dispatch({ type: 'setPlayhead', ms }),
  onVisibilityChange: () => {},
  onTransport: handleTransport,
});
timeline.render();

const easingEditor = new EasingEditor(viewportEl, { onSelect: () => {} });

const previewMode = new PreviewMode({
  studioEl,
  onEnter: () => editorStore.dispatch({ type: 'setPlayback', state: 'playing' }),
  onExit: () => editorStore.dispatch({ type: 'setPlayback', state: 'stopped' }),
});

// --- Tools ---
const controller = {
  hitTest: () => null,
  screenToLatLon: () => null,
  getScene: () => scene,
  setScene: (s) => { scene = s; },
};

// Create a placeholder for controller that will be populated when viewer is ready
const controllerProxy = new Proxy(controller, {
  get(target, prop) {
    const real = getController();
    if (real && typeof real[prop] === 'function') return real[prop].bind(real);
    return target[prop];
  }
});

function pushScene(newScene) {
  scene = newScene;
  undoRedo.push(scene);
  if (viewer.setScene) viewer.setScene(scene);
  updateUI();
}

function updateUI() {
  const state = editorStore.getState();
  propsPanel.update({ scene, selectedIds: state.selectedIds });
  timeline.update({ scene, playheadMs: state.playheadMs });
}

const selectTool = new SelectTool({
  controller: controllerProxy,
  onSelect: (entity) => {
    editorStore.dispatch({ type: 'select', ids: [entity.id] });
    updateUI();
  },
  onDeselect: () => {
    editorStore.dispatch({ type: 'deselect' });
    updateUI();
  },
  onMove: (id, latLon) => {
    const marker = scene.markers.find(m => m.id === id);
    if (marker) {
      marker.lat = latLon.lat;
      marker.lon = latLon.lon;
      pushScene(scene);
    }
  },
});

const markerTool = new MarkerTool({
  controller: controllerProxy,
  onPlace: (marker) => {
    scene.markers.push(marker);
    pushScene({ ...scene });
    editorStore.dispatch({ type: 'select', ids: [marker.id] });
    editorStore.dispatch({ type: 'setTool', tool: 'select' });
  },
});

const arcTool = new ArcTool({
  controller: controllerProxy,
  onPlace: (arc) => {
    scene.arcs.push(arc);
    pushScene({ ...scene });
    editorStore.dispatch({ type: 'select', ids: [arc.id] });
    editorStore.dispatch({ type: 'setTool', tool: 'select' });
  },
});

const pathTool = new PathTool({
  controller: controllerProxy,
  onPlace: (path) => {
    scene.paths.push(path);
    pushScene({ ...scene });
    editorStore.dispatch({ type: 'select', ids: [path.id] });
    editorStore.dispatch({ type: 'setTool', tool: 'select' });
  },
});

const regionTool = new RegionTool({
  controller: controllerProxy,
  onPlace: (region) => {
    scene.regions.push(region);
    pushScene({ ...scene });
    editorStore.dispatch({ type: 'select', ids: [region.id] });
    editorStore.dispatch({ type: 'setTool', tool: 'select' });
  },
});

const drawTool = new DrawTool({
  controller: controllerProxy,
  onPlace: (path) => {
    scene.paths.push(path);
    pushScene({ ...scene });
    editorStore.dispatch({ type: 'select', ids: [path.id] });
    editorStore.dispatch({ type: 'setTool', tool: 'select' });
  },
});

const toolManager = new ToolManager({
  select: selectTool,
  marker: markerTool,
  arc: arcTool,
  path: pathTool,
  region: regionTool,
  draw: drawTool,
});

// --- Wire EditorStore changes to UI ---
editorStore.on('change', (state) => {
  toolStrip.setActive(state.activeTool);
  toolManager.setActive(state.activeTool);

  // Update viewport cursor
  viewportEl.className = `viewport tool-${state.activeTool}`;

  // Panel visibility
  const propsEl = document.getElementById('properties');
  const tlEl = document.getElementById('timeline');
  propsEl.classList.toggle('hidden', !state.propertiesVisible);
  tlEl.classList.toggle('hidden', !state.timelineVisible);
});

// Activate default tool
editorStore.dispatch({ type: 'setTool', tool: 'select' });

// --- Viewport event routing ---
function routeEvent(method, e) {
  const tool = toolManager.getActive();
  if (tool && typeof tool[method] === 'function') tool[method](e);
}

viewportEl.addEventListener('click', (e) => routeEvent('handleClick', e));
viewportEl.addEventListener('dblclick', (e) => routeEvent('handleDoubleClick', e));
viewportEl.addEventListener('mousedown', (e) => routeEvent('handleMouseDown', e));
viewportEl.addEventListener('mousemove', (e) => routeEvent('handleMouseMove', e));
viewportEl.addEventListener('mouseup', (e) => routeEvent('handleMouseUp', e));

// --- Keyboard shortcuts ---
document.addEventListener('keydown', (e) => {
  // Ignore when typing in input fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  // Preview mode exit takes priority
  if (e.key === 'Escape') {
    if (previewMode.isActive) { previewMode.exit(); return; }
    // Cancel tool
    const tool = { path: pathTool, region: regionTool }[toolManager.activeName];
    if (tool?.deactivate) { tool.deactivate(); tool.activate(); }
    editorStore.dispatch({ type: 'deselect' });
    updateUI();
    return;
  }

  if (e.key === ' ') { e.preventDefault(); previewMode.toggle(); return; }

  // Ctrl/Cmd shortcuts
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'z': e.shiftKey ? handleMenuAction('redo') : handleMenuAction('undo'); e.preventDefault(); break;
      case 'd': handleMenuAction('duplicate'); e.preventDefault(); break;
      case 'a': handleMenuAction('selectAll'); e.preventDefault(); break;
      case 's': handleMenuAction('saveAsFile'); e.preventDefault(); break;
      case 'n': handleMenuAction('newScene'); e.preventDefault(); break;
      case 'o': handleMenuAction('newFromFile'); e.preventDefault(); break;
    }
    return;
  }

  // Tool shortcuts
  switch (e.key.toLowerCase()) {
    case 'v': editorStore.dispatch({ type: 'setTool', tool: 'select' }); break;
    case 'm': editorStore.dispatch({ type: 'setTool', tool: 'marker' }); break;
    case 'a': editorStore.dispatch({ type: 'setTool', tool: 'arc' }); break;
    case 'l': editorStore.dispatch({ type: 'setTool', tool: 'path' }); break;
    case 'd': editorStore.dispatch({ type: 'setTool', tool: 'draw' }); break;
    case 'p': editorStore.dispatch({ type: 'togglePanel', panel: 'properties' }); break;
    case 't': editorStore.dispatch({ type: 'togglePanel', panel: 'timeline' }); break;
    case 'h': editorStore.dispatch({ type: 'togglePanel', panel: 'hud' }); break;
    case 'f': handleMenuAction('zoomToFit'); break;
    case 'r': if (e.shiftKey) editorStore.dispatch({ type: 'setTool', tool: 'region' }); else handleMenuAction('resetCamera'); break;
    case 'delete': case 'backspace': handleMenuAction('deleteSelected'); break;
    case '?': handleMenuAction('showShortcuts'); break;
  }

  // Enter to finish path/region
  if (e.key === 'Enter') {
    const tool = { path: pathTool, region: regionTool, draw: drawTool }[toolManager.activeName];
    if (tool?.finish) tool.finish();
  }
});

// --- Menu action handler ---
function handleMenuAction(action) {
  switch (action) {
    case 'newScene':
      pushScene({ ...EMPTY_SCENE, markers: [], arcs: [], paths: [], regions: [], animations: [], cameraAnimation: [], filters: [], dataSources: [] });
      break;
    case 'newFromClipboard':
      navigator.clipboard?.readText().then(text => {
        try {
          const parsed = JSON.parse(text);
          pushScene(parsed);
        } catch (err) { console.warn('Invalid JSON in clipboard'); }
      }).catch(() => { console.warn('Clipboard access denied'); });
      break;
    case 'newFromFile': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = () => {
        const file = input.files[0];
        if (!file) return;
        file.text().then(text => {
          try { pushScene(JSON.parse(text)); } catch (err) { console.warn('Invalid JSON file'); }
        });
      };
      input.click();
      break;
    }
    case 'saveAsFile': {
      const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'globi-scene.json';
      a.click();
      URL.revokeObjectURL(url);
      break;
    }
    case 'exportJSON': case 'exportGeoJSON': case 'exportOBJ':
      console.log(`Export ${action} — not yet wired`);
      break;
    case 'undo': {
      const prev = undoRedo.undo();
      if (prev) { scene = prev; if (viewer.setScene) viewer.setScene(scene); updateUI(); }
      break;
    }
    case 'redo': {
      const next = undoRedo.redo();
      if (next) { scene = next; if (viewer.setScene) viewer.setScene(scene); updateUI(); }
      break;
    }
    case 'deleteSelected': {
      const state = editorStore.getState();
      const ids = new Set(state.selectedIds);
      scene.markers = scene.markers.filter(m => !ids.has(m.id));
      scene.arcs = scene.arcs.filter(a => !ids.has(a.id));
      scene.paths = scene.paths.filter(p => !ids.has(p.id));
      scene.regions = scene.regions.filter(r => !ids.has(r.id));
      editorStore.dispatch({ type: 'deselect' });
      pushScene({ ...scene });
      break;
    }
    case 'duplicate': {
      const state = editorStore.getState();
      for (const id of state.selectedIds) {
        const marker = scene.markers.find(m => m.id === id);
        if (marker) {
          const dup = { ...marker, id: `${marker.id}-dup-${Date.now()}`, lat: marker.lat + 1 };
          scene.markers.push(dup);
        }
      }
      pushScene({ ...scene });
      break;
    }
    case 'selectAll': {
      const allIds = [
        ...scene.markers.map(m => m.id),
        ...scene.arcs.map(a => a.id),
        ...scene.paths.map(p => p.id),
        ...scene.regions.map(r => r.id),
      ];
      editorStore.dispatch({ type: 'select', ids: allIds });
      updateUI();
      break;
    }
    case 'toggleProperties': editorStore.dispatch({ type: 'togglePanel', panel: 'properties' }); break;
    case 'toggleTimeline': editorStore.dispatch({ type: 'togglePanel', panel: 'timeline' }); break;
    case 'toggleHud': editorStore.dispatch({ type: 'togglePanel', panel: 'hud' }); break;
    case 'zoomToFit': break; // TODO: wire to viewer
    case 'resetCamera': break; // TODO: wire to viewer
    case 'togglePreview': previewMode.toggle(); break;
    case 'openChatGPT': window.open('https://chat.openai.com/', '_blank'); break;
    case 'openClaude': window.open('https://claude.ai/', '_blank'); break;
    case 'openDocs': window.open('https://globi.world/docs', '_blank'); break;
    case 'showShortcuts': break; // TODO
    case 'showAbout': break; // TODO
  }
}

function handleTransport(action) {
  const state = editorStore.getState();
  switch (action) {
    case 'play':
      editorStore.dispatch({ type: 'setPlayback', state: state.playbackState === 'playing' ? 'stopped' : 'playing' });
      break;
    case 'skipStart': editorStore.dispatch({ type: 'setPlayhead', ms: 0 }); break;
    case 'skipEnd': editorStore.dispatch({ type: 'setPlayhead', ms: 10000 }); break;
  }
}

function handlePropertyChange(entityType, id, field, value) {
  const collections = { marker: 'markers', arc: 'arcs', path: 'paths', region: 'regions' };
  const col = collections[entityType];
  if (!col) return;
  const entity = scene[col].find(e => e.id === id);
  if (!entity) return;

  if (field === 'name') {
    entity.name = { ...(entity.name || {}), [scene.locale || 'en']: value };
  } else if (field === 'lat' || field === 'lon') {
    entity[field] = parseFloat(value) || 0;
  } else {
    entity[field] = value;
  }
  pushScene({ ...scene });
}

// Initial render — wait for custom element to be defined
customElements.whenDefined('globi-viewer').then(() => {
  if (viewer.setScene) viewer.setScene(scene);
});
