let counter = 0;

export class PathTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
    this._points = [];
  }
  activate() {}
  deactivate() { this._points = []; }

  handleClick(event) {
    const latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
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
