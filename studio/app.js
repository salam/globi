// studio/app.js
import { registerGlobiViewer } from '../src/components/globi-viewer.js';
registerGlobiViewer();
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
import { FilterEditor } from './components/filterEditor.js';
import { DataSourceEditor } from './components/dataSourceEditor.js';
import { ToolManager } from './tools/toolManager.js';
import { SelectTool } from './tools/selectTool.js';
import { MarkerTool } from './tools/markerTool.js';
import { ArcTool } from './tools/arcTool.js';
import { PathTool } from './tools/pathTool.js';
import { RegionTool } from './tools/regionTool.js';
import { DrawTool } from './tools/drawTool.js';
import { getCelestialPreset } from '../src/scene/celestial.js';
import { greatCircleArc } from '../src/math/geo.js';
import { SceneGraph } from './components/sceneGraph.js';

function downloadText(text, filename, mimeType = 'text/plain') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Boot the Studio app. Called automatically when running standalone
 * (studio/index.html), or explicitly by studioBundle.js after the
 * overlay DOM is ready.
 */
export async function boot() {
  // Wait for the <globi-viewer> custom element to be defined so viewer
  // methods (getCameraState, setScene, etc.) are available.
  await customElements.whenDefined('globi-viewer');

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
    getCamera: () => viewer?.getCameraState?.() ?? null,
    onFlyTo: (target, opts) => viewer?.flyTo?.(target, opts),
    onAction: handleMenuAction,
  });
  propsPanel.render();

  const sceneGraph = new SceneGraph(document.getElementById('scene-graph-dock'), {
    onSelect: (ids) => {
      editorStore.dispatch({ type: 'select', ids });
      editorStore.dispatch({ type: 'setTool', tool: 'select' });
      updateUI();
      // Show arc handle if single arc selected
      if (ids.length === 1) {
        const arc = (scene.arcs || []).find(a => a.id === ids[0]);
        if (arc) showArcHandle(arc.id);
        else { viewer.clearPreview(); selectTool.clearArcHandle(); }
      } else { viewer.clearPreview(); selectTool.clearArcHandle(); }
    },
    onVisibilityChange: (groupKey, id, visible) => {
      const entity = scene[groupKey].find(e => e.id === id);
      if (!entity) return;
      if (visible) delete entity.visible;
      else entity.visible = false;
      pushScene({ ...scene });
    },
    onReorder: (groupKey, fromIndex, toIndex) => {
      const arr = [...scene[groupKey]];
      const [item] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, item);
      scene = { ...scene, [groupKey]: arr };
      pushScene(scene);
    },
    onRename: (entityType, id, newName) => {
      const collections = { marker: 'markers', arc: 'arcs', path: 'paths', region: 'regions' };
      const col = collections[entityType];
      if (!col) return;
      const entity = scene[col].find(e => e.id === id);
      if (!entity) return;
      entity.name = { ...(entity.name || {}), [scene.locale || 'en']: newName };
      pushScene({ ...scene });
    },
    onDelete: (ids) => {
      editorStore.dispatch({ type: 'select', ids });
      handleMenuAction('deleteSelected');
    },
    onDuplicate: (ids) => {
      editorStore.dispatch({ type: 'select', ids });
      handleMenuAction('duplicate');
    },
    onTogglePin: () => {
      editorStore.dispatch({ type: 'toggleSceneGraphPinned' });
    },
    onToggleDock: () => {
      const state = editorStore.getState();
      const newDock = state.sceneGraphDock === 'left' ? 'right' : 'left';
      editorStore.dispatch({ type: 'setSceneGraphDock', dock: newDock });
    },
  });
  sceneGraph.render(scene, []);
  const sgResizeHandle = sceneGraph.createResizeHandle();

  const sgDockEl = document.getElementById('scene-graph-dock');
  sgDockEl.addEventListener('mouseenter', () => { sceneGraph.setHovered(true); });
  sgDockEl.addEventListener('mouseleave', () => {
    sceneGraph.setHovered(false);
    const sgState = editorStore.getState();
    if (!sgState.sceneGraphPinned) {
      setTimeout(() => { if (!sceneGraph._pinned) sceneGraph.hide(); }, 500);
    }
  });

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
    onExit: () => {
      editorStore.dispatch({ type: 'setPlayback', state: 'stopped' });
      // Re-apply scene to viewer in case WebGL context was lost during resize
      if (viewer.setScene) viewer.setScene(scene);
    },
  });

  // --- Tools ---
  // Delegate to viewer's public API (screenToLatLon, hitTest, getCameraState, flyTo)
  const controllerProxy = {
    hitTest: (x, y) => viewer.hitTest(x, y),
    screenToLatLon: (x, y) => viewer.screenToLatLon(x, y),
    getCameraState: () => viewer.getCameraState(),
    flyTo: (target, opts) => viewer.flyTo(target, opts),
    projectPointToClient: (point) => viewer.projectPointToClient(point),
    getScene: () => scene,
    setScene: (s) => { scene = s; },
  };

  const previewCallbacks = {
    onPreview: (data) => viewer.setPreview(data),
    onClearPreview: () => viewer.clearPreview(),
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
    sceneGraph.render(scene, state.selectedIds);
  }

  /** Show a draggable handle at the arc's apex when an arc is selected. */
  function showArcHandle(arcId) {
    const arc = (scene.arcs || []).find(a => a.id === arcId);
    if (!arc) { viewer.clearPreview(); selectTool.clearArcHandle(); return; }
    const arcPts = greatCircleArc(arc.start, arc.end, { segments: 32, maxAltitude: arc.maxAltitude ?? 0.5 });
    const apex = arcPts[Math.floor(arcPts.length / 2)];
    viewer.setPreview({
      points: [apex],
      dotColor: '#ff6600',
      lineColor: '#ff6600',
    });
    const screen = viewer.projectPointToClient(apex);
    if (screen) {
      selectTool.setArcHandle({ id: arcId, screenX: screen.clientX, screenY: screen.clientY });
    }
  }

  const selectTool = new SelectTool({
    controller: controllerProxy,
    onSelect: (entity) => {
      editorStore.dispatch({ type: 'select', ids: [entity.id] });
      updateUI();
      if (entity.kind === 'arc') showArcHandle(entity.id);
      else { viewer.clearPreview(); selectTool.clearArcHandle(); }
      const sgState = editorStore.getState();
      if (!sgState.sceneGraphPinned) sceneGraph.autoShow();
    },
    onDeselect: () => {
      editorStore.dispatch({ type: 'deselect' });
      viewer.clearPreview();
      selectTool.clearArcHandle();
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
    onArcHeightChange: (id, delta) => {
      const arc = (scene.arcs || []).find(a => a.id === id);
      if (!arc) return;
      const newAlt = Math.max(0, (arc.maxAltitude ?? 0.5) + delta);
      arc.maxAltitude = parseFloat(newAlt.toFixed(3));
      pushScene(scene);
      showArcHandle(id);
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
    ...previewCallbacks,
    onPlace: (arc) => {
      scene.arcs.push(arc);
      pushScene({ ...scene });
      editorStore.dispatch({ type: 'select', ids: [arc.id] });
      editorStore.dispatch({ type: 'setTool', tool: 'select' });
    },
  });

  const pathTool = new PathTool({
    controller: controllerProxy,
    ...previewCallbacks,
    onPlace: (path) => {
      scene.paths.push(path);
      pushScene({ ...scene });
      editorStore.dispatch({ type: 'select', ids: [path.id] });
      editorStore.dispatch({ type: 'setTool', tool: 'select' });
    },
  });

  const regionTool = new RegionTool({
    controller: controllerProxy,
    ...previewCallbacks,
    onPlace: (region) => {
      scene.regions.push(region);
      pushScene({ ...scene });
      editorStore.dispatch({ type: 'select', ids: [region.id] });
      editorStore.dispatch({ type: 'setTool', tool: 'select' });
    },
  });

  const drawTool = new DrawTool({
    controller: controllerProxy,
    ...previewCallbacks,
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

    // Scene graph dock position
    const sgDock = document.getElementById('scene-graph-dock');
    if (state.sceneGraphDock === 'right') {
      if (!propsEl.querySelector('.sg-root')) {
        const root = sceneGraph.getRoot();
        root.classList.add('sg-in-properties');
        root.style.height = '200px';
        propsEl.insertBefore(sgResizeHandle, propsEl.firstChild);
        propsEl.insertBefore(root, propsEl.firstChild);
        sgDock.classList.add('hidden');
        sceneGraph.setDock('right');
      }
    } else {
      if (!sgDock.querySelector('.sg-root')) {
        const root = sceneGraph.getRoot();
        root.classList.remove('sg-in-properties');
        root.style.height = '';
        sgResizeHandle.remove();
        sgDock.appendChild(root);
        sgDock.classList.remove('hidden');
        sceneGraph.setDock('left');
      }
    }

    sceneGraph.setPinned(state.sceneGraphPinned);

    if (viewer.setStudioOptions) {
      viewer.setStudioOptions({ showHiddenObjects: state.showHiddenObjects });
    }
  });

  // Activate default tool
  editorStore.dispatch({ type: 'setTool', tool: 'select' });

  // --- Viewport event routing ---
  // The <globi-viewer> calls event.preventDefault() on pointerdown, which
  // suppresses all mouse events (mousedown, click, etc.) per the pointer
  // events spec. We therefore use pointer events instead.
  //
  // For non-select tools: capture the pointer on the viewport so the viewer
  // doesn't pan the globe when the user is placing markers, arcs, etc.
  // For the select tool: let the viewer handle panning normally, but still
  // detect clicks for entity selection via pointerdown/pointerup tracking.

  function routeEvent(method, e) {
    const tool = toolManager.getActive();
    if (tool && typeof tool[method] === 'function') tool[method](e);
  }

  let _ptrDown = null;   // { x, y } at pointerdown
  let _ptrId = null;     // active pointerId
  let _ptrTravel = 0;    // accumulated movement
  let _ptrCaptured = false;
  let _lastTapTime = 0;

  // Capture phase: fires before the viewer's shadow DOM handler
  viewportEl.addEventListener('pointerdown', (e) => {
    _ptrDown = { x: e.clientX, y: e.clientY };
    _ptrId = e.pointerId;
    _ptrTravel = 0;
    _ptrCaptured = false;

    const activeName = toolManager.activeName;

    // For placement tools, capture pointer to prevent viewer panning
    if (activeName && activeName !== 'select') {
      viewportEl.setPointerCapture(e.pointerId);
      _ptrCaptured = true;
      e.stopPropagation();
    } else if (activeName === 'select') {
      // For select tool: capture when starting a marker drag
      const hit = viewer.hitTest(e.clientX, e.clientY);
      if (hit && hit.kind === 'marker') {
        viewportEl.setPointerCapture(e.pointerId);
        _ptrCaptured = true;
        e.stopPropagation();
      }
    }

    routeEvent('handleMouseDown', e);
  }, true);

  viewportEl.addEventListener('pointermove', (e) => {
    // Track drag distance when pointer is pressed
    if (_ptrId === e.pointerId && _ptrDown) {
      _ptrTravel += Math.abs(e.clientX - _ptrDown.x) + Math.abs(e.clientY - _ptrDown.y);
      _ptrDown = { x: e.clientX, y: e.clientY }; // update for cumulative travel
    }
    // Always forward mousemove to tools — arc/path/region need hover
    // tracking between clicks (when no pointer button is pressed)
    routeEvent('handleMouseMove', e);
  });

  viewportEl.addEventListener('pointerup', (e) => {
    if (_ptrId !== e.pointerId) return;
    routeEvent('handleMouseUp', e);

    // Synthesize click/dblclick (suppressed by viewer's preventDefault)
    if (_ptrTravel < 6) {
      const now = Date.now();
      if (now - _lastTapTime < 400) {
        routeEvent('handleDoubleClick', e);
      } else {
        routeEvent('handleClick', e);
      }
      _lastTapTime = now;
    }

    if (_ptrCaptured && viewportEl.hasPointerCapture(e.pointerId)) {
      viewportEl.releasePointerCapture(e.pointerId);
    }
    _ptrDown = null;
    _ptrId = null;
    _ptrCaptured = false;
  });

  // --- Live camera display updates ---
  viewer.addEventListener('cameraChange', (e) => {
    propsPanel.updateCameraDisplay(e.detail);
    // Update arc handle screen position after camera change
    const state = editorStore.getState();
    if (state.selectedIds.length === 1) {
      const arc = (scene.arcs || []).find(a => a.id === state.selectedIds[0]);
      if (arc) showArcHandle(arc.id);
    }
  });

  // --- Legend marker selection ---
  viewer.addEventListener('markerClick', (e) => {
    const marker = e.detail;
    if (marker?.id) {
      editorStore.dispatch({ type: 'select', ids: [marker.id] });
      editorStore.dispatch({ type: 'setTool', tool: 'select' });
      updateUI();
      const sgState = editorStore.getState();
      if (!sgState.sceneGraphPinned) sceneGraph.autoShow();
    }
  });

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
  function handleMenuAction(action, payload) {
    // Inline data/filter updates from properties panel
    if (action === 'setDataSources') {
      scene = { ...scene, dataSources: payload };
      pushScene(scene);
      return;
    }
    if (action === 'setFilters') {
      scene = { ...scene, filters: payload };
      pushScene(scene);
      return;
    }
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
        // Compute bounding center of all scene entities
        const points = [
          ...(scene.markers || []).map(m => ({ lat: m.lat, lon: m.lon })),
          ...(scene.arcs || []).flatMap(a => [
            { lat: a.startLat, lon: a.startLon },
            { lat: a.endLat, lon: a.endLon },
          ]),
          ...(scene.paths || []).flatMap(p => (p.waypoints || []).map(w => ({ lat: w.lat, lon: w.lon }))),
          ...(scene.regions || []).flatMap(r => (r.points || []).map(p => ({ lat: p.lat, lon: p.lon }))),
        ];
        if (points.length > 0) {
          const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
          const avgLon = points.reduce((s, p) => s + p.lon, 0) / points.length;
          viewer.flyTo({ lat: avgLat, lon: avgLon }, { zoom: 1 });
        }
        break;
      }
      case 'resetCamera': {
        viewer.flyTo({ lat: 0, lon: 0 }, { zoom: 1 });
        break;
      }
      case 'togglePreview': previewMode.toggle(); break;
      case 'editFilters': {
        const filterEditor = new FilterEditor({
          getScene: () => scene,
          onChange: (filters) => {
            scene = { ...scene, filters };
            pushScene(scene);
          },
        });
        filterEditor.open();
        break;
      }
      case 'editDataSources': {
        const dsEditor = new DataSourceEditor({
          getScene: () => scene,
          onChange: (dataSources) => {
            scene = { ...scene, dataSources };
            pushScene(scene);
          },
        });
        dsEditor.open();
        break;
      }
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

    let updated;
    const localizedFields = ['name', 'description', 'calloutLabel'];
    if (localizedFields.includes(field)) {
      updated = { ...entity, [field]: { ...(entity[field] || {}), [scene.locale || 'en']: value } };
    } else if (['lat', 'lon', 'maxAltitude', 'strokeWidth', 'markerScale'].includes(field)) {
      updated = { ...entity, [field]: parseFloat(value) || 0 };
    } else {
      updated = { ...entity, [field]: value };
    }
    // New object references so the viewer detects the change
    scene = { ...scene, [col]: scene[col].map(e => e.id === id ? updated : e) };
    pushScene(scene);
  }

  // Initial render — custom element is already defined (awaited at boot start)
  if (viewer?.setScene) viewer.setScene(scene);
  // Restore camera: prefer transferred state, fall back to scene initial fields
  const camLat = _initialCameraState?.centerLat ?? scene.initialLat;
  const camLon = _initialCameraState?.centerLon ?? scene.initialLon;
  const camZoom = _initialCameraState?.zoom ?? scene.initialZoom;
  if ((camLat != null || camLon != null || camZoom != null) && viewer?.flyTo) {
    requestAnimationFrame(() => {
      viewer.flyTo({
        lat: camLat ?? 0,
        lon: camLon ?? 0,
      }, { zoom: camZoom ?? 1 });
    });
  }
}

// Auto-boot when running standalone (studio/index.html has #studio in DOM)
if (document.getElementById('studio')) {
  boot();
}
