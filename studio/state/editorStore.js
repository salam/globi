// studio/state/editorStore.js
import { Emitter } from '../../src/utils/emitter.js';

const DEFAULTS = {
  activeTool: 'select',
  selectedIds: [],
  propertiesVisible: true,
  timelineVisible: true,
  hudVisible: true,
  playbackState: 'stopped',
  playheadMs: 0,
};

const PANEL_KEYS = {
  properties: 'propertiesVisible',
  timeline: 'timelineVisible',
  hud: 'hudVisible',
};

export class EditorStore extends Emitter {
  constructor() {
    super();
    this._state = { ...DEFAULTS, selectedIds: [] };
  }

  getState() {
    return { ...this._state, selectedIds: [...this._state.selectedIds] };
  }

  dispatch(action) {
    switch (action.type) {
      case 'setTool':
        this._state.activeTool = action.tool;
        break;
      case 'select':
        this._state.selectedIds = [...action.ids];
        break;
      case 'deselect':
        this._state.selectedIds = [];
        break;
      case 'togglePanel': {
        const key = PANEL_KEYS[action.panel];
        if (key) this._state[key] = !this._state[key];
        break;
      }
      case 'setPlayback':
        this._state.playbackState = action.state;
        break;
      case 'setPlayhead':
        this._state.playheadMs = action.ms;
        break;
      default:
        return;
    }
    this.emit('change', this.getState());
  }
}
