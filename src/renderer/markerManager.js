import {
  BoxGeometry,
  CanvasTexture,
  Group,
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

function createPulseRingTexture(color = '#f5d547') {
  const size = 128;
  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(size, size);
  } else {
    return null;
  }
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 - 4, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.stroke();
  return new CanvasTexture(canvas);
}

function createIssModel(color = '#f5d547') {
  const group = new Group();
  const bodyMat = new MeshBasicMaterial({ color });

  // Central body module
  const body = new Mesh(new BoxGeometry(0.012, 0.004, 0.004), bodyMat);
  group.add(body);

  // Solar panel arrays (two wide flat panels)
  const panelMat = new MeshBasicMaterial({ color: '#5588cc' });
  const panelLeft = new Mesh(new BoxGeometry(0.004, 0.018, 0.001), panelMat);
  panelLeft.position.set(-0.004, 0, 0);
  group.add(panelLeft);

  const panelRight = new Mesh(new BoxGeometry(0.004, 0.018, 0.001), panelMat);
  panelRight.position.set(0.004, 0, 0);
  group.add(panelRight);

  return group;
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
  #pulseSprites = [];
  #hasPulse = false;

  update(group, markers, locale = 'en') {
    this.#group = group;
    this.#clearGroup(group);
    this.#markerMap.clear();
    this.#pulseSprites = [];
    this.#hasPulse = false;

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

      // Add ISS 3D model for ISS current marker
      if (marker.category === 'iss' && marker.id === 'iss-current') {
        const issModel = createIssModel(marker.color || '#f5d547');
        issModel.position.set(pos.x, pos.y, pos.z);
        // Offset slightly so model sits above the dot
        const dir = issModel.position.clone().normalize();
        issModel.position.addScaledVector(dir, 0.015);
        issModel.lookAt(0, 0, 0);
        issModel.userData = { markerId: marker.id, marker, isIssModel: true };
        group.add(issModel);
      }

      // Add pulsating ring sprite for markers with pulse: true
      if (marker.pulse) {
        this.#hasPulse = true;
        const ringTexture = createPulseRingTexture(marker.color || '#f5d547');
        const ringMaterial = new SpriteMaterial({
          map: ringTexture,
          depthWrite: false,
          transparent: true,
          opacity: 0.8,
        });
        const ringSprite = new Sprite(ringMaterial);
        ringSprite.position.set(pos.x, pos.y, pos.z);
        ringSprite.scale.set(0.06, 0.06, 0.06);
        ringSprite.userData = { isPulseRing: true };
        group.add(ringSprite);
        this.#pulseSprites.push(ringSprite);
      }

      this.#markerMap.set(marker.id, { object: obj, marker });
    }
  }

  /**
   * Animate pulse rings. Returns true if animations are active (caller should keep rendering).
   * @param {number} elapsed — time in seconds
   */
  animate(elapsed) {
    if (!this.#hasPulse) return false;
    for (const sprite of this.#pulseSprites) {
      // Cycle: scale up from 0.06 to 0.14, opacity fades from 0.8 to 0
      const cycle = (elapsed % 1.5) / 1.5; // 1.5-second cycle
      const scale = 0.06 + cycle * 0.08;
      sprite.scale.set(scale, scale, scale);
      sprite.material.opacity = 0.8 * (1 - cycle);
    }
    return true;
  }

  hasPulseAnimations() {
    return this.#hasPulse;
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
      if (child.isGroup) {
        for (const c of child.children) {
          c.geometry?.dispose();
          c.material?.dispose();
        }
      }
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
    this.#pulseSprites = [];
    this.#hasPulse = false;
    for (const tex of this.#textureCache.values()) tex.dispose();
    this.#textureCache.clear();
  }
}
