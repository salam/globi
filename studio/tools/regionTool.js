let counter = 0;

export class RegionTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
    this._vertices = [];
    this._mouseDownLatLon = null;
    this._mouseDownPos = null;
  }
  activate() {}
  deactivate() { this._vertices = []; this._mouseDownLatLon = null; this._mouseDownPos = null; }

  handleMouseDown(event) {
    this._mouseDownPos = { x: event.clientX, y: event.clientY };
    this._mouseDownLatLon = this._controller.screenToLatLon(event?.clientX, event?.clientY);
  }

  handleClick(event) {
    let latLon = null;
    if (this._mouseDownPos && this._mouseDownLatLon) {
      const dx = event.clientX - this._mouseDownPos.x;
      const dy = event.clientY - this._mouseDownPos.y;
      if (dx * dx + dy * dy <= 16) latLon = this._mouseDownLatLon;
    }
    if (!latLon) latLon = this._controller.screenToLatLon(event?.clientX, event?.clientY);
    this._mouseDownLatLon = null;
    this._mouseDownPos = null;
    if (!latLon) return;
    this._vertices.push({ lat: latLon.lat, lon: latLon.lon });
  }

  finish() {
    if (this._vertices.length < 3) return;
    counter++;
    const coords = this._vertices.map(v => [v.lon, v.lat]);
    coords.push([...coords[0]]); // close ring
    this._onPlace({
      id: `region-${Date.now()}-${counter}`,
      name: { en: `Region ${counter}` },
      geojson: { type: 'Polygon', coordinates: [coords] },
      capColor: '#4caf50', sideColor: '#2e7d32', altitude: 0,
    });
    this._vertices = [];
  }
}
