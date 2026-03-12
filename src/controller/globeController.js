import { AnimationEngine } from '../animation/engine.js';
import { createTranslator } from '../i18n/index.js';
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
  #renderer;
  #store;
  #animationEngine;
  #emitter;
  #translate;
  #unsubStore;
  #scene;

  constructor(options = {}) {
    const scene = options.initialScene ?? createEmptyScene(options.locale ?? 'en');

    this.#renderer = options.renderer ?? new ThreeGlobeRenderer();
    this.#store = new SceneStore(scene);
    this.#animationEngine = new AnimationEngine();
    this.#emitter = new Emitter();
    this.#translate = createTranslator(options.dictionaries ?? DEFAULT_DICTIONARIES, {
      defaultLocale: scene.locale,
    });
    this.#scene = this.#store.getScene();

    this.#unsubStore = this.#store.on('sceneChange', (nextScene) => {
      this.#scene = nextScene;
      this.#renderer.renderScene(nextScene);
      this.#emitter.emit('sceneChange', nextScene);
    });

    if (typeof this.#renderer.init === 'function') {
      this.#renderer.init(options.container ?? { appendChild() {}, clientWidth: 800, clientHeight: 500 }, {
        initialScene: scene,
      });
    }
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
    this.#renderer.flyTo(target, options);
  }

  panBy(deltaLon, deltaLat) {
    if (typeof this.#renderer.panBy === 'function') {
      this.#renderer.panBy(deltaLon, deltaLat);
    }
  }

  screenToLatLon(clientX, clientY) {
    if (typeof this.#renderer.screenToLatLon === 'function') {
      return this.#renderer.screenToLatLon(clientX, clientY);
    }
    return null;
  }

  pauseIdleRotation() {
    if (typeof this.#renderer.pauseIdleRotation === 'function') {
      this.#renderer.pauseIdleRotation();
    }
  }

  resumeIdleRotation() {
    if (typeof this.#renderer.resumeIdleRotation === 'function') {
      this.#renderer.resumeIdleRotation();
    }
  }

  zoomBy(deltaScale) {
    if (typeof this.#renderer.zoomBy === 'function') {
      this.#renderer.zoomBy(deltaScale);
    }
  }

  hitTest(clientX, clientY, options = {}) {
    if (typeof this.#renderer.hitTest !== 'function') {
      return null;
    }
    return this.#renderer.hitTest(clientX, clientY, options);
  }

  filterCallouts(matchingIds) {
    if (typeof this.#renderer.filterCallouts === 'function') {
      this.#renderer.filterCallouts(matchingIds);
    }
  }

  filterMarkers(matchingIds) {
    if (typeof this.#renderer.filterMarkers === 'function') {
      this.#renderer.filterMarkers(matchingIds);
    }
  }

  projectPointToClient(point) {
    if (typeof this.#renderer.projectPointToClient !== 'function') {
      return null;
    }
    return this.#renderer.projectPointToClient(point);
  }

  getCanvasRect() {
    if (typeof this.#renderer.getCanvasRect === 'function') {
      return this.#renderer.getCanvasRect();
    }
    return null;
  }

  getCameraState() {
    if (typeof this.#renderer.getCameraState !== 'function') {
      return {
        centerLon: 0,
        centerLat: 0,
        zoom: 1,
      };
    }
    return this.#renderer.getCameraState();
  }

  resize(width, height) {
    this.#renderer.resize(width, height);
  }

  destroy() {
    this.#unsubStore?.();
    this.#renderer.destroy();
  }
}
