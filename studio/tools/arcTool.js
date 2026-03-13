let counter = 0;

export class ArcTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
    this._start = null;
  }
  activate() {}
  deactivate() { this._start = null; }

  handleClick(event) {
    const latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
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
