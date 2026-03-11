import { densifyPath, greatCircleArc } from '../math/geo.js';
import { pointDistance, pointInPolygon, polylineMinDistance } from '../math/hit.js';
import {
  clampLatitude,
  getGlobeRadius,
  inverseOrthographicProject,
  normalizeLongitude,
  orthographicProject,
} from '../math/sphereProjection.js';
import { getSunLightVector } from '../math/solar.js';

function clearCanvas(ctx, width, height, color = '#07152f') {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

function projectGeoPoint(point, width, height, camera, globeRadius) {
  return orthographicProject(point, {
    width,
    height,
    globeRadius,
    centerLat: camera.centerLat,
    centerLon: camera.centerLon,
  });
}

function parseHexColor(value, fallback = '#1e90ff') {
  const input = typeof value === 'string' ? value.trim() : '';
  const normalized = input.startsWith('#') ? input.slice(1) : input;

  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }

  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return {
      r: Number.parseInt(normalized[0] + normalized[0], 16),
      g: Number.parseInt(normalized[1] + normalized[1], 16),
      b: Number.parseInt(normalized[2] + normalized[2], 16),
    };
  }

  if (fallback !== value) {
    return parseHexColor(fallback, '#1e90ff');
  }

  return { r: 30, g: 144, b: 255 };
}

