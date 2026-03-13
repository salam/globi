import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Line,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  SphereGeometry,
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
  #issTrack = null; // { object, waypoints, fetchedAtMs }
  #issProjectedLine = null; // Three.js Line for short extrapolated path
  #issProjectedLastUpdateMs = 0; // throttle projected line updates

  update(group, markers, locale = 'en') {
    this.#group = group;
    this.#clearGroup(group);
    this.#markerMap.clear();
    this.#pulseSprites = [];
    this.#hasPulse = false;
    this.#issTrack = null;
    if (this.#issProjectedLine) {
      this.#issProjectedLine.geometry?.dispose();
      this.#issProjectedLine.material?.dispose();
      this.#issProjectedLine = null;
    }
    this.#issProjectedLastUpdateMs = 0;

    for (const marker of markers) {
      const pos = latLonToCartesian(marker.lat ?? 0, marker.lon ?? 0, 1, marker.alt ?? 0);
      const type = marker.visualType ?? 'dot';
      const isIssModel = marker.category === 'iss' && marker.id === 'iss-current';
      let obj;

      if (isIssModel) {
        // BUG13: ISS current marker renders only the 3D model, no sphere dot
        obj = createIssModel(marker.color || '#f5d547');
        obj.position.set(pos.x, pos.y, pos.z);
        obj.lookAt(0, 0, 0);
      } else if (type === 'dot') {
        const radius = 0.008;
        const geom = new SphereGeometry(radius, 16, 12);
        const mat = new MeshBasicMaterial({ color: marker.color || '#ff6a00' });
        obj = new Mesh(geom, mat);
      } else if (type === 'image') {
        const texture = marker.assetUri
          ? this.#loadTexture(marker.assetUri)
          : createDotTexture(marker.color || '#ff6a00');
        const material = new SpriteMaterial({ map: texture, depthWrite: false });
        obj = new Sprite(material);
        const scale = typeof marker.markerScale === 'number' ? marker.markerScale : 0.025;
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
      obj.renderOrder = 1;
      obj.userData = { markerId: marker.id, marker, baseScale: obj.scale.x };
      group.add(obj);

      // Set up ISS orbit interpolation if waypoints are available
      if (isIssModel && Array.isArray(marker.orbitWaypoints) && marker.orbitWaypoints.length >= 2) {
        this.#issTrack = {
          object: obj,
          waypoints: marker.orbitWaypoints,
          fetchedAtMs: marker.fetchedAtMs ?? Date.now(),
        };
        this.#issStartPerfMs = typeof performance !== 'undefined' ? performance.now() : 0;
        console.log(`[ISS] orbit interpolation enabled — ${marker.orbitWaypoints.length} waypoints, fetchedAt=${this.#issTrack.fetchedAtMs}`);
      }

      // Add pulsating ring sprite(s) for markers with pulse: true
      if (marker.pulse) {
        this.#hasPulse = true;
        const ringCount = isIssModel ? 2 : 1;
        console.log(`[ISS] pulse rings: count=${ringCount}, isIss=${isIssModel}, markerId=${marker.id}`);
        for (let r = 0; r < ringCount; r++) {
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
          ringSprite.userData = {
            isPulseRing: true,
            markerId: marker.id,
            phaseOffset: r * 0.75,    // stagger rings for radar-ping ripple
            isIssRing: isIssModel,
          };
          group.add(ringSprite);
          this.#pulseSprites.push(ringSprite);
        }
      }

      this.#markerMap.set(marker.id, { object: obj, marker });
    }
  }

  /**
   * Animate pulse rings. Returns true if animations are active (caller should keep rendering).
   * @param {number} elapsed — time in seconds
   */
  animate(elapsed) {
    // Interpolate ISS position along orbit waypoints
    this.#interpolateIss();

    if (!this.#hasPulse && !this.#issTrack) return false;
    for (const sprite of this.#pulseSprites) {
      const offset = sprite.userData.phaseOffset ?? 0;
      const period = sprite.userData.isIssRing ? 2.0 : 1.5;
      const cycle = ((elapsed + offset) % period) / period;
      // ISS rings expand further for a wider radar-ping effect
      const baseScale = 0.06;
      const expandRange = sprite.userData.isIssRing ? 0.12 : 0.08;
      const scale = baseScale + cycle * expandRange;
      sprite.scale.set(scale, scale, scale);
      sprite.material.opacity = 0.8 * (1 - cycle);
    }
    return true;
  }

  /**
   * Interpolate the ISS marker position along its orbit waypoints.
   * Called each frame — moves the 3D model and its pulse rings smoothly.
   * Every ~10s, rebuilds a short dashed projected line showing where the ISS is heading.
   */
  #interpolateIss() {
    const track = this.#issTrack;
    if (!track) return;
    const { object, waypoints, fetchedAtMs } = track;
    const perfNow = typeof performance !== 'undefined' ? performance.now() : 0;
    const nowMs = fetchedAtMs + (perfNow - this.#issStartPerfMs);
    // Find bracketing waypoints
    let i = 0;
    while (i < waypoints.length - 1 && waypoints[i + 1].timestampMs <= nowMs) i++;
    if (i >= waypoints.length - 1) {
      // One-time diagnostic: log why interpolation can't proceed
      if (!this._issDebugLogged) {
        this._issDebugLogged = true;
        const first = waypoints[0]?.timestampMs;
        const last = waypoints[waypoints.length - 1]?.timestampMs;
        console.warn(`[ISS] interpolation stuck — nowMs=${nowMs}, waypoints range=[${first}..${last}], count=${waypoints.length}, fetchedAtMs=${fetchedAtMs}, perfNow=${perfNow.toFixed(0)}, startPerf=${this.#issStartPerfMs.toFixed(0)}`);
      }
      return;
    }
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const span = b.timestampMs - a.timestampMs;
    const t = span > 0 ? Math.min(1, Math.max(0, (nowMs - a.timestampMs) / span)) : 0;

    const lat = a.lat + (b.lat - a.lat) * t;
    const lon = a.lon + (b.lon - a.lon) * t;
    const alt = a.alt + (b.alt - a.alt) * t;
    const pos = latLonToCartesian(lat, lon, 1, alt);

    object.position.set(pos.x, pos.y, pos.z);
    object.lookAt(0, 0, 0);

    // Move pulse ring sprites to match
    for (const sprite of this.#pulseSprites) {
      if (sprite.userData?.markerId === 'iss-current') {
        sprite.position.set(pos.x, pos.y, pos.z);
      }
    }

    // Rebuild short projected dashed line every ~10s
    if (this.#group && (this.#issProjectedLastUpdateMs === 0 || perfNow - this.#issProjectedLastUpdateMs > 10_000)) {
      this.#issProjectedLastUpdateMs = perfNow;
      this.#rebuildProjectedLine(nowMs, lat, lon, alt, waypoints);
      console.log(`[ISS] projected line rebuilt — lat=${lat.toFixed(2)} lon=${lon.toFixed(2)}`);
    }
  }

  /**
   * Build a short dashed line from the current interpolated ISS position
   * to ~10s ahead along the orbit waypoints.
   */
  #rebuildProjectedLine(nowMs, curLat, curLon, curAlt, waypoints) {
    // Remove old projected line
    if (this.#issProjectedLine && this.#group) {
      this.#group.remove(this.#issProjectedLine);
      this.#issProjectedLine.geometry?.dispose();
      this.#issProjectedLine.material?.dispose();
      this.#issProjectedLine = null;
    }

    const lookAheadMs = 10_000; // 10 seconds ahead
    const targetMs = nowMs + lookAheadMs;
    const steps = 6;
    const positions = [latLonToCartesian(curLat, curLon, 1, curAlt)];

    for (let s = 1; s <= steps; s++) {
      const sampleMs = nowMs + (lookAheadMs * s) / steps;
      const actualMs = Math.min(sampleMs, targetMs);
      // Find bracketing waypoints for this future time
      let j = 0;
      while (j < waypoints.length - 1 && waypoints[j + 1].timestampMs <= actualMs) j++;
      if (j >= waypoints.length - 1) break;
      const wa = waypoints[j];
      const wb = waypoints[j + 1];
      const span = wb.timestampMs - wa.timestampMs;
      const ft = span > 0 ? Math.min(1, Math.max(0, (actualMs - wa.timestampMs) / span)) : 0;
      const sLat = wa.lat + (wb.lat - wa.lat) * ft;
      const sLon = wa.lon + (wb.lon - wa.lon) * ft;
      const sAlt = wa.alt + (wb.alt - wa.alt) * ft;
      positions.push(latLonToCartesian(sLat, sLon, 1, sAlt));
    }

    if (positions.length < 2) return;

    const verts = new Float32Array(positions.length * 3);
    for (let k = 0; k < positions.length; k++) {
      verts[k * 3] = positions[k].x;
      verts[k * 3 + 1] = positions[k].y;
      verts[k * 3 + 2] = positions[k].z;
    }
    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(verts, 3));
    const mat = new LineDashedMaterial({
      color: 0xf0e442,
      dashSize: 0.005,
      gapSize: 0.003,
      transparent: true,
      opacity: 0.6,
    });
    const line = new Line(geom, mat);
    line.computeLineDistances();
    line.userData = { isIssProjected: true };
    this.#group.add(line);
    this.#issProjectedLine = line;
  }

  /** Performance.now() baseline for ISS interpolation timing. */
  #issStartPerfMs = 0;

  hasPulseAnimations() {
    return this.#hasPulse || this.#issTrack !== null;
  }

  /** Scale all marker objects inversely with zoom so they keep a constant screen size. */
  applyZoom(zoom) {
    if (!this.#group) return;
    const zoomFactor = 1 / Math.max(zoom, 0.3);
    for (const child of this.#group.children) {
      if (child.userData?.isPulseRing) continue; // pulse rings animate independently
      const base = child.userData?.baseScale ?? 1;
      const s = base * zoomFactor;
      if (child.isGroup) {
        child.scale.set(s, s, s);
      } else {
        child.scale.set(s, s, s);
      }
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

  filterMarkers(matchingIds) {
    if (!this.#group) return;
    if (!matchingIds) {
      for (const child of this.#group.children) {
        child.visible = true;
      }
      return;
    }
    const ids = new Set(matchingIds);
    for (const child of this.#group.children) {
      const markerId = child.userData?.markerId;
      if (markerId) {
        child.visible = ids.has(markerId);
      }
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
    if (this.#issProjectedLine) {
      this.#issProjectedLine.geometry?.dispose();
      this.#issProjectedLine.material?.dispose();
      this.#issProjectedLine = null;
    }
    for (const tex of this.#textureCache.values()) tex.dispose();
    this.#textureCache.clear();
  }
}
