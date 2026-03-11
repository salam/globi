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

export class RegionManager {
  #group = null;

  update(group, regions = []) {
    this.#group = group;
    this.#clear();

    for (const region of regions) {
      const geometry = region.geojson;
      if (!geometry) continue;

      const polygons = geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon'
          ? geometry.coordinates
          : [];

      for (const polygon of polygons) {
        // First ring is outer boundary
        const ring = polygon[0];
        if (!Array.isArray(ring) || ring.length < 4) continue;

        const alt = region.altitude ?? 0;

        // Convert to 3D on sphere surface
        const ring3d = ring.map(([lon, lat]) => {
          const c = latLonToCartesian(lat, lon, 1, alt);
          return [c.x, c.y, c.z];
        });

        // For earcut: project to 2D (use lon/lat as x/y since earcut works in 2D)
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

        const mat = new MeshBasicMaterial({
          color: region.capColor ?? '#4caf50',
          transparent: true,
          opacity: 0.3,
          side: DoubleSide,
          depthWrite: false,
        });

        const mesh = new Mesh(geom, mat);
        mesh.userData = { entityId: region.id, kind: 'region' };
        group.add(mesh);

        // If altitude > 0, create side faces connecting surface to cap
        if (alt > 0) {
          const surfaceRing = ring.map(([lon, lat]) => {
            const c = latLonToCartesian(lat, lon, 1, 0);
            return [c.x, c.y, c.z];
          });
          this.#createSideFaces(group, surfaceRing, ring3d, region);
        }
      }
    }
  }

  #createSideFaces(group, bottomRing, topRing, region) {
    const sideVertices = [];
    const sideIndices = [];

    for (let i = 0; i < bottomRing.length - 1; i++) {
      const baseIdx = sideVertices.length / 3;
      const b0 = bottomRing[i];
      const b1 = bottomRing[i + 1];
      const t0 = topRing[i];
      const t1 = topRing[i + 1];

      sideVertices.push(...b0, ...b1, ...t0, ...t1);
      sideIndices.push(
        baseIdx, baseIdx + 1, baseIdx + 2,
        baseIdx + 1, baseIdx + 3, baseIdx + 2
      );
    }

    if (sideVertices.length === 0) return;

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(new Float32Array(sideVertices), 3));
    geom.setIndex(sideIndices);
    geom.computeVertexNormals();

    const mat = new MeshBasicMaterial({
      color: region.sideColor ?? '#2e7d32',
      transparent: true,
      opacity: 0.3,
      side: DoubleSide,
      depthWrite: false,
    });

    const mesh = new Mesh(geom, mat);
    mesh.userData = { entityId: region.id, kind: 'region-side' };
    group.add(mesh);
  }

  #clear() {
    if (!this.#group) return;
    const toRemove = [...this.#group.children];
    for (const child of toRemove) {
      this.#group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  dispose() {
    this.#clear();
  }
}
