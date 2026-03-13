export class SelectTool {
  constructor({ controller, onSelect, onDeselect, onMove, onPointEditMode }) {
    this._controller = controller;
    this._onSelect = onSelect;
    this._onDeselect = onDeselect;
    this._onMove = onMove;
    this._onPointEditMode = onPointEditMode;
    this._dragging = false;
    this._dragEntityId = null;
  }

  activate() {}
  deactivate() { this._dragging = false; this._dragEntityId = null; }

  handleClick(event) {
    const hit = this._controller.hitTest(event.clientX, event.clientY);
    if (hit) { this._onSelect(hit); } else { this._onDeselect(); }
  }

  handleMouseDown(event) {
    const hit = this._controller.hitTest(event.clientX, event.clientY);
    if (hit && hit.kind === 'marker') { this._dragging = true; this._dragEntityId = hit.id; }
  }

  handleMouseMove(event) {
    if (!this._dragging) return;
    const latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
    if (latLon) this._onMove(this._dragEntityId, latLon);
  }

  handleMouseUp() { this._dragging = false; this._dragEntityId = null; }

  handleDoubleClick(event) {
    const hit = this._controller.hitTest(event.clientX, event.clientY);
    if (hit && (hit.kind === 'region' || hit.kind === 'path')) {
      if (this._onPointEditMode) this._onPointEditMode(hit.id);
    }
  }
}
