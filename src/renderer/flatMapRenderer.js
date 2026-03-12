/**
 * FlatMapRenderer — 2D canvas-based flat map renderer.
 *
 * Constructor does NOT touch the DOM so it can be instantiated in Node.js tests.
 * All DOM access is deferred to init().
 */

import { getProjection } from '../math/projections/index.js';
import { greatCircleArc, densifyPath } from '../math/geo.js';
import { FlatMapTextureProjector } from './flatMapTextureProjector.js';
import { getBodyLabels } from './bodyLabels.js';
import { getThemePalette } from './themePalette.js';

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function wrapLon(lon) {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

export class FlatMapRenderer {
  // --- private state ---
  #centerLat = 0;
  #centerLon = 0;
  #zoom = 1;
  #projectionName = 'azimuthalEquidistant';

  #canvas = null;
  #ctx = null;
  #overlay = null;
  #container = null;
  #dpr = 1;

  #scene = null;
  #palette = null;
  #textureImage = null;
  #textureProjector = null;
  #markerFilter = null;
  #calloutFilter = null;
  #dirty = false;
  #lowRes = false;
  #borderData = null;

  // ---- constructor: no DOM ----
  constructor() {
    // intentionally empty — DOM init is in init()
  }

  // ---- Public API ----

  init(container, options = {}) {
    this.#container = container;
    this.#dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.pointerEvents = 'none';
    this.#overlay = overlay;

    container.style.position = 'relative';
    container.appendChild(canvas);
    container.appendChild(overlay);

    this.#applySize();

    if (options.textureImage) {
      this.#textureImage = options.textureImage;
    }

    if (options.projection) {
      this.#projectionName = options.projection;
    }

    // Lazily fetch country border data for Earth rendering
    if (typeof fetch !== 'undefined') {
      fetch('assets/ne_110m_countries.geojson')
        .then(r => r.json())
        .then(data => { this.#borderData = data; this.#render(); })
        .catch(() => {});
    }

    this.#render();
  }

  renderScene(scene) {
    this.#scene = scene;
    if (scene && scene.projection && scene.projection !== 'globe') {
      this.#projectionName = scene.projection;
    }
    this.#render();
  }

  flyTo(target, _options = {}) {
    if (target.lat !== undefined) this.#centerLat = target.lat;
    if (target.lon !== undefined) this.#centerLon = target.lon;
    if (target.zoom !== undefined) this.#zoom = clamp(target.zoom, ZOOM_MIN, ZOOM_MAX);
    this.#render();
  }

  panBy(deltaLon, deltaLat) {
    this.#centerLon = wrapLon(this.#centerLon + deltaLon);
    this.#centerLat = clamp(this.#centerLat + deltaLat, -89.999, 89.999);
    this.#render();
  }

  zoomBy(deltaScale) {
    this.#zoom = clamp(this.#zoom + deltaScale, ZOOM_MIN, ZOOM_MAX);
    this.#render();
  }

  screenToLatLon(clientX, clientY) {
    if (!this.#canvas) return null;
    const rect = this.#canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * this.#dpr;
    const py = (clientY - rect.top) * this.#dpr;
    const { x, y } = this.#pixelToProjection(px, py);
    const proj = getProjection(this.#projectionName);
    if (!proj) return null;
    return proj.inverse(x, y, this.#centerLat, this.#centerLon);
  }

  hitTest(clientX, clientY) {
    const latLon = this.screenToLatLon(clientX, clientY);
    if (!latLon || !this.#scene) return null;
    const markers = this.#scene.markers || [];
    const hitRadius = 12; // px
    let closest = null;
    let closestDist = Infinity;
    for (const marker of markers) {
      if (this.#markerFilter && !this.#markerFilter(marker)) continue;
      const px = this.projectPointToClient(marker.lat, marker.lon);
      if (!px) continue;
      const dx = clientX - px.x;
      const dy = clientY - px.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitRadius && dist < closestDist) {
        closestDist = dist;
        closest = marker;
      }
    }
    return closest;
  }

  projectPointToClient(lat, lon) {
    if (!this.#canvas) return null;
    const proj = getProjection(this.#projectionName);
    if (!proj) return null;
    const { x, y } = proj.project(lat, lon, this.#centerLat, this.#centerLon);
    const { px, py } = this.#projectionToPixel(x, y);
    const rect = this.#canvas.getBoundingClientRect();
    return {
      x: px / this.#dpr + rect.left,
      y: py / this.#dpr + rect.top,
    };
  }

  filterMarkers(predicate) {
    this.#markerFilter = predicate;
    this.#dirty = true;
    this.#render();
  }

  filterCallouts(predicate) {
    this.#calloutFilter = predicate;
    this.#dirty = true;
    this.#render();
  }

  getCameraState() {
    return {
      centerLat: this.#centerLat,
      centerLon: this.#centerLon,
      zoom: this.#zoom,
    };
  }

  getScaleAtCenter() {
    if (!this.#canvas || !this.#canvas.width) return null;
    const scale = this.#getScale();
    const projDelta = 1 / scale;
    const planetRadius = this.#scene?.planet?.radius ?? 1;
    const earthRadiusKm = 6371;
    return projDelta * planetRadius * earthRadiusKm;
  }

  resize(w, h) {
    if (!this.#canvas) return;
    this.#canvas.width = w * this.#dpr;
    this.#canvas.height = h * this.#dpr;
    this.#canvas.style.width = `${w}px`;
    this.#canvas.style.height = `${h}px`;
    this.#render();
  }

  destroy() {
    if (this.#canvas && this.#canvas.parentNode) {
      this.#canvas.parentNode.removeChild(this.#canvas);
    }
    if (this.#overlay && this.#overlay.parentNode) {
      this.#overlay.parentNode.removeChild(this.#overlay);
    }
    if (this.#textureProjector) {
      this.#textureProjector.destroy();
    }
    this.#canvas = null;
    this.#ctx = null;
    this.#overlay = null;
    this.#container = null;
    this.#textureProjector = null;
    this.#textureImage = null;
    this.#scene = null;
  }

  pauseIdleRotation() {
    // no-op: flat map has no idle rotation
  }

  resumeIdleRotation() {
    // no-op: flat map has no idle rotation
  }

  show() {
    if (this.#canvas) this.#canvas.style.display = '';
    if (this.#overlay) this.#overlay.style.display = '';
  }

  hide() {
    if (this.#canvas) this.#canvas.style.display = 'none';
    if (this.#overlay) this.#overlay.style.display = 'none';
  }

  startDrag() {
    this.#lowRes = true;
    if (this.#textureProjector) this.#textureProjector.invalidate();
  }

  endDrag() {
    this.#lowRes = false;
    if (this.#textureProjector) this.#textureProjector.invalidate();
    this.#render();
  }

  setProjection(name) {
    this.#projectionName = name;
    if (this.#textureProjector) this.#textureProjector.invalidate();
    this.#render();
  }

  getProjectionName() {
    return this.#projectionName;
  }

  // ---- Private helpers ----

  #applySize() {
    if (!this.#canvas || !this.#container) return;
    const w = this.#container.clientWidth || 800;
    const h = this.#container.clientHeight || 600;
    this.#canvas.width = w * this.#dpr;
    this.#canvas.height = h * this.#dpr;
    this.#canvas.style.width = `${w}px`;
    this.#canvas.style.height = `${h}px`;
  }

  #getScale() {
    if (!this.#canvas) return 1;
    const side = Math.min(this.#canvas.width, this.#canvas.height);
    return (side / (Math.PI * 2)) * this.#zoom;
  }

  #pixelToProjection(px, py) {
    const scale = this.#getScale();
    const cx = this.#canvas ? this.#canvas.width / 2 : 0;
    const cy = this.#canvas ? this.#canvas.height / 2 : 0;
    return {
      x: (px - cx) / scale,
      y: -(py - cy) / scale, // canvas y is flipped vs. math y
    };
  }

  #projectionToPixel(x, y) {
    const scale = this.#getScale();
    const cx = this.#canvas ? this.#canvas.width / 2 : 0;
    const cy = this.#canvas ? this.#canvas.height / 2 : 0;
    return {
      px: x * scale + cx,
      py: -y * scale + cy,
    };
  }

  // Draw a projected polyline with anti-meridian break detection.
  #drawPolyline(ctx, points) {
    if (!points.length) return;
    const proj = getProjection(this.#projectionName);
    if (!proj) return;
    const w = this.#canvas ? this.#canvas.width : 0;
    ctx.beginPath();
    let prevPx = null;
    for (const pt of points) {
      const { x, y } = proj.project(pt.lat, pt.lon, this.#centerLat, this.#centerLon);
      const { px, py } = this.#projectionToPixel(x, y);
      if (prevPx === null) {
        ctx.moveTo(px, py);
      } else {
        // Anti-meridian break: large horizontal jump
        if (Math.abs(px - prevPx) > w / 2) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      prevPx = px;
    }
    ctx.stroke();
  }

  #render() {
    const ctx = this.#ctx;
    if (!ctx || !this.#canvas) return;

    const { width, height } = this.#canvas;
    const scene = this.#scene;

    // 1. Background
    const palette = getThemePalette(scene?.theme ?? 'photo');
    this.#palette = palette;
    ctx.fillStyle = palette.backgroundFlat;
    ctx.fillRect(0, 0, width, height);

    // 2. Texture (browser-only, guarded by textureImage presence and palette)
    if (this.#textureImage && this.#palette.useTextures) {
      this.#renderTexture(ctx, width, height);
    }

    // 3. Graticule
    this.#renderGraticule(ctx);

    if (!scene) return;

    // 4. Regions
    this.#renderRegions(ctx, scene.regions || []);

    // 5. Borders
    this.#renderBorders(ctx, scene);

    // 6. Paths
    this.#renderPaths(ctx, scene.paths || []);

    // 7. Arcs
    this.#renderArcs(ctx, scene.arcs || []);

    // 8. Markers
    this.#renderMarkers(ctx, scene.markers || []);

    // 9. Geo labels
    this.#renderGeoLabels(ctx, scene);

    // 10. Callouts
    this.#renderCallouts(scene);
  }

  #renderCallouts(scene) {
    if (!this.#overlay) return;
    while (this.#overlay.firstChild) this.#overlay.removeChild(this.#overlay.firstChild);

    const markers = scene?.markers || [];
    const proj = getProjection(this.#projectionName);
    if (!proj) return;

    for (const marker of markers) {
      if (this.#markerFilter && !this.#markerFilter(marker)) continue;
      if (this.#calloutFilter && !this.#calloutFilter(marker)) continue;

      const label = marker.callout || marker.label || marker.id;
      if (!label) continue;

      // Only show callouts for markers that have callout content
      if (!marker.callout && !marker.label) continue;

      if (proj.isVisible && !proj.isVisible(marker.lat, marker.lon, this.#centerLat, this.#centerLon)) continue;

      const { x, y } = proj.project(marker.lat, marker.lon, this.#centerLat, this.#centerLon);
      const { px, py } = this.#projectionToPixel(x, y);

      // Cull if outside canvas
      const w = this.#canvas ? this.#canvas.width : 0;
      const h = this.#canvas ? this.#canvas.height : 0;
      if (px < -100 || px > w + 100 || py < -100 || py > h + 100) continue;

      const div = document.createElement('div');
      div.textContent = label;
      div.style.cssText = `
        position: absolute;
        left: ${px / this.#dpr}px;
        top: ${(py / this.#dpr) - 16}px;
        transform: translateX(-50%);
        font-size: 11px;
        color: #e8f0ff;
        white-space: nowrap;
        pointer-events: none;
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      `;
      this.#overlay.appendChild(div);
    }
  }

  #renderTexture(ctx, width, height) {
    if (!this.#textureProjector) {
      this.#textureProjector = new FlatMapTextureProjector();
    }
    const proj = getProjection(this.#projectionName);
    if (!proj) return;
    const needsDesaturate = this.#palette && this.#palette.desaturate > 0;
    if (needsDesaturate) {
      ctx.save();
      ctx.filter = 'grayscale(1)';
    }
    this.#textureProjector.project(
      ctx,
      this.#textureImage,
      proj,
      this.#projectionName,
      this.#centerLat,
      this.#centerLon,
      width,
      height,
      (x, y) => this.#projectionToPixel(x, y),
      (px, py) => this.#pixelToProjection(px, py),
      this.#lowRes,
    );
    if (needsDesaturate) {
      ctx.restore();
    }
  }

  #renderGraticule(ctx) {
    const proj = getProjection(this.#projectionName);
    if (!proj) return;
    ctx.save();
    const p = this.#palette;
    if (p) {
      const hex = '#' + p.graticuleColor.toString(16).padStart(6, '0');
      ctx.strokeStyle = hex;
      ctx.globalAlpha = p.graticuleOpacity;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    }
    ctx.lineWidth = 0.5;

    // Latitude lines every 30°
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 2) {
        pts.push({ lat, lon });
      }
      this.#drawPolyline(ctx, pts);
    }

    // Longitude lines every 30°
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 2) {
        pts.push({ lat, lon });
      }
      this.#drawPolyline(ctx, pts);
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  #renderRegions(ctx, regions) {
    if (!regions.length) return;
    const proj = getProjection(this.#projectionName);
    if (!proj) return;

    for (const region of regions) {
      const polygons = region.geometry || [];
      ctx.save();
      ctx.fillStyle = region.fillColor || 'rgba(100,140,200,0.3)';
      ctx.strokeStyle = region.strokeColor || 'rgba(100,140,200,0.8)';
      ctx.lineWidth = region.strokeWidth || 1;

      for (const ring of polygons) {
        ctx.beginPath();
        let first = true;
        let prevPx = null;
        const w = this.#canvas ? this.#canvas.width : 0;
        for (const pt of ring) {
          const { x, y } = proj.project(pt.lat, pt.lon, this.#centerLat, this.#centerLon);
          const { px, py } = this.#projectionToPixel(x, y);
          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else {
            if (prevPx !== null && Math.abs(px - prevPx) > w / 2) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          prevPx = px;
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  #renderPaths(ctx, paths) {
    for (const path of paths) {
      if (!path.points || path.points.length < 2) continue;
      const dense = densifyPath(path.points);
      ctx.save();
      ctx.strokeStyle = path.color || '#4af';
      ctx.lineWidth = path.width || 2;
      ctx.setLineDash(path.dash || []);
      this.#drawPolyline(ctx, dense);
      ctx.restore();
    }
  }

  #renderArcs(ctx, arcs) {
    for (const arc of arcs) {
      if (!arc.start || !arc.end) continue;
      const pts = greatCircleArc(arc.start, arc.end, {
        segments: arc.segments || 64,
        maxAltitude: arc.maxAltitude || 0,
      });
      ctx.save();
      ctx.strokeStyle = arc.color || '#f80';
      ctx.lineWidth = arc.width || 2;

      // Draw with altitude-based opacity along segments
      const proj = getProjection(this.#projectionName);
      if (!proj) { ctx.restore(); continue; }

      const w = this.#canvas ? this.#canvas.width : 0;
      let prevPx = null;
      let prevPy = null;
      const maxAlt = pts.reduce((m, p) => Math.max(m, p.alt || 0), 0) || 1;

      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const { x, y } = proj.project(pt.lat, pt.lon, this.#centerLat, this.#centerLon);
        const { px, py } = this.#projectionToPixel(x, y);

        if (i === 0) {
          prevPx = px;
          prevPy = py;
          continue;
        }

        const antimeridianBreak = Math.abs(px - prevPx) > w / 2;
        if (!antimeridianBreak) {
          const opacity = 0.4 + 0.6 * ((pt.alt || 0) / maxAlt);
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.moveTo(prevPx, prevPy);
          ctx.lineTo(px, py);
          ctx.stroke();
        }

        prevPx = px;
        prevPy = py;
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  #renderMarkers(ctx, markers) {
    const proj = getProjection(this.#projectionName);
    if (!proj) return;

    for (const marker of markers) {
      if (this.#markerFilter && !this.#markerFilter(marker)) continue;

      const { x, y } = proj.project(marker.lat, marker.lon, this.#centerLat, this.#centerLon);
      const { px, py } = this.#projectionToPixel(x, y);

      // All marker types fall back to dot
      const radius = marker.size || 6;
      ctx.save();
      ctx.fillStyle = marker.color || '#e44';
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      if (marker.strokeColor) {
        ctx.strokeStyle = marker.strokeColor;
        ctx.lineWidth = marker.strokeWidth || 1;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  #renderBorders(ctx, scene) {
    if (!this.#borderData) return;
    const bodyId = scene?.planet?.id || 'earth';
    if (bodyId !== 'earth') return;

    const proj = getProjection(this.#projectionName);
    if (!proj) return;
    const w = this.#canvas ? this.#canvas.width : 0;

    ctx.save();
    const p = this.#palette;
    if (p) {
      const hex = '#' + p.borderColor.toString(16).padStart(6, '0');
      ctx.strokeStyle = hex;
      ctx.globalAlpha = p.borderOpacity;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    }
    ctx.lineWidth = 0.5;

    for (const feature of this.#borderData.features) {
      const geom = feature.geometry;
      const rings = geom.type === 'MultiPolygon'
        ? geom.coordinates.flat()
        : geom.coordinates;

      for (const ring of rings) {
        ctx.beginPath();
        let prevPx = null;
        for (const coord of ring) {
          const lon = coord[0];
          const lat = coord[1];
          const { x, y } = proj.project(lat, lon, this.#centerLat, this.#centerLon);
          const { px, py } = this.#projectionToPixel(x, y);
          if (prevPx === null) {
            ctx.moveTo(px, py);
          } else if (Math.abs(px - prevPx) > w / 2) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
          prevPx = px;
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  #renderGeoLabels(ctx, scene) {
    const bodyId = scene?.planet?.id || 'earth';
    const labels = getBodyLabels(bodyId);
    if (!labels || !labels.length) return;

    const proj = getProjection(this.#projectionName);
    if (!proj) return;
    const w = this.#canvas ? this.#canvas.width : 0;
    const h = this.#canvas ? this.#canvas.height : 0;
    const fontSize = Math.round(10 * Math.sqrt(this.#zoom));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const label of labels) {
      if (proj.isVisible && !proj.isVisible(label.lat, label.lon, this.#centerLat, this.#centerLon)) continue;

      const { x, y } = proj.project(label.lat, label.lon, this.#centerLat, this.#centerLon);
      const { px, py } = this.#projectionToPixel(x, y);

      // Cull outside viewport
      if (px < -50 || px > w + 50 || py < -50 || py > h + 50) continue;

      const p = this.#palette;

      if (label.style === 'ocean') {
        ctx.font = `italic ${fontSize}px "Avenir Next", sans-serif`;
        ctx.fillStyle = p?.labelStyles?.ocean || 'rgba(100, 160, 220, 0.7)';
      } else if (label.style === 'continent') {
        ctx.font = `bold ${fontSize * 1.2}px "Avenir Next", sans-serif`;
        ctx.fillStyle = p?.labelStyles?.continent || 'rgba(255, 255, 255, 0.6)';
      } else if (label.style === 'feature') {
        ctx.font = `${fontSize * 0.9}px "Avenir Next", sans-serif`;
        ctx.fillStyle = p?.labelStyles?.feature || 'rgba(200, 220, 255, 0.5)';
      } else {
        ctx.font = `${fontSize * 0.9}px "Avenir Next", sans-serif`;
        ctx.fillStyle = p?.labelStyles?.region || 'rgba(200, 220, 255, 0.5)';
      }

      ctx.fillText(label.text, px, py);
    }
    ctx.restore();
  }
}
