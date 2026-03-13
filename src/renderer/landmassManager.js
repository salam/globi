import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import earcut from 'earcut';
import { latLonToCartesian } from '../math/geo.js';

const ALTITUDE = 0.002;
const MAX_EDGE_DEG = 2;

function parseColor(cssColor, fallbackColor, fallbackOpacity) {
  if (typeof cssColor !== 'string') return { color: fallbackColor, opacity: fallbackOpacity };
  const m = cssColor.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (m) {
    const alpha = m[4] !== undefined ? parseFloat(m[4]) : fallbackOpacity;
    return { color: `rgb(${m[1]}, ${m[2]}, ${m[3]})`, opacity: alpha };
  }
  return { color: cssColor, opacity: fallbackOpacity };
}

/**
 * Densify a polygon ring by interpolating points along edges longer than
 * MAX_EDGE_DEG degrees. This ensures earcut triangles stay small enough
 * to follow the sphere curvature instead of cutting through it.
 */
function densifyRing(ring) {
  const result = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon0, lat0] = ring[i];
    const [lon1, lat1] = ring[i + 1];
    result.push([lon0, lat0]);

    const dLon = Math.abs(lon1 - lon0);
    const dLat = Math.abs(lat1 - lat0);
    const dist = Math.max(dLon, dLat);

    if (dist > MAX_EDGE_DEG) {
      const steps = Math.ceil(dist / MAX_EDGE_DEG);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        result.push([lon0 + (lon1 - lon0) * t, lat0 + (lat1 - lat0) * t]);
      }
    }
  }
  result.push(ring[ring.length - 1]);
  return result;
}

export class LandmassManager {
  #group = null;

  update(group, geojson, { color = null } = {}) {
    this.#group = group;
    this.#clear();

    if (!color || !geojson) return;
    if (!geojson.features || geojson.features.length === 0) return;

    const parsed = parseColor(color, '#cccccc', 0.35);
    const material = new MeshBasicMaterial({
      color: parsed.color,
      transparent: true,
      opacity: parsed.opacity,
      side: DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    for (const feature of geojson.features) {
      const geometry = feature.geometry;
      if (!geometry) continue;

      const polygons = geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon'
          ? geometry.coordinates
          : [];

      for (const polygon of polygons) {
        const rawRing = polygon[0];
        if (!Array.isArray(rawRing) || rawRing.length < 4) continue;

        const ring = densifyRing(rawRing);

        const ring3d = ring.map(([lon, lat]) => {
          const c = latLonToCartesian(lat, lon, 1, ALTITUDE);
          return [c.x, c.y, c.z];
        });

        const flatCoords = [];
        for (const [lon, lat] of ring) {
          flatCoords.push(lon, lat);
        }

        const indices = earcut(flatCoords);
        if (indices.length === 0) continue;

        const vertices = new Float32Array(ring3d.flat());
        const geom = new BufferGeometry();
        geom.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        geom.setIndex(Array.from(indices));
        geom.computeVertexNormals();

        const mesh = new Mesh(geom, material);
        mesh.userData = { kind: 'landmass' };
        group.add(mesh);
      }
    }
  }

  #clear() {
    if (!this.#group) return;
    const toRemove = [...this.#group.children];
    for (const child of toRemove) {
      this.#group.remove(child);
      child.geometry?.dispose();
    }
    if (toRemove.length > 0 && toRemove[0].material) {
      toRemove[0].material.dispose();
    }
  }

  dispose() {
    this.#clear();
  }
}
