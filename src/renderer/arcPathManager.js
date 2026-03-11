import { Vector2 } from 'three';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { latLonToCartesian, greatCircleArc, densifyPath } from '../math/geo.js';

function geoPointsToPositions(points) {
  const positions = [];
  for (const p of points) {
    const c = latLonToCartesian(p.lat ?? 0, p.lon ?? 0, 1, p.alt ?? 0);
    positions.push(c.x, c.y, c.z);
  }
  return positions;
}

export class ArcPathManager {
  #group = null;
  #resolution = new Vector2(800, 500);

  setResolution(width, height) {
    this.#resolution.set(width, height);
  }

  update(group, arcs = [], paths = []) {
    this.#group = group;
    this.#clear();

    for (const arc of arcs) {
      const arcPoints = greatCircleArc(arc.start, arc.end, {
        segments: 64,
        maxAltitude: arc.maxAltitude ?? 0,
      });
      const positions = geoPointsToPositions(arcPoints);
      this.#addLine(group, positions, arc);
    }

    for (const path of paths) {
      const dense = densifyPath(path.points ?? [], { maxStepDegrees: 8 });
      const positions = geoPointsToPositions(dense);
      this.#addLine(group, positions, path);
    }
  }

  #addLine(group, positions, data) {
    if (positions.length < 6) return; // Need at least 2 points (6 floats)

    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    const hasDash = Array.isArray(data.dashPattern) && data.dashPattern.length > 0;
    const materialParams = {
      color: data.color ?? '#00aaff',
      linewidth: data.strokeWidth ?? 1,
      resolution: this.#resolution,
      dashed: hasDash,
    };
    if (hasDash) {
      materialParams.dashSize = data.dashPattern[0] ?? 3;
      materialParams.gapSize = data.dashPattern[1] ?? 1;
    }
    const material = new LineMaterial(materialParams);

    const line = new Line2(geometry, material);
    if (hasDash) line.computeLineDistances();
    line.userData = { entityId: data.id, kind: data.start ? 'arc' : 'path' };
    group.add(line);
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
