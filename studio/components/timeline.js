/**
 * Timeline — transport controls, entity rows with visibility toggles,
 * track area with ruler, visibility bars, keyframe diamonds, and playhead.
 */

const TRANSPORT_BUTTONS = [
  { action: 'skipStart', label: '|◀', title: 'Skip to Start' },
  { action: 'play', label: '▶', title: 'Play / Pause' },
  { action: 'skipEnd', label: '▶|', title: 'Skip to End' },
];

const EXTRA_BUTTONS = [
  { action: 'loop', label: '↺', title: 'Loop' },
  { action: 'addKeyframe', label: '◆', title: 'Add Keyframe' },
  { action: 'easing', label: '~', title: 'Easing Editor' },
  { action: 'zoomIn', label: '+', title: 'Zoom In' },
  { action: 'zoomOut', label: '-', title: 'Zoom Out' },
];

export class Timeline {
  constructor(container, opts) {
    this._container = container;
    this._opts = opts;
  }

  update(newOpts) {
    this._opts = { ...this._opts, ...newOpts };
    this.render();
  }

  setPlayhead(ms) {
    this._opts.playheadMs = ms;
    this._opts.onPlayheadChange(ms);
    this._updatePlayheadPosition();
  }

  render() {
    const { scene, locale, onTransport } = this._opts;

    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }

    // Header row: transport + extra buttons + time display
    const header = document.createElement('div');
    header.className = 'tl-header';

    const transportGroup = document.createElement('div');
    transportGroup.className = 'tl-transport';

    for (const btn of TRANSPORT_BUTTONS) {
      const b = document.createElement('button');
      b.className = 'tl-btn';
      b.dataset.action = btn.action;
      b.title = btn.title;
      b.textContent = btn.label;
      b.addEventListener('click', () => onTransport(btn.action));
      transportGroup.appendChild(b);
    }

    const timeDisplay = document.createElement('span');
    timeDisplay.className = 'tl-time';
    timeDisplay.textContent = this._formatMs(this._opts.playheadMs);
    this._timeDisplay = timeDisplay;

    const extraGroup = document.createElement('div');
    extraGroup.className = 'tl-extra';

    for (const btn of EXTRA_BUTTONS) {
      const b = document.createElement('button');
      b.className = 'tl-btn';
      b.dataset.action = btn.action;
      b.title = btn.title;
      b.textContent = btn.label;
      b.addEventListener('click', () => onTransport(btn.action));
      extraGroup.appendChild(b);
    }

    header.appendChild(transportGroup);
    header.appendChild(timeDisplay);
    header.appendChild(extraGroup);
    this._container.appendChild(header);

    // Body: labels column + tracks column
    const body = document.createElement('div');
    body.className = 'tl-body';

    const labelsCol = document.createElement('div');
    labelsCol.className = 'tl-labels';

    const tracksCol = document.createElement('div');
    tracksCol.className = 'tl-tracks';

    // Ruler row
    const rulerRow = document.createElement('div');
    rulerRow.className = 'tl-row tl-ruler-row';
    rulerRow.textContent = '0s';
    tracksCol.appendChild(rulerRow);

    // Ruler label placeholder
    const rulerLabelRow = document.createElement('div');
    rulerLabelRow.className = 'tl-row tl-ruler-label';
    labelsCol.appendChild(rulerLabelRow);

    // Entity rows
    const collections = [
      { type: 'marker', list: scene.markers || [] },
      { type: 'arc', list: scene.arcs || [] },
      { type: 'path', list: scene.paths || [] },
      { type: 'region', list: scene.regions || [] },
    ];

    for (const { type, list } of collections) {
      for (const item of list) {
        const name = item.name
          ? (typeof item.name === 'object' ? (item.name[this._opts.locale] ?? item.name.en ?? '') : item.name)
          : item.id;

        labelsCol.appendChild(this._makeLabelRow(item, name, type));
        tracksCol.appendChild(this._makeTrackRow(item, type));
      }
    }

