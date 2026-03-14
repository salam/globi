export class SelectTool {
  constructor({ controller, onSelect, onDeselect, onMove, onPointEditMode }) {
    this._controller = controller;
    this._onSelect = onSelect;
    this._onDeselect = onDeselect;
    this._onMove = onMove;
    this._onPointEditMode = onPointEditMode;
    this._dragging = false;
    this._dragEntityId = null;
    this._mouseDownPos = null;
  }

  activate() {}
  deactivate() { this._dragging = false; this._dragEntityId = null; this._mouseDownPos = null; }

  handleClick(event) {
    // Ignore clicks that were actually drags/pans (mouse moved > 4px)
    if (this._mouseDownPos) {
      const dx = event.clientX - this._mouseDownPos.x;
      const dy = event.clientY - this._mouseDownPos.y;
      if (dx * dx + dy * dy > 16) return;
    }
    const hit = this._controller.hitTest(event.clientX, event.clientY);
    if (hit) { this._onSelect(hit); } else { this._onDeselect(); }
  }

  handleMouseDown(event) {
    this._mouseDownPos = { x: event.clientX, y: event.clientY };
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
