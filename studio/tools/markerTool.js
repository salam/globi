let counter = 0;

export class MarkerTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
    this._mouseDownLatLon = null;
    this._mouseDownPos = null;
  }
  activate() {}
  deactivate() { this._mouseDownLatLon = null; this._mouseDownPos = null; }

  handleMouseDown(event) {
    // Capture lat/lon at mousedown before the viewer's pointer handler
    // pans the globe during any sub-pixel movement
    this._mouseDownPos = { x: event.clientX, y: event.clientY };
    this._mouseDownLatLon = this._controller.screenToLatLon(event.clientX, event.clientY);
  }

  handleClick(event) {
    // Use the mousedown lat/lon if the click didn't move far (prevents pan offset)
    let latLon = null;
    if (this._mouseDownPos && this._mouseDownLatLon) {
      const dx = event.clientX - this._mouseDownPos.x;
      const dy = event.clientY - this._mouseDownPos.y;
      if (dx * dx + dy * dy <= 16) {
        latLon = this._mouseDownLatLon;
      }
    }
    if (!latLon) {
      latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
    }
    if (!latLon) return;
    counter++;
    this._onPlace({
      id: `marker-${Date.now()}-${counter}`,
      name: { en: `Marker ${counter}` },
      lat: latLon.lat, lon: latLon.lon, alt: 0,
      color: '#ff6b6b', visualType: 'dot',
      calloutMode: 'hover', calloutLabel: { en: `Marker ${counter}` },
    });
    this._mouseDownLatLon = null;
    this._mouseDownPos = null;
  }

  handleMouseUp() {
    // Reset if click doesn't fire (e.g. large drag)
  }
}
