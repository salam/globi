let counter = 0;

export class MarkerTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
  }
  activate() {}
  deactivate() {}

  handleClick(event) {
    const latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
    if (!latLon) return;
    counter++;
    this._onPlace({
      id: `marker-${Date.now()}-${counter}`,
      name: { en: `Marker ${counter}` },
      lat: latLon.lat, lon: latLon.lon, alt: 0,
      color: '#ff6b6b', visualType: 'dot',
      calloutMode: 'hover', calloutLabel: { en: `Marker ${counter}` },
    });
  }
}
