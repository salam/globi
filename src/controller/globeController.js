import { AnimationEngine } from '../animation/engine.js';
import { createTranslator } from '../i18n/index.js';
import { FlatMapRenderer } from '../renderer/flatMapRenderer.js';
import { ThreeGlobeRenderer } from '../renderer/threeGlobeRenderer.js';
import { createEmptyScene } from '../scene/schema.js';
import { SceneStore } from '../scene/store.js';
import { sanitizeHtml } from '../security/sanitize.js';
import { Emitter } from '../utils/emitter.js';

const DEFAULT_DICTIONARIES = {
  en: {
    fullscreen: 'Fullscreen',
    legend: 'Legend',
    inspect: 'Inspect',
    body: 'Body',
  },
  de: {
    fullscreen: 'Vollbild',
    legend: 'Legende',
    inspect: 'Inspektor',
    body: 'Himmelskoerper',
  },
  fr: {
    fullscreen: 'Plein ecran',
    legend: 'Legende',
    inspect: 'Inspecter',
    body: 'Corps',
  },
  it: {
    fullscreen: 'Schermo intero',
    legend: 'Legenda',
    inspect: 'Ispeziona',
    body: 'Corpo',
  },
};

export class GlobeController {
  #globeRenderer;
  #flatMapRenderer;
  #flatMapInited = false;
  #activeRenderer;
  #projection = 'globe';
  #container;
  #store;
  #animationEngine;
  #emitter;
  #translate;
  #unsubStore;
  #scene;

