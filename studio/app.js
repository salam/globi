// studio/app.js
import '../src/components/globi-viewer.js';
import { readScene } from './state/sessionTransfer.js';
import { exportSceneToGeoJSON } from '../src/io/geojson.js';
import { showModal } from './components/modal.js';
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
import { getCelestialPreset } from '../src/scene/celestial.js';

function downloadText(text, filename, mimeType = 'text/plain') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Init ---
const viewer = document.getElementById('viewer');
const studioEl = document.getElementById('studio') || document.querySelector('.studio');
const viewportEl = document.getElementById('viewport');

const EMPTY_SCENE = { version: 1, markers: [], arcs: [], paths: [], regions: [], animations: [], cameraAnimation: [], filters: [], dataSources: [] };

// Load scene from sessionStorage or create empty
const transferred = await readScene();
let scene = transferred || EMPTY_SCENE;

// Extract embedded camera state (set by viewer on Open Studio)
const _initialCameraState = scene._cameraState || null;
delete scene._cameraState;

let isDirty = false;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// State
const editorStore = new EditorStore();
const undoRedo = new UndoRedo(50);
undoRedo.push(scene);

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
  getCamera: () => controllerProxy.getCameraState(),
  onFlyTo: (target, opts) => controllerProxy.flyTo(target, opts),
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
// Delegate to viewer's public API (screenToLatLon, hitTest, getCameraState, flyTo)
const controllerProxy = {
  hitTest: (x, y) => viewer.hitTest(x, y),
  screenToLatLon: (x, y) => viewer.screenToLatLon(x, y),
  getCameraState: () => viewer.getCameraState(),
  flyTo: (target, opts) => viewer.flyTo(target, opts),
  getScene: () => scene,
  setScene: (s) => { scene = s; },
};

function pushScene(newScene) {
  scene = newScene;
  isDirty = true;
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
      isDirty = false;
      break;
    }
    case 'exportJSON': {
      const json = JSON.stringify(scene, null, 2);
      downloadText(json, 'globi-scene.json', 'application/json');
      isDirty = false;
      break;
    }
    case 'exportGeoJSON': {
      const geojson = exportSceneToGeoJSON(scene);
      downloadText(JSON.stringify(geojson, null, 2), 'globi-scene.geojson', 'application/json');
      break;
    }
    case 'exportOBJ': {
      alert('OBJ export coming soon.');
      break;
    }
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
    case 'zoomToFit': {
      const ctrl = getController();
      if (ctrl?.zoomToFit) ctrl.zoomToFit();
      break;
    }
    case 'resetCamera': {
      const ctrl = getController();
      if (ctrl?.resetCamera) ctrl.resetCamera();
      break;
    }
    case 'togglePreview': previewMode.toggle(); break;
    case 'openChatGPT': window.open('https://chat.openai.com/', '_blank'); break;
    case 'openClaude': window.open('https://claude.ai/', '_blank'); break;
    case 'openDocs': window.open('https://globi.world/docs', '_blank'); break;
    case 'showShortcuts': {
      const content = document.createElement('div');
      const shortcuts = [
        ['V', 'Select tool'], ['M', 'Marker tool'], ['A', 'Arc tool'],
        ['L', 'Path (line) tool'], ['D', 'Draw tool'], ['Shift+R', 'Region tool'],
        ['P', 'Toggle properties'], ['T', 'Toggle timeline'], ['H', 'Toggle HUD'],
        ['F', 'Zoom to fit'], ['R', 'Reset camera'],
        ['Space', 'Preview mode'], ['Escape', 'Cancel / deselect'],
        ['Enter', 'Finish path/region'], ['Delete', 'Delete selected'],
        ['Ctrl+Z', 'Undo'], ['Ctrl+Shift+Z', 'Redo'],
        ['Ctrl+D', 'Duplicate'], ['Ctrl+A', 'Select all'],
        ['Ctrl+S', 'Save as file'], ['Ctrl+N', 'New scene'],
        ['Ctrl+O', 'Open file'], ['?', 'Show shortcuts'],
      ];
      const table = document.createElement('table');
      for (const [key, desc] of shortcuts) {
        const tr = document.createElement('tr');
        const tdKey = document.createElement('td');
        tdKey.textContent = key;
        tdKey.style.fontFamily = 'monospace';
        tdKey.style.color = '#7a7aff';
        const tdDesc = document.createElement('td');
        tdDesc.textContent = desc;
        tr.appendChild(tdKey);
        tr.appendChild(tdDesc);
        table.appendChild(tr);
      }
      content.appendChild(table);
      showModal('Keyboard Shortcuts', content);
      break;
    }
    case 'showAbout': {
      const content = document.createElement('div');
      const title = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = 'Globi Studio';
      title.appendChild(strong);
      content.appendChild(title);
      const desc = document.createElement('p');
      desc.textContent = 'A visual editor for Globi scenes.';
      content.appendChild(desc);
      const tagline = document.createElement('p');
      tagline.style.marginTop = '12px';
      tagline.style.color = '#777';
      tagline.textContent = 'Built with vanilla JS, Three.js, and love.';
      content.appendChild(tagline);
      const linkP = document.createElement('p');
      linkP.style.marginTop = '8px';
      const link = document.createElement('a');
      link.href = 'https://globi.world/docs';
      link.target = '_blank';
      link.rel = 'noopener';
      link.style.color = '#7a7aff';
      link.textContent = 'Documentation';
      linkP.appendChild(link);
      content.appendChild(linkP);
      showModal('About Globi Studio', content);
      break;
    }
    case 'closeStudio': {
      if (window.__studioOverlay) {
        window.__studioOverlay.close();
      } else if (isDirty) {
        if (confirm('You have unsaved changes. Close anyway?')) {
          isDirty = false;
          window.close();
        }
      } else {
        window.close();
      }
      break;
    }
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
  if (entityType === 'scene') {
    if (field.startsWith('planet.')) {
      const planetField = field.slice('planet.'.length);
      if (planetField === 'id') {
        const preset = getCelestialPreset(value);
        scene = {
          ...scene,
          planet: {
            ...preset,
            lightingMode: scene.planet?.lightingMode ?? 'fixed',
            lightingTimestamp: scene.planet?.lightingTimestamp ?? '',
          },
        };
      } else {
        scene = { ...scene, planet: { ...scene.planet, [planetField]: value } };
      }
    } else if (field.startsWith('viewerUi.')) {
      const uiField = field.slice('viewerUi.'.length);
      scene = { ...scene, viewerUi: { ...(scene.viewerUi || {}), [uiField]: value } };
    } else {
      scene = { ...scene, [field]: value };
    }
    pushScene(scene);
    return;
  }

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
  // Restore camera: prefer transferred state, fall back to scene initial fields
  const camLat = _initialCameraState?.centerLat ?? scene.initialLat;
  const camLon = _initialCameraState?.centerLon ?? scene.initialLon;
  const camZoom = _initialCameraState?.zoom ?? scene.initialZoom;
  if ((camLat != null || camLon != null || camZoom != null) && viewer.flyTo) {
    requestAnimationFrame(() => {
      viewer.flyTo({
        lat: camLat ?? 0,
        lon: camLon ?? 0,
      }, { zoom: camZoom ?? 1 });
    });
  }
});
