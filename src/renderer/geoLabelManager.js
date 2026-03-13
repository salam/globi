import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';
import { getBodyLabels } from './bodyLabels.js';

const DEG_TO_RAD = Math.PI / 180;
const LABEL_ALTITUDE = 0.005;
const QUAD_SEGMENTS = 32;

const STYLES = {
  continent: {
    fontSize: 48,
    fontStyle: '600 48px "Avenir Next", "Segoe UI", system-ui, sans-serif',
    fillStyle: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 8,
    arcDeg: 30,
  },
  region: {
    fontSize: 48,
    fontStyle: '600 48px "Avenir Next", "Segoe UI", system-ui, sans-serif',
    fillStyle: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 8,
    arcDeg: 30,
  },
  ocean: {
    fontSize: 40,
    fontStyle: 'italic 40px "Avenir Next", "Segoe UI", system-ui, sans-serif',
    fillStyle: 'rgba(150, 190, 255, 0.3)',
    letterSpacing: 4,
    arcDeg: 25,
  },
  feature: {
    fontSize: 36,
    fontStyle: '500 36px "Avenir Next", "Segoe UI", system-ui, sans-serif',
    fillStyle: 'rgba(255, 220, 150, 0.35)',
    letterSpacing: 3,
    arcDeg: 22,
  },
};

function nextPow2(n) {
  let v = 1;
  while (v < n) v *= 2;
  return v;
}

function renderTextToCanvas(text, style, fillStyleOverride = null) {
  const cfg = STYLES[style] || STYLES.region;
  const measure = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(1, 1)
    : createFallbackCanvas(1, 1);
  const mCtx = measure.getContext('2d');
  mCtx.font = cfg.fontStyle;
  const textWidth = mCtx.measureText(text).width + cfg.letterSpacing * text.length;
  const textHeight = cfg.fontSize * 1.4;

  const cw = nextPow2(Math.ceil(textWidth + 16));
  const ch = nextPow2(Math.ceil(textHeight + 8));
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(cw, ch)
    : createFallbackCanvas(cw, ch);
  const ctx = canvas.getContext('2d');

  ctx.font = cfg.fontStyle;
  ctx.fillStyle = fillStyleOverride || cfg.fillStyle;
  ctx.textBaseline = 'middle';

  // Rotate canvas 180° so text is right-side-up on the sphere surface
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(Math.PI);
  ctx.translate(-cw / 2, -ch / 2);

  let x = 8;
  for (const char of text) {
    ctx.fillText(char, x, ch / 2);
    x += mCtx.measureText(char).width + cfg.letterSpacing;
  }

  return { canvas, width: cw, height: ch };
}

function createFallbackCanvas(w, h) {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return { width: w, height: h, getContext: () => createMockContext() };
}

function createMockContext() {
  return {
    font: '',
    fillStyle: '',
    textBaseline: '',
    measureText: () => ({ width: 10 }),
    fillText: () => {},
    translate: () => {},
    rotate: () => {},
  };
}

function buildCurvedStrip(lat, lon, heading, arcDeg, aspectRatio) {
  const halfArc = (arcDeg / 2) * DEG_TO_RAD;
  const stripHeight = (arcDeg / aspectRatio) * DEG_TO_RAD;
  const halfHeight = stripHeight / 2;
  const headingRad = heading * DEG_TO_RAD;
  const latRad = lat * DEG_TO_RAD;
  const lonRad = lon * DEG_TO_RAD;

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= QUAD_SEGMENTS; i++) {
    const t = i / QUAD_SEGMENTS;
    const along = -halfArc + t * 2 * halfArc;

    for (let j = 0; j < 2; j++) {
      const across = j === 0 ? -halfHeight : halfHeight;

      const dLon = along * Math.cos(headingRad) - across * Math.sin(headingRad);
      const dLat = along * Math.sin(headingRad) + across * Math.cos(headingRad);

      const pLat = latRad + dLat;
      const pLon = lonRad + dLon;

      const cart = latLonToCartesian(
        pLat / DEG_TO_RAD,
        pLon / DEG_TO_RAD,
        1,
        LABEL_ALTITUDE,
      );
      positions.push(cart.x, cart.y, cart.z);
      uvs.push(1 - t, 1 - j);
    }

    if (i < QUAD_SEGMENTS) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class GeoLabelManager {
  #group = null;
  #built = false;
  #currentBodyId = null;
  #labelStyles = null;
  #currentLabelStylesKey = null;

  /**
   * Update labels for the given body. Rebuilds when bodyId or labelStyles change.
   * @param {import('three').Group} group
   * @param {object} options
   * @param {boolean} [options.showLabels=true]
   * @param {string} [options.bodyId='earth']
   * @param {object|null} [options.labelStyles=null]
   */
  update(group, { showLabels = true, bodyId = 'earth', labelStyles = null } = {}) {
    this.#group = group;
    group.visible = showLabels;

    const labelStylesKey = labelStyles ? JSON.stringify(labelStyles) : null;
    if (this.#built && this.#currentBodyId === bodyId && this.#currentLabelStylesKey === labelStylesKey) return;

    // Clear old labels if body or styles changed, or first build
    if (this.#built) {
      this.#clearLabels();
    }

    this.#labelStyles = labelStyles;
    this.#currentLabelStylesKey = labelStylesKey;

    const labels = getBodyLabels(bodyId);
    for (const label of labels) {
      const styleName = label.style || 'region';
      const cfg = STYLES[styleName] || STYLES.region;
      const fillStyleOverride = this.#labelStyles?.[styleName] || null;
      const { canvas, width, height } = renderTextToCanvas(label.text, styleName, fillStyleOverride);
      const aspectRatio = width / height;

      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;

      const arcDeg = label.arcDeg || cfg.arcDeg;
      const geometry = buildCurvedStrip(
        label.lat, label.lon, label.heading, arcDeg, aspectRatio,
      );

      const material = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
      });

      const mesh = new Mesh(geometry, material);
      mesh.userData = { kind: 'geoLabel', label: label.text };
      group.add(mesh);
    }

    this.#built = true;
    this.#currentBodyId = bodyId;
  }

  #clearLabels() {
    if (!this.#group) return;
    const toRemove = [...this.#group.children];
    for (const child of toRemove) {
      this.#group.remove(child);
      child.geometry?.dispose();
      if (child.material?.map) child.material.map.dispose();
      child.material?.dispose();
    }
    this.#built = false;
  }

  dispose() {
    this.#clearLabels();
    this.#currentBodyId = null;
  }
}
