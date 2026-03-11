import test from 'node:test';
import assert from 'node:assert/strict';

import { CanvasGlobeRenderer } from '../src/renderer/canvasGlobeRenderer.js';

function createMockContext(options = {}) {
  return {
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save() {},
    restore() {},
    clip() {},
    fillRect() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    setLineDash() {},
    drawImage(...args) {
      options.onDrawImage?.(args);
    },
    fillText(...args) {
      options.onFillText?.(args);
    },
    strokeText(...args) {
      options.onStrokeText?.(args);
    },
  };
}

function createMockCanvas(
  width,
  height,
  rect = { left: 0, top: 0, width, height },
  context = createMockContext()
) {
  return {
    width,
    height,
    getContext() {
      return context;
    },
    getBoundingClientRect() {
      return rect;
    },
    parentNode: null,
  };
}

// BUG2: Inspect/callout needs stable marker-to-screen anchoring.
test('BUG2: projectPointToClient aligns center geo point to canvas center in client space', () => {
  const renderer = new CanvasGlobeRenderer();
  const canvas = createMockCanvas(400, 200, {
    left: 100,
    top: 50,
    width: 400,
    height: 200,
  });

  renderer.init({ clientWidth: 400, clientHeight: 200, appendChild() {} }, {
    canvas,
    initialScene: {
      markers: [],
      paths: [],
      arcs: [],
      regions: [],
      planet: { baseColor: '#1e90ff' },
    },
  });
  renderer.flyTo({ lat: 0, lon: 0 }, { zoom: 1 });
  renderer.renderScene({
    markers: [],
    paths: [],
    arcs: [],
    regions: [],
    planet: { baseColor: '#1e90ff' },
  });

  const projected = renderer.projectPointToClient({ lat: 0, lon: 0, alt: 0 });

  assert.equal(projected?.visible, true);
  assert.equal(Math.round(projected?.clientX ?? 0), 300);
  assert.equal(Math.round(projected?.clientY ?? 0), 150);
});

test('BUG4: renderer draws spherically-projected planet texture when texture asset is available', () => {
  const textureUri = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png';
  let drawImageCalls = 0;
  const context = createMockContext({
    onDrawImage() {
      drawImageCalls += 1;
    },
  });
  const canvas = createMockCanvas(300, 300, { left: 0, top: 0, width: 300, height: 300 }, context);
  const renderer = new CanvasGlobeRenderer();

  const OriginalImage = globalThis.Image;
  const OriginalDocument = globalThis.document;

  class MockImage {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this._listeners = new Map();
      this._src = '';
    }

    addEventListener(type, listener) {
      this._listeners.set(type, listener);
      if (type === 'load' && this.complete) {
        listener();
      }
    }

    set src(value) {
      this._src = value;
      this.complete = true;
      this.naturalWidth = 2048;
      this.naturalHeight = 1024;
      const listener = this._listeners.get('load');
      if (listener) {
        listener();
      }
    }

    get src() {
      return this._src;
    }
  }

  function createMockOffscreenCanvas() {
    let storedImageData = null;
    return {
      width: 0,
      height: 0,
      getContext() {
        return {
          drawImage() {},
          getImageData(x, y, w, h) {
            return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
          },
          createImageData(w, h) {
            return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
          },
          putImageData(imgData) {
            storedImageData = imgData;
          },
        };
      },
    };
  }

  globalThis.Image = MockImage;
  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') return createMockOffscreenCanvas();
      return {};
    },
  };

  try {
    renderer.init({ clientWidth: 300, clientHeight: 300, appendChild() {} }, {
      canvas,
      initialScene: {
        markers: [],
        paths: [],
        arcs: [],
        regions: [],
        planet: {
          id: 'earth',
          baseColor: '#1e90ff',
          textureUri,
        },
      },
    });

    renderer.renderScene({
      markers: [],
      paths: [],
      arcs: [],
      regions: [],
      planet: {
        id: 'earth',
        baseColor: '#1e90ff',
        textureUri,
      },
    });
  } finally {
    if (OriginalImage === undefined) {
      delete globalThis.Image;
    } else {
      globalThis.Image = OriginalImage;
    }
    if (OriginalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = OriginalDocument;
    }
  }

  assert.ok(drawImageCalls >= 1, `expected drawImage to be called for texture compositing, got ${drawImageCalls} calls`);
});

test('renderer draws marker label for text visual type', () => {
  const textCalls = [];
  const context = createMockContext({
    onFillText(args) {
      textCalls.push(args);
    },
  });
  const canvas = createMockCanvas(320, 240, { left: 0, top: 0, width: 320, height: 240 }, context);
  const renderer = new CanvasGlobeRenderer();

  renderer.init({ clientWidth: 320, clientHeight: 240, appendChild() {} }, {
    canvas,
    initialScene: {
      locale: 'en',
      markers: [{
        id: 'label-zurich',
        name: { en: 'Zurich' },
        lat: 47.3769,
        lon: 8.5417,
        alt: 0,
        visualType: 'text',
        color: '#ffffff',
      }],
      paths: [],
      arcs: [],
      regions: [],
      planet: { baseColor: '#1e90ff' },
    },
  });

  renderer.renderScene({
    locale: 'en',
    markers: [{
      id: 'label-zurich',
      name: { en: 'Zurich' },
      lat: 47.3769,
      lon: 8.5417,
      alt: 0,
      visualType: 'text',
      color: '#ffffff',
    }],
    paths: [],
    arcs: [],
    regions: [],
    planet: { baseColor: '#1e90ff' },
  });

  assert.ok(textCalls.some((args) => args[0] === 'Zurich'));
});
