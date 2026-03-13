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
  #animating = false;

  setResolution(width, height) {
    this.#resolution.set(width, height);
  }

  update(group, arcs = [], paths = []) {
    this.#group = group;
    this.#clear();
    this.#animating = false;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    for (const arc of arcs) {
      const arcPoints = greatCircleArc(arc.start, arc.end, {
        segments: 64,
        maxAltitude: arc.maxAltitude ?? 0,
      });
      const positions = geoPointsToPositions(arcPoints);
      this.#addLine(group, positions, arc, now);
    }

    for (const path of paths) {
      const inputPoints = path.points ?? [];
      const dense = densifyPath(inputPoints, { maxStepDegrees: 8 });
      const positions = geoPointsToPositions(dense);
      this.#addLine(group, positions, path, now);
    }
  }

  #addLine(group, positions, data, now) {
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
    // Line2 bounding sphere doesn't account for line width in instanced geometry,
    // causing premature frustum culling — disable to guarantee visibility
    line.frustumCulled = false;
    // Total segment instances = number of points - 1
    const totalSegments = (positions.length / 3) - 1;
    const animTime = data.animationTime ?? 0;
    const animDelay = data.animationDelay ?? 0;
    line.userData = {
      entityId: data.id,
      kind: data.start ? 'arc' : 'path',
      animationTime: animTime,
      animationDelay: animDelay,
      animStartTime: animTime > 0 ? (now ?? 0) : 0,
      totalSegments,
    };
    if (animTime > 0) {
      // Start with zero visible segments
      geometry.instanceCount = 0;
      this.#animating = true;
    }
    group.add(line);
  }

  /** Returns true if any arc/path is still animating (needs dirty flag) */
  animate() {
    if (!this.#group || !this.#animating) return false;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let anyActive = false;
    for (const child of this.#group.children) {
      const ud = child.userData;
      if (!ud.animationTime || ud.animationTime <= 0) continue;
      const delay = ud.animationDelay || 0;
      const elapsed = now - ud.animStartTime - delay;
      if (elapsed <= 0) {
        child.geometry.instanceCount = 0;
        anyActive = true;
        continue;
      }
      const progress = Math.min(1, elapsed / ud.animationTime);
      const visible = Math.max(1, Math.ceil(ud.totalSegments * progress));
      child.geometry.instanceCount = visible;
      if (progress < 1) anyActive = true;
    }
    this.#animating = anyActive;
    return anyActive;
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

  filterArcs(matchingIds) {
    this.#filterByKind('arc', matchingIds);
  }

  filterPaths(matchingIds) {
    this.#filterByKind('path', matchingIds);
  }

  #filterByKind(kind, matchingIds) {
    if (!this.#group) return;
    const idSet = matchingIds != null ? new Set(matchingIds) : null;
    for (const child of this.#group.children) {
      if (child.userData?.kind !== kind) continue;
      child.visible = idSet == null || idSet.has(child.userData.entityId);
    }
  }

  dispose() {
    this.#clear();
  }
}