    // Camera row
    labelsCol.appendChild(this._makeCameraLabelRow());
    tracksCol.appendChild(this._makeCameraTrackRow());

    // Playhead
    this._playhead = document.createElement('div');
    this._playhead.className = 'tl-playhead';
    tracksCol.appendChild(this._playhead);

    body.appendChild(labelsCol);
    body.appendChild(tracksCol);
    this._container.appendChild(body);

    this._updatePlayheadPosition();
  }

  _makeLabelRow(item, name, type) {
    const row = document.createElement('div');
    row.className = 'tl-row tl-label-row';
    row.dataset.id = item.id;

    const eyeBtn = document.createElement('button');
    eyeBtn.className = 'tl-eye';
    eyeBtn.title = 'Toggle Visibility';
    eyeBtn.textContent = '👁';
    eyeBtn.addEventListener('click', () => {
      this._opts.onVisibilityChange(type, item.id);
    });
    row.appendChild(eyeBtn);

    const dot = document.createElement('span');
    dot.className = 'tl-color-dot';
    dot.style.background = item.color || '#888';
    row.appendChild(dot);

    const nameEl = document.createElement('span');
    nameEl.className = 'tl-entity-name';
    nameEl.textContent = name;
    row.appendChild(nameEl);

    return row;
  }

  _makeTrackRow(item, type) {
    const row = document.createElement('div');
    row.className = 'tl-row tl-track-row';
    row.dataset.id = item.id;

    // Render visibility bars for elements with visibility intervals
    const visibility = item.visibility || [];
    if (visibility.length > 0) {
      for (const interval of visibility) {
        const bar = document.createElement('div');
        bar.className = 'tl-bar tl-visibility-bar';
        bar.dataset.from = interval.from;
        bar.dataset.to = interval.to;
        row.appendChild(bar);
      }
    } else {
      const bar = document.createElement('div');
      bar.className = 'tl-visibility-bar';
      row.appendChild(bar);
    }

    // Render keyframe diamonds for animated entities
    const animations = this._opts.scene.animations || [];
    const anim = animations.find((a) => a.entityId === item.id);
    if (anim) {
      for (const kf of anim.keyframes || []) {
        const diamond = document.createElement('div');
        diamond.className = 'tl-keyframe';
        diamond.dataset.t = kf.t;
        row.appendChild(diamond);
      }
    }

    return row;
  }

  _makeCameraLabelRow() {
    const row = document.createElement('div');
    row.className = 'tl-row tl-label-row tl-camera-row';

    const eyeBtn = document.createElement('button');
    eyeBtn.className = 'tl-eye';
    eyeBtn.title = 'Toggle Camera Visibility';
    eyeBtn.textContent = '👁';
    row.appendChild(eyeBtn);

    const nameEl = document.createElement('span');
    nameEl.className = 'tl-entity-name';
    nameEl.textContent = 'Camera';
    row.appendChild(nameEl);

    return row;
  }

  _makeCameraTrackRow() {
    const row = document.createElement('div');
    row.className = 'tl-row tl-track-row tl-camera-track';

    // Render keyframe diamonds for camera animation
    const cameraAnimation = this._opts.scene.cameraAnimation || [];
    if (cameraAnimation.length > 0) {
      for (const kf of cameraAnimation) {
        const diamond = document.createElement('div');
        diamond.className = 'tl-keyframe';
        diamond.dataset.t = kf.t;
        row.appendChild(diamond);
      }
    } else {
      const bar = document.createElement('div');
      bar.className = 'tl-visibility-bar';
      row.appendChild(bar);
    }

    return row;
  }

  _updatePlayheadPosition() {
    if (this._timeDisplay) {
      this._timeDisplay.textContent = this._formatMs(this._opts.playheadMs);
    }
    if (this._playhead) {
      this._playhead.style.left = '0px';
    }
  }

  _formatMs(ms) {
    const total = Math.floor((ms || 0) / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
