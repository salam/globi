/**
 * AgentInterface — exposes a window.globi JS API and data-* DOM attributes
 * for AI agents to discover and control Globi viewers.
 */

import { exportSceneToJSON } from '../io/json.js';
import { exportSceneToGeoJSON } from '../io/geojson.js';
import { exportSceneToOBJ } from '../io/obj.js';

export const AGENT_MANIFEST = {
  version: '1.0',
  commands: [
    { name: 'state', params: [], description: 'Get current view state' },
    { name: 'scene', params: [], description: 'Get full scene data' },
    { name: 'visible', params: [], description: 'Get currently visible entities' },
    { name: 'describe', params: ['level?: "brief"|"detailed"'], description: 'Get accessibility text' },
    { name: 'llmsTxt', params: [], description: 'Get LLMs.txt output' },
    { name: 'entityAt', params: ['x: number', 'y: number'], description: 'Hit-test a screen point' },
    { name: 'help', params: [], description: 'Get capability manifest' },
    { name: 'flyTo', params: ['lat: number', 'lon: number', 'zoom?: number'], description: 'Animate camera to coordinates' },
    { name: 'rotate', params: ['deltaLat: number', 'deltaLon: number'], description: 'Incremental rotation' },
    { name: 'zoom', params: ['level: number'], description: 'Set zoom level' },
    { name: 'setProjection', params: ['name: string'], description: 'Switch projection' },
    { name: 'addMarker', params: ['opts: {name, lat, lon, ...}'], description: 'Add marker, returns id' },
    { name: 'removeMarker', params: ['id: string'], description: 'Remove marker' },
    { name: 'updateMarker', params: ['id: string', 'opts: object'], description: 'Update marker properties' },
    { name: 'addArc', params: ['opts: object'], description: 'Add arc' },
    { name: 'removeArc', params: ['id: string'], description: 'Remove arc' },
    { name: 'addPath', params: ['opts: object'], description: 'Add path' },
    { name: 'removePath', params: ['id: string'], description: 'Remove path' },
    { name: 'addRegion', params: ['opts: object'], description: 'Add region' },
    { name: 'removeRegion', params: ['id: string'], description: 'Remove region' },
    { name: 'loadScene', params: ['scene: object'], description: 'Load entire scene' },
    { name: 'setTheme', params: ['name: string'], description: 'Switch theme' },
    { name: 'setPlanet', params: ['id: string'], description: 'Switch celestial body' },
    { name: 'toggleLegend', params: [], description: 'Show/hide legend' },
    { name: 'toggleInspect', params: [], description: 'Toggle inspect mode' },
    { name: 'export', params: ['format: string', 'scope: string'], description: 'Export scene' },
    { name: 'on', params: ['event: string', 'callback: function'], description: 'Listen for events' },
    { name: 'off', params: ['event: string', 'callback: function'], description: 'Remove event listener' },
  ],
  events: ['sceneChange', 'markerClick', 'inspectSelect', 'searchResults', 'keyboardNavigate', 'themeChange', 'planetChange'],
};