function rgbToHex({ r, g, b }) {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

function shadeHexColor(color, intensity) {
  const source = parseHexColor(color);
  const clampedIntensity = Math.max(0, intensity);

  return rgbToHex({
    r: source.r * clampedIntensity,
    g: source.g * clampedIntensity,
    b: source.b * clampedIntensity,
  });
}

function normalizeVector3(vector) {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function resolveLightVector(camera, planet) {
  if (planet?.lightingMode === 'sun') {
    return getSunLightVector(camera, planet?.lightingTimestamp);
  }
  return normalizeVector3({ x: -0.42, y: 0.32, z: 0.85 });
}

let _textureDataCache = null;
let _textureDataCacheUri = '';

function getTexturePixelData(textureImage) {
  const uri = textureImage.src ?? '';
  if (_textureDataCache && _textureDataCacheUri === uri) {
    return _textureDataCache;
  }

  const tw = textureImage.naturalWidth;
  const th = textureImage.naturalHeight;
  const offscreen = document.createElement('canvas');
  offscreen.width = tw;
  offscreen.height = th;
  const offCtx = offscreen.getContext('2d');
  offCtx.drawImage(textureImage, 0, 0);
  _textureDataCache = offCtx.getImageData(0, 0, tw, th);
  _textureDataCacheUri = uri;
  return _textureDataCache;
}

function drawSphereTexture(ctx, textureImage, centerX, centerY, radius, camera) {
  if (!textureImage || !textureImage.complete || textureImage.naturalWidth <= 0) {
    return;
  }

  const tw = textureImage.naturalWidth;
  const th = textureImage.naturalHeight;

  let texData;
  try {
    texData = getTexturePixelData(textureImage);
  } catch (_) {
    return;
  }
  const texPixels = texData.data;

  const step = radius > 200 ? 2 : 1;
  const outW = Math.ceil((radius * 2) / step);
  const outH = Math.ceil((radius * 2) / step);
  const offscreen = document.createElement('canvas');
  offscreen.width = outW;
  offscreen.height = outH;
  const offCtx = offscreen.getContext('2d');
  const imageData = offCtx.createImageData(outW, outH);
  const out = imageData.data;

  const width = (centerX * 2) || 1;
  const height = (centerY * 2) || 1;
  const invOpts = {
    width,
    height,
    globeRadius: radius,
    centerLat: camera.centerLat,
    centerLon: camera.centerLon,
  };

  const x0 = centerX - radius;
  const y0 = centerY - radius;
  const rSq = radius * radius;

  const DEG_TO_RAD = Math.PI / 180;
  const centerLatRad = (invOpts.centerLat ?? 0) * DEG_TO_RAD;
  const centerLonRad = (invOpts.centerLon ?? 0) * DEG_TO_RAD;
  const sinCLat = Math.sin(centerLatRad);
  const cosCLat = Math.cos(centerLatRad);

  for (let oy = 0; oy < outH; oy++) {
    const py = y0 + oy * step;
    const ny = (centerY - py) / radius;
    const nySq = ny * ny;

    for (let ox = 0; ox < outW; ox++) {
      const px = x0 + ox * step;
      const nx = (px - centerX) / radius;
      const rhoSq = nx * nx + nySq;

      if (rhoSq > 1) continue;

      const rho = Math.sqrt(rhoSq);
      let lat, lon;

      if (rho < 1e-10) {
        lat = invOpts.centerLat;
        lon = invOpts.centerLon;
      } else {
        const c = Math.asin(rho);
        const cosC = Math.cos(c);
        const sinC = Math.sin(c);
        lat = Math.asin(cosC * sinCLat + (ny * sinC * cosCLat) / rho) * (180 / Math.PI);
        lon = invOpts.centerLon + Math.atan2(
          nx * sinC,
          rho * cosCLat * cosC - ny * sinCLat * sinC
        ) * (180 / Math.PI);
      }

      const u = ((lon + 180) % 360 + 360) % 360 / 360;
      const v = (90 - lat) / 180;

      const tx = Math.min(tw - 1, Math.max(0, Math.round(u * (tw - 1))));
      const ty = Math.min(th - 1, Math.max(0, Math.round(v * (th - 1))));

      const srcIdx = (ty * tw + tx) * 4;
      const dstIdx = (oy * outW + ox) * 4;

      out[dstIdx] = texPixels[srcIdx];
      out[dstIdx + 1] = texPixels[srcIdx + 1];
      out[dstIdx + 2] = texPixels[srcIdx + 2];
      out[dstIdx + 3] = texPixels[srcIdx + 3];
    }
  }

  offCtx.putImageData(imageData, 0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.38;
  ctx.drawImage(offscreen, x0, y0, radius * 2, radius * 2);
  ctx.restore();
}

function drawSphereBody(ctx, width, height, camera, planet, textureImage) {
  const radius = getGlobeRadius(width, height, camera.zoom);
  const centerX = width / 2;
  const centerY = height / 2;
  const baseColor = planet.baseColor ?? '#1e90ff';
  const light = resolveLightVector(camera, planet);
  const lightOffsetX = centerX + radius * light.x * 0.55;
  const lightOffsetY = centerY - radius * light.y * 0.55;

  const sphereGradient = ctx.createRadialGradient(
    lightOffsetX,
    lightOffsetY,
    radius * 0.22,
    centerX,
    centerY,
    radius
  );
  sphereGradient.addColorStop(0, shadeHexColor(baseColor, 0.98));
  sphereGradient.addColorStop(0.55, shadeHexColor(baseColor, 0.86));
  sphereGradient.addColorStop(1, shadeHexColor(baseColor, 0.48));

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = sphereGradient;
  ctx.fill();

  drawSphereTexture(ctx, textureImage, centerX, centerY, radius, camera);

  const edgeShade = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.5,
    centerX,
    centerY,
    radius * 1.02
  );
  edgeShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  edgeShade.addColorStop(1, 'rgba(0, 0, 0, 0.28)');

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = edgeShade;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(180, 213, 255, 0.42)';
  ctx.lineWidth = Math.max(1.6, radius * 0.015);
  ctx.stroke();

  return {
    radius,
    centerX,
    centerY,
  };
}

function drawProjectedPolyline(ctx, projectedPoints, options = {}) {
  if (!Array.isArray(projectedPoints) || projectedPoints.length < 2) {
    return;
  }

  ctx.beginPath();
  ctx.lineWidth = Number(options.strokeWidth ?? 1);
  ctx.strokeStyle = options.color ?? '#00aaff';
  ctx.setLineDash(Array.isArray(options.dashPattern) ? options.dashPattern : []);

  let hasSegment = false;
  let drawing = false;

  for (const point of projectedPoints) {
    if (point.visible) {
      if (!drawing) {
        ctx.moveTo(point.x, point.y);
        drawing = true;
      } else {
        ctx.lineTo(point.x, point.y);
        hasSegment = true;
      }
    } else {
      drawing = false;
    }
  }

  if (hasSegment) {
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawGraticule(ctx, width, height, camera, globeRadius) {
  const options = {
    color: 'rgba(190, 216, 255, 0.16)',
    strokeWidth: 1,
  };

  for (let lat = -60; lat <= 60; lat += 30) {
    const projected = [];
    for (let lon = -180; lon <= 180; lon += 4) {
      projected.push(projectGeoPoint({ lat, lon, alt: 0 }, width, height, camera, globeRadius));
    }
    drawProjectedPolyline(ctx, projected, options);
  }

  for (let lon = -150; lon <= 180; lon += 30) {
    const projected = [];
    for (let lat = -85; lat <= 85; lat += 3) {
      projected.push(projectGeoPoint({ lat, lon, alt: 0 }, width, height, camera, globeRadius));
    }
    drawProjectedPolyline(ctx, projected, options);
  }
}

function drawMarker(ctx, marker, width, height, camera, assets, globeRadius, locale = 'en') {
  const projected = projectGeoPoint(marker, width, height, camera, globeRadius);
  if (!projected.visible) {
    return null;
  }

  const visualType = marker.visualType ?? 'dot';
  const depthFactor = Math.max(0.62, Math.min(1.35, 0.82 + projected.depth * 0.38));

  if (visualType === 'image' && marker.assetUri) {
    const image = assets.get(marker.assetUri);
    if (image && image.complete && image.naturalWidth > 0) {
      const size = 16 * depthFactor;
      ctx.drawImage(image, projected.x - size / 2, projected.y - size / 2, size, size);
      return projected;
    }
  }

  if (visualType === 'model') {
    const size = 7 * depthFactor;
    ctx.beginPath();
    ctx.fillStyle = marker.color ?? '#ff6a00';
    ctx.moveTo(projected.x, projected.y - size);
    ctx.lineTo(projected.x - size * 0.75, projected.y + size * 0.8);
    ctx.lineTo(projected.x + size * 0.75, projected.y + size * 0.8);
    ctx.closePath();
    ctx.fill();
    return projected;
  }

  if (visualType === 'text') {
    const label = marker.name?.[locale] ?? marker.name?.en ?? marker.id ?? '';
    if (typeof label === 'string' && label.length > 0 && typeof ctx.fillText === 'function') {
      const fontSize = Math.max(10, Math.min(22, 12 * depthFactor));
      const lineWidth = Math.max(2, fontSize * 0.26);
      const fillColor = marker.color ?? '#f5f9ff';

      if (typeof ctx.save === 'function') {
        ctx.save();
      }
      ctx.font = `600 ${fontSize.toFixed(1)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = 'rgba(6, 12, 26, 0.78)';
      ctx.fillStyle = fillColor;
      if (typeof ctx.strokeText === 'function') {
        ctx.strokeText(label, projected.x, projected.y);
      }
      ctx.fillText(label, projected.x, projected.y);
      if (typeof ctx.restore === 'function') {
        ctx.restore();
      }
    }
    return projected;
  }

  const size = 4 * depthFactor;
  ctx.beginPath();
  ctx.fillStyle = marker.color ?? '#ff6a00';
  ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2);
  ctx.fill();

  return projected;
}

function drawRegion(ctx, region, width, height, camera, globeRadius) {
  const geometry = region.geojson;
  if (!geometry) {
    return;
  }

  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [];

  for (const polygon of polygons) {
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 3) {
        continue;
      }

      const projected = ring.map(([lon, lat]) => projectGeoPoint(
        { lat, lon, alt: region.altitude ?? 0 },
        width,
        height,
        camera,
        globeRadius
      ));

      const allVisible = projected.every((entry) => entry.visible);
      if (allVisible) {
        ctx.beginPath();
        projected.forEach((entry, index) => {
          if (index === 0) {
            ctx.moveTo(entry.x, entry.y);
          } else {
            ctx.lineTo(entry.x, entry.y);
          }
        });
        ctx.closePath();
        ctx.fillStyle = region.capColor ?? 'rgba(76, 175, 80, 0.3)';
        ctx.fill();
        ctx.strokeStyle = region.sideColor ?? '#2e7d32';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        drawProjectedPolyline(ctx, projected, {
          color: region.sideColor ?? '#2e7d32',
          strokeWidth: 1,
        });
      }
    }
  }
}

function projectedPolylineDistance(point, projectedPoints) {
  if (!Array.isArray(projectedPoints) || projectedPoints.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;
  let segment = [];

  for (const projected of projectedPoints) {
    if (projected.visible) {
      segment.push(projected);
      continue;
    }

    if (segment.length >= 2) {
      minDistance = Math.min(minDistance, polylineMinDistance(point, segment));
    }
    segment = [];
  }

  if (segment.length >= 2) {
    minDistance = Math.min(minDistance, polylineMinDistance(point, segment));
  }

  return minDistance;
}

export class CanvasGlobeRenderer {
  #canvas;
  #ctx;
  #lastScene;
  #assets = new Map();
  #camera = {
    centerLon: 0,
    centerLat: 0,
    zoom: 1,
  };

  #loadAsset(uri) {
    if (!uri || this.#assets.has(uri) || typeof Image !== 'function') {
      return;
    }
    const image = new Image();
    image.src = uri;
    this.#assets.set(uri, image);
    image.addEventListener('load', () => {
      if (this.#lastScene) {
        this.renderScene(this.#lastScene);
      }
    });
  }

  #toCanvasPoint(clientX, clientY) {
    if (!this.#canvas) {
      return null;
    }
    const rect = this.#canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    return {
      x: (clientX - rect.left) * (this.#canvas.width / rect.width),
      y: (clientY - rect.top) * (this.#canvas.height / rect.height),
    };
  }

  #toClientPoint(canvasX, canvasY) {
    if (!this.#canvas) {
      return null;
    }
    const rect = this.#canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    return {
      clientX: rect.left + canvasX * (rect.width / this.#canvas.width),
      clientY: rect.top + canvasY * (rect.height / this.#canvas.height),
    };
  }

  init(container, options = {}) {
    const existing = options.canvas;
    this.#canvas = existing ?? document.createElement('canvas');
    this.#canvas.width = options.width ?? container.clientWidth ?? 800;
    this.#canvas.height = options.height ?? container.clientHeight ?? 500;
    this.#ctx = this.#canvas.getContext('2d');

    if (!existing) {
      container.appendChild(this.#canvas);
    }

    this.renderScene(options.initialScene ?? {
      markers: [],
      paths: [],
      arcs: [],
      regions: [],
      planet: { baseColor: '#07152f' },
    });
  }

  resize(width, height) {
    if (!this.#canvas) {
      return;
    }
    this.#canvas.width = Math.max(1, width);
    this.#canvas.height = Math.max(1, height);
  }

  renderScene(scene) {
    if (!this.#ctx || !this.#canvas) {
      return;
    }

    this.#lastScene = scene;

    const width = this.#canvas.width;
    const height = this.#canvas.height;

    clearCanvas(this.#ctx, width, height, '#020b18');

    const planet = scene.planet ?? {};
    if (planet.textureUri) {
      this.#loadAsset(planet.textureUri);
    }

    const sphere = drawSphereBody(
      this.#ctx,
      width,
      height,
      this.#camera,
      planet,
      planet.textureUri ? this.#assets.get(planet.textureUri) : null
    );

    drawGraticule(this.#ctx, width, height, this.#camera, sphere.radius);

    for (const region of scene.regions ?? []) {
      drawRegion(this.#ctx, region, width, height, this.#camera, sphere.radius);
    }

    for (const path of scene.paths ?? []) {
      const dense = densifyPath(path.points ?? [], { maxStepDegrees: 8 });
      const projected = dense.map((point) => projectGeoPoint(point, width, height, this.#camera, sphere.radius));
      drawProjectedPolyline(this.#ctx, projected, {
        color: path.color,
        strokeWidth: path.strokeWidth,
        dashPattern: path.dashPattern,
      });
    }

    for (const arc of scene.arcs ?? []) {
      const arcPoints = greatCircleArc(arc.start, arc.end, {
        segments: 64,
        maxAltitude: arc.maxAltitude ?? 0,
      });
      const projected = arcPoints.map((point) => projectGeoPoint(point, width, height, this.#camera, sphere.radius));
      drawProjectedPolyline(this.#ctx, projected, {
        color: arc.color,
        strokeWidth: arc.strokeWidth,
        dashPattern: arc.dashPattern,
      });
    }

    for (const marker of scene.markers ?? []) {
      if (marker.assetUri) {
        this.#loadAsset(marker.assetUri);
      }
      drawMarker(this.#ctx, marker, width, height, this.#camera, this.#assets, sphere.radius, scene.locale ?? 'en');
    }
  }

  flyTo(target, options = {}) {
    this.#camera.centerLon = normalizeLongitude(target.lon ?? 0);
    this.#camera.centerLat = clampLatitude(target.lat ?? 0);
    if (typeof options.zoom === 'number') {
      this.#camera.zoom = Math.max(0.3, Math.min(4, options.zoom));
    }
  }

  panBy(deltaLon, deltaLat) {
    this.#camera.centerLon = normalizeLongitude(this.#camera.centerLon - Number(deltaLon ?? 0));
    this.#camera.centerLat = clampLatitude(this.#camera.centerLat + Number(deltaLat ?? 0));
  }

  zoomBy(deltaScale) {
    const nextZoom = this.#camera.zoom + Number(deltaScale ?? 0);
    this.#camera.zoom = Math.max(0.3, Math.min(4, nextZoom));
  }

  projectPointToClient(point) {
    if (!this.#canvas) {
      return null;
    }

    const width = this.#canvas.width;
    const height = this.#canvas.height;
    const globeRadius = getGlobeRadius(width, height, this.#camera.zoom);
    const projected = projectGeoPoint(point ?? {}, width, height, this.#camera, globeRadius);
    const clientPoint = this.#toClientPoint(projected.x, projected.y);
    if (!clientPoint) {
      return null;
    }

    return {
      ...projected,
      ...clientPoint,
      canvasX: projected.x,
      canvasY: projected.y,
    };
  }

  getCameraState() {
    return {
      centerLon: this.#camera.centerLon,
      centerLat: this.#camera.centerLat,
      zoom: this.#camera.zoom,
    };
  }

  hitTest(clientX, clientY, options = {}) {
    if (!this.#canvas || !this.#lastScene) {
      return null;
    }

    const point = this.#toCanvasPoint(clientX, clientY);
    if (!point) {
      return null;
    }

    const scene = this.#lastScene;
    const width = this.#canvas.width;
    const height = this.#canvas.height;
    const globeRadius = getGlobeRadius(width, height, this.#camera.zoom);
    const markerRadius = Number(options.markerRadius ?? 9);
    const clickClientPoint = this.#toClientPoint(point.x, point.y);

    for (let i = (scene.markers?.length ?? 0) - 1; i >= 0; i -= 1) {
      const marker = scene.markers[i];
      const projected = projectGeoPoint(marker, width, height, this.#camera, globeRadius);
      if (!projected.visible) {
        continue;
      }
      const localMarkerRadius = marker.visualType === 'text'
        ? markerRadius * 1.75
        : markerRadius;
      if (pointDistance(point, projected) <= localMarkerRadius) {
        const markerClientPoint = this.#toClientPoint(projected.x, projected.y);
        return {
          kind: 'marker',
          id: marker.id,
          entity: structuredClone(marker),
          anchor: {
            clientX: markerClientPoint?.clientX ?? clickClientPoint?.clientX ?? clientX,
            clientY: markerClientPoint?.clientY ?? clickClientPoint?.clientY ?? clientY,
            canvasX: projected.x,
            canvasY: projected.y,
          },
        };
      }
    }

    for (let i = (scene.arcs?.length ?? 0) - 1; i >= 0; i -= 1) {
      const arc = scene.arcs[i];
      const arcPoints = greatCircleArc(arc.start, arc.end, {
        segments: 64,
        maxAltitude: arc.maxAltitude ?? 0,
      });
      const projected = arcPoints.map((entry) => projectGeoPoint(entry, width, height, this.#camera, globeRadius));
      const distance = projectedPolylineDistance(point, projected);
      const maxDistance = Math.max(4, Number(arc.strokeWidth ?? 1) + 3);

      if (distance <= maxDistance) {
        return {
          kind: 'arc',
          id: arc.id,
          entity: structuredClone(arc),
          anchor: {
            clientX: clickClientPoint?.clientX ?? clientX,
            clientY: clickClientPoint?.clientY ?? clientY,
            canvasX: point.x,
            canvasY: point.y,
          },
        };
      }
    }

    for (let i = (scene.paths?.length ?? 0) - 1; i >= 0; i -= 1) {
      const path = scene.paths[i];
      const dense = densifyPath(path.points ?? [], { maxStepDegrees: 8 });
      const projected = dense.map((entry) => projectGeoPoint(entry, width, height, this.#camera, globeRadius));
      const distance = projectedPolylineDistance(point, projected);
      const maxDistance = Math.max(4, Number(path.strokeWidth ?? 1) + 3);

      if (distance <= maxDistance) {
        return {
          kind: 'path',
          id: path.id,
          entity: structuredClone(path),
          anchor: {
            clientX: clickClientPoint?.clientX ?? clientX,
            clientY: clickClientPoint?.clientY ?? clientY,
            canvasX: point.x,
            canvasY: point.y,
          },
        };
      }
    }

    for (let i = (scene.regions?.length ?? 0) - 1; i >= 0; i -= 1) {
      const region = scene.regions[i];
      const geometry = region.geojson;
      const polygons = geometry?.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry?.type === 'MultiPolygon'
          ? geometry.coordinates
          : [];

      for (const polygon of polygons) {
        for (const ring of polygon) {
          if (!Array.isArray(ring) || ring.length < 3) {
            continue;
          }

          const projected = ring.map(([lon, lat]) => projectGeoPoint(
            { lat, lon, alt: region.altitude ?? 0 },
            width,
            height,
            this.#camera,
            globeRadius
          ));

          if (!projected.every((entry) => entry.visible)) {
            continue;
          }

          if (pointInPolygon(point, projected)) {
            return {
              kind: 'region',
              id: region.id,
              entity: structuredClone(region),
              anchor: {
                clientX: clickClientPoint?.clientX ?? clientX,
                clientY: clickClientPoint?.clientY ?? clientY,
                canvasX: point.x,
                canvasY: point.y,
              },
            };
          }
        }
      }
    }

    return null;
  }

  destroy() {
    if (this.#canvas?.parentNode) {
      this.#canvas.parentNode.removeChild(this.#canvas);
    }
    this.#canvas = undefined;
    this.#ctx = undefined;
  }
}
