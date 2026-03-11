import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Sprite,
  SpriteMaterial,
  TextureLoader,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';

function createDotTexture(color = '#ff6a00') {
  // Use OffscreenCanvas if available (browser), fallback for Node tests
  const size = 64;
  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(size, size);
  } else {
    // Node.js environment — return a null texture (tests still validate structure)
    return null;
  }
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  return new CanvasTexture(canvas);
}

function createTriangleGeometry(size = 0.02) {
  const vertices = new Float32Array([
    0, size, 0,
    -size * 0.75, -size * 0.8, 0,
    size * 0.75, -size * 0.8, 0,
  ]);
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
  return geom;
}

export class MarkerManager {
  #markerMap = new Map();
  #textureCache = new Map();
  #loader = new TextureLoader();
  #group = null;

  update(group, markers, locale = 'en') {
    this.#group = group;
    this.#clearGroup(group);
    this.#markerMap.clear();

    for (const marker of markers) {
      const pos = latLonToCartesian(marker.lat ?? 0, marker.lon ?? 0, 1, marker.alt ?? 0);
      const type = marker.visualType ?? 'dot';
      let obj;

      if (type === 'dot' || type === 'image') {
        const texture = type === 'image' && marker.assetUri
          ? this.#loadTexture(marker.assetUri)
          : createDotTexture(marker.color || '#ff6a00');
        const material = new SpriteMaterial({ map: texture, depthWrite: false });
        obj = new Sprite(material);
        const scale = 0.04;
        obj.scale.set(scale, scale, scale);
      } else if (type === 'model') {
        const geom = createTriangleGeometry();
        const mat = new MeshBasicMaterial({ color: marker.color || '#ff6a00' });
        obj = new Mesh(geom, mat);
      } else {
        // text type — tiny anchor sprite; label handled by CalloutManager
        const texture = createDotTexture(marker.color || '#f5f9ff');
        const material = new SpriteMaterial({ map: texture, depthWrite: false });
        obj = new Sprite(material);
        obj.scale.set(0.02, 0.02, 0.02);
      }

      obj.position.set(pos.x, pos.y, pos.z);
      obj.userData = { markerId: marker.id, marker };
      group.add(obj);
      this.#markerMap.set(marker.id, { object: obj, marker });
    }
  }

  #loadTexture(uri) {
    if (this.#textureCache.has(uri)) return this.#textureCache.get(uri);
    const tex = this.#loader.load(uri);
    this.#textureCache.set(uri, tex);
    return tex;
  }

  #clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
      if (child.material?.map) child.material.map.dispose();
    }
  }

  getMarkerMap() {
    return this.#markerMap;
  }

  dispose() {
    if (this.#group) {
      this.#clearGroup(this.#group);
    }
    this.#markerMap.clear();
    for (const tex of this.#textureCache.values()) tex.dispose();
    this.#textureCache.clear();
  }
}
