export class MotionPathOverlay {
  constructor() {
    this._visible = false;
    this._keyframes = [];
  }

  show(keyframes) {
    this._keyframes = keyframes;
    this._visible = true;
  }

  hide() {
    this._visible = false;
    this._keyframes = [];
  }

  get visible() { return this._visible; }
  get keyframes() { return this._keyframes; }
}