  constructor(options = {}) {
    const scene = options.initialScene ?? createEmptyScene(options.locale ?? 'en');

    this.#globeRenderer = options.renderer ?? new ThreeGlobeRenderer();
    this.#flatMapRenderer = new FlatMapRenderer();
    this.#activeRenderer = this.#globeRenderer;

    this.#store = new SceneStore(scene);
    this.#animationEngine = new AnimationEngine();
    this.#emitter = new Emitter();
    this.#translate = createTranslator(options.dictionaries ?? DEFAULT_DICTIONARIES, {
      defaultLocale: scene.locale,
    });
    this.#scene = this.#store.getScene();

    this.#unsubStore = this.#store.on('sceneChange', (nextScene) => {
      this.#scene = nextScene;
      // Detect projection changes from scene
      if (nextScene.projection && nextScene.projection !== this.#projection) {
        this.setProjection(nextScene.projection);
      } else {
        this.#activeRenderer.renderScene(nextScene);
      }
      this.#emitter.emit('sceneChange', nextScene);
    });

    this.#container = options.container ?? { appendChild() {}, clientWidth: 800, clientHeight: 500 };

    if (typeof this.#globeRenderer.init === 'function') {
      this.#globeRenderer.init(this.#container, {
        initialScene: scene,
      });
    }
  }

  setProjection(name) {
    const prev = this.#activeRenderer;
    this.#projection = name;

    if (name === 'globe') {
      if (typeof this.#globeRenderer.show === 'function') this.#globeRenderer.show();
      if (typeof this.#flatMapRenderer.hide === 'function') this.#flatMapRenderer.hide();
      this.#activeRenderer = this.#globeRenderer;
    } else {
      // Lazily init the flat map renderer on first use (browser only)
      if (!this.#flatMapInited && this.#container && typeof this.#flatMapRenderer.init === 'function'
          && typeof document !== 'undefined') {
        this.#flatMapRenderer.init(this.#container);
        this.#flatMapRenderer.hide();
        this.#flatMapInited = true;
      }
      if (typeof this.#flatMapRenderer.setProjection === 'function') {
        this.#flatMapRenderer.setProjection(name);
      }
      if (typeof this.#flatMapRenderer.show === 'function') this.#flatMapRenderer.show();
      if (typeof this.#globeRenderer.hide === 'function') this.#globeRenderer.hide();
      this.#activeRenderer = this.#flatMapRenderer;
    }

    // Sync camera state from previous renderer to new one
    if (prev !== this.#activeRenderer && typeof prev.getCameraState === 'function') {
      const cam = prev.getCameraState();
      if (typeof this.#activeRenderer.flyTo === 'function') {
        this.#activeRenderer.flyTo({ lat: cam.centerLat, lon: cam.centerLon, zoom: cam.zoom });
      }
    }

    if (this.#scene) {
      this.#activeRenderer.renderScene(this.#scene);
    }
  }

  getProjection() {
    return this.#projection;
  }

  on(eventName, listener) {
    return this.#emitter.on(eventName, listener);
  }

  t(key, locale) {
    return this.#translate(key, locale ?? this.#scene.locale);
  }

  getScene() {
    return this.#store.getScene();
  }

  setScene(scene) {
    return this.#store.setScene(scene);
  }

  setPlanet(planetConfig) {
    return this.#store.setPlanet(planetConfig);
  }

  setMarkers(markers) {
    return this.#store.setMarkers(markers);
  }

  setPaths(paths) {
    return this.#store.setPaths(paths);
  }

  setArcs(arcs) {
    return this.#store.setArcs(arcs);
  }

  setRegions(regions) {
    return this.#store.setRegions(regions);
  }

  setAnimations(animations) {
    for (const animation of animations) {
      this.#animationEngine.register(animation.entityId, animation.keyframes, {
        loop: animation.loop,
      });
    }
    return this.#store.setAnimations(animations);
  }

  upsertMarker(marker) {
    const safeCallout = sanitizeHtml(marker.callout ?? '');
    return this.#store.upsertMarker({ ...marker, callout: safeCallout });
  }

  upsertPath(path) {
    return this.#store.upsertPath(path);
  }

  upsertArc(arc) {
    return this.#store.upsertArc(arc);
  }

  upsertRegion(region) {
    return this.#store.upsertRegion(region);
  }

  sampleAnimation(entityId, timeMs) {
    return this.#animationEngine.sample(entityId, timeMs);
  }

  flyTo(target, options = {}) {
    this.#activeRenderer.flyTo(target, options);
  }

  panBy(deltaLon, deltaLat) {
    if (typeof this.#activeRenderer.panBy === 'function') {
      this.#activeRenderer.panBy(deltaLon, deltaLat);
    }
  }

  screenToLatLon(clientX, clientY) {
    if (typeof this.#activeRenderer.screenToLatLon === 'function') {
      return this.#activeRenderer.screenToLatLon(clientX, clientY);
    }
    return null;
  }

  pauseIdleRotation() {
    if (typeof this.#activeRenderer.pauseIdleRotation === 'function') {
      this.#activeRenderer.pauseIdleRotation();
    }
  }

  resumeIdleRotation() {
    if (typeof this.#activeRenderer.resumeIdleRotation === 'function') {
      this.#activeRenderer.resumeIdleRotation();
    }
  }

  zoomBy(deltaScale) {
    if (typeof this.#activeRenderer.zoomBy === 'function') {
      this.#activeRenderer.zoomBy(deltaScale);
    }
  }

  hitTest(clientX, clientY, options = {}) {
    if (typeof this.#activeRenderer.hitTest !== 'function') {
      return null;
    }
    return this.#activeRenderer.hitTest(clientX, clientY, options);
  }

  filterCallouts(matchingIds) {
    if (typeof this.#activeRenderer.filterCallouts === 'function') {
      this.#activeRenderer.filterCallouts(matchingIds);
    }
  }

  filterMarkers(matchingIds) {
    if (typeof this.#activeRenderer.filterMarkers === 'function') {
      this.#activeRenderer.filterMarkers(matchingIds);
    }
  }

  projectPointToClient(point) {
    if (typeof this.#activeRenderer.projectPointToClient !== 'function') {
      return null;
    }
    return this.#activeRenderer.projectPointToClient(point);
  }

  getCanvasRect() {
    if (typeof this.#activeRenderer.getCanvasRect === 'function') {
      return this.#activeRenderer.getCanvasRect();
    }
    return null;
  }

  getCameraState() {
    if (typeof this.#activeRenderer.getCameraState !== 'function') {
      return {
        centerLon: 0,
        centerLat: 0,
        zoom: 1,
      };
    }
    return this.#activeRenderer.getCameraState();
  }

  getScaleAtCenter() {
    if (typeof this.#activeRenderer.getScaleAtCenter === 'function') {
      return this.#activeRenderer.getScaleAtCenter();
    }
    return null;
  }

  resize(width, height) {
    this.#activeRenderer.resize(width, height);
  }

  startDrag(clientX, clientY) {
    if (typeof this.#activeRenderer.startDrag === 'function') {
      this.#activeRenderer.startDrag(clientX, clientY);
    }
  }

  endDrag(clientX, clientY) {
    if (typeof this.#activeRenderer.endDrag === 'function') {
      this.#activeRenderer.endDrag(clientX, clientY);
    }
  }

  destroy() {
    this.#unsubStore?.();
    this.#globeRenderer.destroy();
    if (typeof this.#flatMapRenderer.destroy === 'function') {
      this.#flatMapRenderer.destroy();
    }
  }
}
