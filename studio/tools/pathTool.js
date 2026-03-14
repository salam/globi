let counter = 0;

export class PathTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
    this._points = [];
    this._mouseDownLatLon = null;
    this._mouseDownPos = null;
  }
  activate() {}
  deactivate() { this._points = []; this._mouseDownLatLon = null; this._mouseDownPos = null; }

  handleMouseDown(event) {
    this._mouseDownPos = { x: event.clientX, y: event.clientY };
    this._mouseDownLatLon = this._controller.screenToLatLon(event.clientX, event.clientY);
  }

  handleClick(event) {
    let latLon = null;
    if (this._mouseDownPos && this._mouseDownLatLon) {
      const dx = event.clientX - this._mouseDownPos.x;
      const dy = event.clientY - this._mouseDownPos.y;
      if (dx * dx + dy * dy <= 16) latLon = this._mouseDownLatLon;
    }
    if (!latLon) latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
    this._mouseDownLatLon = null;
    this._mouseDownPos = null;
    if (!latLon) return;
    this._points.push({ lat: latLon.lat, lon: latLon.lon, alt: 0 });
  }

  finish() {
    if (this._points.length < 2) return;
    counter++;
    this._onPlace({
      id: `path-${Date.now()}-${counter}`,
      name: { en: `Path ${counter}` },
      points: [...this._points],
      color: '#00aaff', strokeWidth: 1,
    });
    this._points = [];
  }
}
