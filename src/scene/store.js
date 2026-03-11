import { Emitter } from '../utils/emitter.js';
import { createEmptyScene, normalizeScene, validateScene } from './schema.js';
import { assignAutoDotColors } from './markerColors.js';

function updateCollection(scene, key, values) {
  return {
    ...scene,
    [key]: Array.isArray(values) ? values : [],
  };
}

function upsertById(items, item) {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index === -1) {
    return [...items, item];
  }
  const copy = items.slice();
  copy[index] = item;
  return copy;
}

function hasColor(marker = {}) {
  return typeof marker.color === 'string' && marker.color.trim().length > 0;
}

export class SceneStore {
  #emitter = new Emitter();
  #scene;

  constructor(scene = createEmptyScene()) {
    this.#scene = normalizeScene(scene);
  }

  on(eventName, listener) {
    return this.#emitter.on(eventName, listener);
  }

  getScene() {
    return structuredClone(this.#scene);
  }

  setScene(sceneInput) {
    const next = normalizeScene(sceneInput);
    const prepared = {
      ...next,
      markers: assignAutoDotColors(next.markers),
    };
    const result = validateScene(prepared);
    if (!result.valid) {
      throw new Error(`Invalid scene: ${result.errors.join('; ')}`);
    }
    this.#scene = result.scene;
    this.#emitter.emit('sceneChange', this.getScene());
    return this.getScene();
  }

  setPlanet(planetConfig = {}) {
    const hasPlanetId = typeof planetConfig?.id === 'string' && planetConfig.id.length > 0;
    const next = {
      ...this.#scene,
      planet: hasPlanetId
        ? { ...planetConfig }
        : {
          ...this.#scene.planet,
          ...planetConfig,
        },
    };
    return this.setScene(next);
  }

  setMarkers(markers) {
    return this.setScene(updateCollection(this.#scene, 'markers', markers));
  }

  setPaths(paths) {
    return this.setScene(updateCollection(this.#scene, 'paths', paths));
  }

  setArcs(arcs) {
    return this.setScene(updateCollection(this.#scene, 'arcs', arcs));
  }

  setRegions(regions) {
    return this.setScene(updateCollection(this.#scene, 'regions', regions));
  }

  setAnimations(animations) {
    return this.setScene(updateCollection(this.#scene, 'animations', animations));
  }

  upsertMarker(marker) {
    const existing = this.#scene.markers.find((entry) => entry.id === marker.id);
    const candidate = !hasColor(marker) && existing && hasColor(existing)
      ? { ...marker, color: existing.color }
      : marker;
    const nextMarkers = upsertById(this.#scene.markers, candidate);
    return this.setMarkers(nextMarkers);
  }

  upsertPath(path) {
    const next = upsertById(this.#scene.paths, path);
    return this.setPaths(next);
  }

  upsertArc(arc) {
    const next = upsertById(this.#scene.arcs, arc);
    return this.setArcs(next);
  }

  upsertRegion(region) {
    const next = upsertById(this.#scene.regions, region);
    return this.setRegions(next);
  }
}
