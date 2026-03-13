export class ToolManager {
  constructor(tools) {
    this._tools = tools;
    this._active = null;
    this._activeName = null;
  }

  get activeName() { return this._activeName; }
  getActive() { return this._active; }

  setActive(name) {
    if (this._active) this._active.deactivate();
    this._active = this._tools[name] || null;
    this._activeName = name;
    if (this._active) this._active.activate();
  }
}
