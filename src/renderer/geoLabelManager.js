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

const DEG_TO_RAD = Math.PI / 180;
const LABEL_ALTITUDE = 0.003;
const QUAD_SEGMENTS = 32;

export const GEO_LABELS = [
  { text: 'AFRICA',        lat: 0,   lon: 22,   heading: 0,   style: 'continent' },
  { text: 'ASIA',          lat: 45,  lon: 90,   heading: 0,   style: 'continent' },
  { text: 'EUROPE',        lat: 52,  lon: 15,   heading: 0,   style: 'continent' },
  { text: 'NORTH AMERICA', lat: 45,  lon: -100, heading: 0,   style: 'continent' },
  { text: 'SOUTH AMERICA', lat: -15, lon: -58,  heading: -20, style: 'continent' },
  { text: 'OCEANIA',       lat: -25, lon: 135,  heading: 0,   style: 'continent' },
  { text: 'ANTARCTICA',    lat: -82, lon: 0,    heading: 0,   style: 'continent' },
  { text: 'Pacific Ocean',  lat: 0,   lon: -160, heading: -10, style: 'ocean' },
  { text: 'Atlantic Ocean', lat: 15,  lon: -35,  heading: -60, style: 'ocean' },
  { text: 'Indian Ocean',   lat: -20, lon: 75,   heading: -30, style: 'ocean' },
  { text: 'Arctic Ocean',   lat: 80,  lon: 0,    heading: 0,   style: 'ocean' },
  { text: 'Southern Ocean',  lat: -65, lon: 0,    heading: 0,   style: 'ocean' },
];

const STYLES = {
  continent: {
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
};

function nextPow2(n) {
  let v = 1;
  while (v < n) v *= 2;
  return v;
}

function renderTextToCanvas(text, style) {
  const cfg = STYLES[style];
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
  ctx.fillStyle = cfg.fillStyle;
  ctx.textBaseline = 'middle';

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
      uvs.push(t, 1 - j);
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

  update(group, { showLabels = true } = {}) {
    this.#group = group;
    group.visible = showLabels;

    if (this.#built) return;

    for (const label of GEO_LABELS) {
      const cfg = STYLES[label.style];
      const { canvas, width, height } = renderTextToCanvas(label.text, label.style);
      const aspectRatio = width / height;

      // CanvasTexture accepts the mock canvas object in Node.js tests —
      // Three.js just stores the reference; actual GPU upload only happens in browser.
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;

      const geometry = buildCurvedStrip(
        label.lat, label.lon, label.heading, cfg.arcDeg, aspectRatio,
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
  }

  dispose() {
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
}
