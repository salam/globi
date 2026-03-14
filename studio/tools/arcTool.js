let counter = 0;

export class ArcTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
    this._start = null;
    this._mouseDownLatLon = null;
    this._mouseDownPos = null;
  }
  activate() {}
  deactivate() { this._start = null; this._mouseDownLatLon = null; this._mouseDownPos = null; }

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
    if (!this._start) {
      this._start = latLon;
    } else {
      counter++;
      this._onPlace({
        id: `arc-${Date.now()}-${counter}`,
        name: { en: `Arc ${counter}` },
        start: { lat: this._start.lat, lon: this._start.lon, alt: 0 },
        end: { lat: latLon.lat, lon: latLon.lon, alt: 0 },
        maxAltitude: 0.5, color: '#ffd000', strokeWidth: 1,
      });
      this._start = null;
    }
  }
}
