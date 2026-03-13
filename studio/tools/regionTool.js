let counter = 0;

export class RegionTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
    this._vertices = [];
  }
  activate() {}
  deactivate() { this._vertices = []; }

  handleClick(event) {
    const latLon = this._controller.screenToLatLon(event?.clientX, event?.clientY);
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
