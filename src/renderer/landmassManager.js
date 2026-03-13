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

const ALTITUDE = 0.003;
const MAX_EDGE_DEG = 2;
const MAX_SUBDIVIDE_PASSES = 4;

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
 * maxDeg degrees.
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

/**
 * After earcut triangulation, subdivide triangles whose edges exceed
 * MAX_EDGE_DEG in lat/lon space. This adds interior vertices so the
 * mesh follows sphere curvature. Works in lat/lon space; 3D projection
 * happens after subdivision.
 */
function subdivideTriangles(verts2d, indices) {
  // verts2d: flat array [lon0, lat0, lon1, lat1, ...]
  // indices: triangle index array
  let currentVerts = Array.from(verts2d);
  let currentTris = Array.from(indices);

  for (let pass = 0; pass < MAX_SUBDIVIDE_PASSES; pass++) {
    const nextTris = [];
    let didSplit = false;

    for (let i = 0; i < currentTris.length; i += 3) {
      const i0 = currentTris[i];
      const i1 = currentTris[i + 1];
      const i2 = currentTris[i + 2];

      const lon0 = currentVerts[i0 * 2], lat0 = currentVerts[i0 * 2 + 1];
      const lon1 = currentVerts[i1 * 2], lat1 = currentVerts[i1 * 2 + 1];
      const lon2 = currentVerts[i2 * 2], lat2 = currentVerts[i2 * 2 + 1];

      const d01 = Math.max(Math.abs(lon1 - lon0), Math.abs(lat1 - lat0));
      const d12 = Math.max(Math.abs(lon2 - lon1), Math.abs(lat2 - lat1));
      const d20 = Math.max(Math.abs(lon0 - lon2), Math.abs(lat0 - lat2));

      const maxEdge = Math.max(d01, d12, d20);

      if (maxEdge <= MAX_EDGE_DEG) {
        nextTris.push(i0, i1, i2);
        continue;
      }

      didSplit = true;

      // Split the longest edge and create 2 triangles
      const nv = currentVerts.length / 2;
      let midLon, midLat, splitA, splitB, opposite;

      if (d01 >= d12 && d01 >= d20) {
        midLon = (lon0 + lon1) / 2; midLat = (lat0 + lat1) / 2;
        splitA = i0; splitB = i1; opposite = i2;
      } else if (d12 >= d01 && d12 >= d20) {
        midLon = (lon1 + lon2) / 2; midLat = (lat1 + lat2) / 2;
        splitA = i1; splitB = i2; opposite = i0;
      } else {
        midLon = (lon2 + lon0) / 2; midLat = (lat2 + lat0) / 2;
        splitA = i2; splitB = i0; opposite = i1;
      }

      currentVerts.push(midLon, midLat);
      nextTris.push(splitA, nv, opposite);
      nextTris.push(nv, splitB, opposite);
    }

    currentTris = nextTris;
    if (!didSplit) break;
  }

  return { verts2d: currentVerts, indices: currentTris };
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

        const flatCoords = [];
        for (const [lon, lat] of ring) {
          flatCoords.push(lon, lat);
        }

        let indices = earcut(flatCoords);
        if (indices.length === 0) continue;

        // Subdivide large triangles so interior vertices follow the sphere
        const sub = subdivideTriangles(flatCoords, indices);

        // Project all vertices (original + subdivided) to 3D sphere
        const numVerts = sub.verts2d.length / 2;
        const positions = new Float32Array(numVerts * 3);
        for (let v = 0; v < numVerts; v++) {
          const lon = sub.verts2d[v * 2];
          const lat = sub.verts2d[v * 2 + 1];
          const c = latLonToCartesian(lat, lon, 1, ALTITUDE);
          positions[v * 3] = c.x;
          positions[v * 3 + 1] = c.y;
          positions[v * 3 + 2] = c.z;
        }

        const geom = new BufferGeometry();
        geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geom.setIndex(sub.indices);
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