function randomId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createAgentAPI({ viewer, viewStateQuery, describer, llmsTxt, controller }) {
  const listeners = new Map();

  const api = {
    // --- Read ---
    state() {
      const angle = viewStateQuery.getViewAngle() ?? { lat: 0, lon: 0, zoom: 1 };
      const scene = viewer.exportScene();
      return {
        lat: angle.lat,
        lon: angle.lon,
        zoom: angle.zoom,
        projection: scene.projection ?? 'globe',
        theme: scene.theme ?? 'photo',
        body: scene.planet?.id ?? 'earth',
      };
    },

    scene() {
      return viewer.exportScene();
    },

    visible() {
      return viewStateQuery.getVisibleEntities(viewer.exportScene());
    },

    describe(level = 'brief') {
      return describer.describeView(viewer.exportScene(), viewStateQuery, level);
    },

    llmsTxt() {
      return llmsTxt.formatLlmsTxt(viewer.exportScene(), viewStateQuery);
    },

    entityAt(x, y) {
      return viewStateQuery.getEntityAtPoint(x, y);
    },

    help() {
      const scene = viewer.exportScene();
      return {
        ...AGENT_MANIFEST,
        currentState: {
          body: scene.planet?.id ?? 'earth',
          projection: scene.projection ?? 'globe',
          markerCount: scene.markers?.length ?? 0,
          zoom: viewStateQuery.getViewAngle()?.zoom ?? 1,
        },
      };
    },

    // --- Navigate ---
    flyTo(lat, lon, zoom) {
      const opts = zoom != null ? { zoom } : {};
      viewer.flyTo({ lat, lon }, opts);
    },

    rotate(deltaLat, deltaLon) {
      if (controller) controller.panBy(deltaLon, deltaLat);
    },

    zoom(level) {
      if (controller) {
        const cam = controller.getCameraState?.() ?? {};
        const delta = level - (cam.zoom ?? 1);
        controller.zoomBy(delta);
      }
    },

    setProjection(name) {
      if (controller) controller.setProjection(name);
    },

    // --- Mutate (thin wrappers over setScene) ---
    addMarker(opts) {
      const scene = viewer.exportScene();
      const id = opts.id ?? randomId('marker');
      const marker = {
        id,
        name: typeof opts.name === 'string' ? { en: opts.name } : (opts.name ?? {}),
        description: {},
        lat: opts.lat ?? 0,
        lon: opts.lon ?? 0,
        alt: opts.alt ?? 0,
        visualType: opts.visualType ?? 'dot',
        category: opts.category ?? 'default',
        color: opts.color ?? '',
        calloutMode: opts.calloutMode ?? 'always',
        callout: opts.callout ?? '',
      };
      viewer.setScene({ ...scene, markers: [...scene.markers, marker] });
      return id;
    },

    removeMarker(id) {
      const scene = viewer.exportScene();
      viewer.setScene({ ...scene, markers: scene.markers.filter((m) => m.id !== id) });
    },

    updateMarker(id, opts) {
      const scene = viewer.exportScene();
      viewer.setScene({
        ...scene,
        markers: scene.markers.map((m) => m.id === id ? { ...m, ...opts } : m),
      });
    },

    addArc(opts) {
      const scene = viewer.exportScene();
      const id = opts.id ?? randomId('arc');
      viewer.setScene({ ...scene, arcs: [...scene.arcs, { id, ...opts }] });
      return id;
    },

    removeArc(id) {
      const scene = viewer.exportScene();
      viewer.setScene({ ...scene, arcs: scene.arcs.filter((a) => a.id !== id) });
    },

    updateArc(id, opts) {
      const scene = viewer.exportScene();
      viewer.setScene({
        ...scene,
        arcs: scene.arcs.map((a) => a.id === id ? { ...a, ...opts } : a),
      });
    },

    addPath(opts) {
      const scene = viewer.exportScene();
      const id = opts.id ?? randomId('path');
      viewer.setScene({ ...scene, paths: [...scene.paths, { id, ...opts }] });
      return id;
    },

    removePath(id) {
      const scene = viewer.exportScene();
      viewer.setScene({ ...scene, paths: scene.paths.filter((p) => p.id !== id) });
    },

    updatePath(id, opts) {
      const scene = viewer.exportScene();
      viewer.setScene({
        ...scene,
        paths: scene.paths.map((p) => p.id === id ? { ...p, ...opts } : p),
      });
    },

    addRegion(opts) {
      const scene = viewer.exportScene();
      const id = opts.id ?? randomId('region');
      viewer.setScene({ ...scene, regions: [...scene.regions, { id, ...opts }] });
      return id;
    },

    removeRegion(id) {
      const scene = viewer.exportScene();
      viewer.setScene({ ...scene, regions: scene.regions.filter((r) => r.id !== id) });
    },

    updateRegion(id, opts) {
      const scene = viewer.exportScene();
      viewer.setScene({
        ...scene,
        regions: scene.regions.map((r) => r.id === id ? { ...r, ...opts } : r),
      });
    },

    loadScene(sceneObj) {
      viewer.setScene(sceneObj);
    },

    // --- UI Control ---
    setTheme(name) {
      viewer.setTheme(name);
    },

    setPlanet(id) {
      viewer.setPlanet(id);
    },

    toggleLegend() {
      if (controller) controller.toggleLegend();
    },

    toggleInspect() {
      viewer.setInspectMode?.(!viewer._inspectMode);
    },

    export(format, scope = 'full') {
      const scene = scope === 'visible'
        ? buildVisibleScene(viewer.exportScene(), viewStateQuery)
        : viewer.exportScene();
      if (format === 'json') return exportSceneToJSON(scene);
      if (format === 'geojson') return JSON.stringify(exportSceneToGeoJSON(scene));
      if (format === 'obj') return exportSceneToOBJ(scene);
      if (format === 'llmstxt') return llmsTxt.formatLlmsTxt(scene, viewStateQuery);
      if (format === 'usdz') return null; // placeholder
      return null;
    },

    // --- Events ---
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
    },

    off(event, callback) {
      listeners.get(event)?.delete(callback);
    },
  };

  return api;
}

function buildVisibleScene(fullScene, viewStateQuery) {
  const visible = viewStateQuery.getVisibleEntities(fullScene);
  return {
    ...fullScene,
    markers: visible.markers,
    arcs: visible.arcs,
    paths: visible.paths,
    regions: visible.regions,
  };
}

/**
 * Apply data-* attributes to the host element.
 */
export function applyHostAttributes(hostEl, scene, viewStateQuery) {
  hostEl.setAttribute('data-globi-role', 'viewer');
  hostEl.setAttribute('data-globi-body', scene.planet?.id ?? 'earth');
  hostEl.setAttribute('data-globi-projection', scene.projection ?? 'globe');
  const angle = viewStateQuery.getViewAngle();
  if (angle) {
    hostEl.setAttribute('data-globi-zoom', String(angle.zoom));
  }
  hostEl.setAttribute('data-globi-actions', 'toggleLegend,toggleFullscreen,toggleInspect,setProjection,flyTo,export');
  hostEl.setAttribute('data-globi-marker-count', String(scene.markers?.length ?? 0));
}
