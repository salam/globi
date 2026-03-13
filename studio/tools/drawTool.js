export function simplifyRDP(points, epsilon) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) { maxDist = d; maxIndex = i; }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyRDP(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.lon - lineStart.lon;
  const dy = lineEnd.lat - lineStart.lat;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((point.lon - lineStart.lon) ** 2 + (point.lat - lineStart.lat) ** 2);
  return Math.abs(dy * point.lon - dx * point.lat + lineEnd.lon * lineStart.lat - lineEnd.lat * lineStart.lon) / len;
}

let counter = 0;

export class DrawTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
    this._drawing = false;
    this._points = [];
    this.mode = 'freehand';
    this._ptp_points = [];
  }

  toggleMode() {
    this.mode = this.mode === 'freehand' ? 'point-to-point' : 'freehand';
    this._ptp_points = [];
  }

  handleClick(event) {
    if (this.mode !== 'point-to-point') return;
    const latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
    if (latLon) this._ptp_points.push({ lat: latLon.lat, lon: latLon.lon, alt: 0 });
  }

  finish() {
    if (this.mode !== 'point-to-point') return;
    if (this._ptp_points.length < 1) return;
    counter++;
    this._onPlace({
      id: `draw-${Date.now()}-${counter}`,
      name: { en: `Drawing ${counter}` },
      points: this._ptp_points,
      color: '#00aaff', strokeWidth: 2,
    });
    this._ptp_points = [];
  }

  activate() {}
  deactivate() { this._drawing = false; this._points = []; this._ptp_points = []; }

  handleMouseDown(event) {
    const latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
    if (!latLon) return;
    this._drawing = true;
    this._points = [{ lat: latLon.lat, lon: latLon.lon, alt: 0 }];
  }

  handleMouseMove(event) {
    if (!this._drawing) return;
    const latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
    if (latLon) this._points.push({ lat: latLon.lat, lon: latLon.lon, alt: 0 });
  }

  handleMouseUp() {
    if (!this._drawing) return;
    this._drawing = false;
    if (this._points.length < 2) return;
    const simplified = simplifyRDP(this._points, 0.5);
    counter++;
    this._onPlace({
      id: `draw-${Date.now()}-${counter}`,
      name: { en: `Drawing ${counter}` },
      points: simplified,
      color: '#00aaff', strokeWidth: 2,
    });
    this._points = [];
  }
}
