import {
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';

const BORDER_ALTITUDE = 0.002;
const BORDER_COLOR = 0xffffff;
const BORDER_OPACITY = 0.35;

export class BorderManager {
  #group = null;
  #built = false;

  update(group, geojson, { show = true } = {}) {
    this.#group = group;
    group.visible = show;

    if (this.#built || !geojson) return;
    if (!geojson.features || geojson.features.length === 0) return;

    const vertices = [];

    for (const feature of geojson.features) {
      const geom = feature.geometry;
      if (!geom) continue;

      const polygons = geom.type === 'Polygon'
        ? [geom.coordinates]
        : geom.type === 'MultiPolygon'
          ? geom.coordinates
          : [];

      for (const polygon of polygons) {
        const ring = polygon[0];
        if (!Array.isArray(ring) || ring.length < 4) continue;

        for (let i = 0; i < ring.length - 1; i++) {
          const [lon0, lat0] = ring[i];
          const [lon1, lat1] = ring[i + 1];
          const a = latLonToCartesian(lat0, lon0, 1, BORDER_ALTITUDE);
          const b = latLonToCartesian(lat1, lon1, 1, BORDER_ALTITUDE);
          vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }

    if (vertices.length === 0) return;

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(vertices), 3));

    const material = new LineBasicMaterial({
      color: BORDER_COLOR,
      transparent: true,
      opacity: BORDER_OPACITY,
      depthWrite: false,
    });

    const lines = new LineSegments(geometry, material);
    lines.userData = { kind: 'borders' };
    group.add(lines);
    this.#built = true;
  }

  dispose() {
    if (!this.#group) return;
    const toRemove = [...this.#group.children];
    for (const child of toRemove) {
      this.#group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
    this.#built = false;
  }
}
