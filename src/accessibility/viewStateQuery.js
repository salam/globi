export class ViewStateQuery {
  #renderer = null;

  setRenderer(renderer) { this.#renderer = renderer; }
  getRenderer() { return this.#renderer; }

  project(lat, lon, alt = 0) {
    if (!this.#renderer || typeof this.#renderer.projectPointToClient !== 'function') return null;
    let result;
    if (this.#renderer.projectPointToClient.length <= 1) {
      result = this.#renderer.projectPointToClient({ lat, lon, alt });
    } else {
      result = this.#renderer.projectPointToClient(lat, lon);
    }
    if (!result) return null;

    // Normalize: 3D renderer returns { clientX, clientY, visible }, flat returns { x, y }.
    // Note: the `visible` flag (v.z < 1 far-plane check) is intentionally not used —
    // the isPointOccluded() dot-product test is more precise for globe occlusion.
    const x = result.x ?? result.clientX;
    const y = result.y ?? result.clientY;
    if (x == null || y == null) return null;

    return { x, y };
  }

  getViewAngle() {
    if (!this.#renderer || typeof this.#renderer.getCameraState !== 'function') return null;
    const cam = this.#renderer.getCameraState();
    return { lat: cam.centerLat, lon: cam.centerLon, zoom: cam.zoom };
  }

  getViewportBounds() {
    if (!this.#renderer) return null;
    const cam = this.#renderer.getCameraState();
    const span = 90 / Math.max(cam.zoom, 0.3);
    return {
      north: Math.min(90, cam.centerLat + span),
      south: Math.max(-90, cam.centerLat - span),
      east: cam.centerLon + span,
      west: cam.centerLon - span,
    };
  }

  getVisibleEntities(scene) {
    const empty = { markers: [], arcs: [], paths: [], regions: [] };
    if (!this.#renderer || !scene) return empty;
    const rect = typeof this.#renderer.getCanvasRect === 'function' ? this.#renderer.getCanvasRect() : null;
    if (!rect) return empty;

    const inViewport = (screenPt) => {
      if (!screenPt) return false;
      return screenPt.x >= rect.left && screenPt.x <= rect.left + rect.width
        && screenPt.y >= rect.top && screenPt.y <= rect.top + rect.height;
    };

    const markers = (scene.markers ?? []).filter((m) => inViewport(this.project(m.lat, m.lon, m.alt ?? 0)));
    const arcs = (scene.arcs ?? []).filter((a) => {
      const s = this.project(a.start.lat, a.start.lon, a.start.alt ?? 0);
      const e = this.project(a.end.lat, a.end.lon, a.end.alt ?? 0);
      return inViewport(s) || inViewport(e);
    });
    const paths = (scene.paths ?? []).filter((p) => (p.points ?? []).some((pt) => inViewport(this.project(pt.lat, pt.lon, pt.alt ?? 0))));
    const bounds = this.getViewportBounds();
    const regions = (scene.regions ?? []).filter((r) => {
      if (!r.geojson) return false;
      const coords = extractCoords(r.geojson);
      if (coords.some(([lon, lat]) => inViewport(this.project(lat, lon, 0)))) return true;
      if (bounds && coords.length > 0) return bboxContainsPoint(coords, bounds);
      return false;
    });

    return { markers, arcs, paths, regions };
  }

  getEntityAtPoint(x, y) {
    if (!this.#renderer || typeof this.#renderer.hitTest !== 'function') return null;
    const result = this.#renderer.hitTest(x, y);
    if (!result) return null;
    if (result.kind) return { type: result.kind, entity: result.entity ?? result };
    if (result.lat != null) return { type: 'marker', entity: result };
    return result;
  }
}

function extractCoords(geojson) {
  if (!geojson) return [];
  if (geojson.type === 'Polygon') return (geojson.coordinates ?? []).flat();
  if (geojson.type === 'MultiPolygon') return (geojson.coordinates ?? []).flat(2);
  return [];
}

function bboxContainsPoint(coords, viewportBounds) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const centerLat = (viewportBounds.north + viewportBounds.south) / 2;
  const centerLon = (viewportBounds.east + viewportBounds.west) / 2;
  return centerLat >= minLat && centerLat <= maxLat && centerLon >= minLon && centerLon <= maxLon;
}
