/**
 * FlatMapTextureProjector — projects an equirectangular texture onto the flat map canvas.
 *
 * Uses OffscreenCanvas which is browser-only. This class is NOT unit-tested directly;
 * the FlatMapRenderer guards texture projection behind `if (this.#textureImage)` so
 * Node.js tests never reach this code.
 *
 * Performance strategy:
 *  - Immediate pass at low resolution (step 4, or 8 during drag)
 *  - Deferred refinement at step 1 in chunked rAF passes (~35ms each)
 *  - Refinement calls onRefine callback so the renderer can redraw vectors on top
 *  - Source texture pixels are read once and kept across view changes
 */

export class FlatMapTextureProjector {
  #viewCache = new Map();
  #textureData = null;
  #texW = 0;
  #texH = 0;
  #refineGeneration = 0;
  #activeRefineKey = null; // BUG27: track which view key has an active refinement

  /**
   * Project the texture onto the main canvas context.
   * Immediately draws a low-res version, then schedules chunked refinement.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLImageElement|ImageBitmap} texture
   * @param {object} projection
   * @param {string} projectionName
   * @param {number} centerLat
   * @param {number} centerLon
   * @param {number} width
   * @param {number} height
   * @param {function} projectionToPixel
   * @param {function} pixelToProjection
   * @param {boolean} lowRes
   * @param {function} [onRefine]  Called when refinement completes so caller can redraw vectors.
   */
  project(ctx, texture, projection, projectionName, centerLat, centerLon, width, height,
    projectionToPixel, pixelToProjection, lowRes = false, onRefine = null) {

    // BUG24: bail out if canvas has zero dimensions
    if (width <= 0 || height <= 0) return;

    // Read source texture pixels once and keep them permanently
    if (!this.#textureData) {
      const tc = new OffscreenCanvas(texture.width || 2048, texture.height || 1024);
      const tctx = tc.getContext('2d', { willReadFrequently: true });
      tctx.drawImage(texture, 0, 0);
      this.#texW = tc.width;
      this.#texH = tc.height;
      this.#textureData = tctx.getImageData(0, 0, this.#texW, this.#texH).data;
    }

    const viewKey = `${projectionName},${centerLat},${centerLon},${width},${height}`;
    const hiKey = `${viewKey},hi`;
    const loKey = `${viewKey},lo`;

    // If refined version cached, draw it directly
    const hiCached = this.#viewCache.get(hiKey);
    if (hiCached) {
      ctx.drawImage(hiCached, 0, 0, width, height);
      return;
    }

    // Immediate low-res pass
    const immediateStep = lowRes ? 8 : 4;
    let loCached = this.#viewCache.get(loKey);
    if (!loCached) {
      loCached = this.#renderAtScale(projection, centerLat, centerLon,
        width, height, pixelToProjection, immediateStep);
      this.#viewCache.set(loKey, loCached);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(loCached, 0, 0, width, height);

    // During drag, stop here
    if (lowRes) return;

    // BUG27: skip if a refinement is already in progress for this exact view
    if (this.#activeRefineKey === hiKey) return;

    // Schedule chunked refinement at step 1
    const gen = ++this.#refineGeneration;
    this.#activeRefineKey = hiKey;
    const step = 1;
    const rw = Math.ceil(width / step);
    const rh = Math.ceil(height / step);
    const offscreen = new OffscreenCanvas(rw, rh);
    const offCtx = offscreen.getContext('2d');
    const imgData = offCtx.createImageData(rw, rh);
    const buf = imgData.data;
    const srcData = this.#textureData;
    const texW = this.#texW;
    const texH = this.#texH;
    const ROWS_PER_CHUNK = Math.max(1, Math.floor(rh / 8));
    let startRow = 0;

    const processChunk = () => {
      if (gen !== this.#refineGeneration) {
        this.#activeRefineKey = null;
        return;
      }
      const endRow = Math.min(startRow + ROWS_PER_CHUNK, rh);

      for (let ry = startRow; ry < endRow; ry++) {
        const py = ry * step;
        for (let rx = 0; rx < rw; rx++) {
          const px = rx * step;
          const { x, y } = pixelToProjection(px, py);
          const latLon = projection.inverse(x, y, centerLat, centerLon);
          if (!latLon) continue;

          const u = ((latLon.lon + 180) / 360) * texW;
          const v = ((90 - latLon.lat) / 180) * texH;
          const tx = Math.floor(u) % texW;
          const ty = Math.min(Math.floor(v), texH - 1);
          const srcIdx = (ty * texW + tx) * 4;
          const idx = (ry * rw + rx) * 4;
          buf[idx]     = srcData[srcIdx];
          buf[idx + 1] = srcData[srcIdx + 1];
          buf[idx + 2] = srcData[srcIdx + 2];
          buf[idx + 3] = srcData[srcIdx + 3];
        }
      }

      startRow = endRow;
      if (startRow < rh) {
        requestAnimationFrame(processChunk);
      } else {
        this.#activeRefineKey = null;
        if (gen !== this.#refineGeneration) return;
        offCtx.putImageData(imgData, 0, 0);
        this.#viewCache.set(hiKey, offscreen);
        // Notify caller to do a full re-render with the refined texture
        if (onRefine) onRefine();
      }
    };

    requestAnimationFrame(processChunk);
  }

  #renderAtScale(projection, centerLat, centerLon, fullW, fullH, pixelToProjection, step) {
    const rw = Math.ceil(fullW / step);
    const rh = Math.ceil(fullH / step);
    const offscreen = new OffscreenCanvas(rw, rh);
    const offCtx = offscreen.getContext('2d');
    const imgData = offCtx.createImageData(rw, rh);
    const buf = imgData.data;
    const srcData = this.#textureData;
    const texW = this.#texW;
    const texH = this.#texH;

    for (let ry = 0; ry < rh; ry++) {
      const py = ry * step;
      for (let rx = 0; rx < rw; rx++) {
        const px = rx * step;
        const { x, y } = pixelToProjection(px, py);
        const latLon = projection.inverse(x, y, centerLat, centerLon);
        if (!latLon) continue;

        const u = ((latLon.lon + 180) / 360) * texW;
        const v = ((90 - latLon.lat) / 180) * texH;
        const tx = Math.floor(u) % texW;
        const ty = Math.min(Math.floor(v), texH - 1);
        const srcIdx = (ty * texW + tx) * 4;
        const idx = (ry * rw + rx) * 4;
        buf[idx]     = srcData[srcIdx];
        buf[idx + 1] = srcData[srcIdx + 1];
        buf[idx + 2] = srcData[srcIdx + 2];
        buf[idx + 3] = srcData[srcIdx + 3];
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    return offscreen;
  }

  /** Clear view cache (e.g., after pan/zoom). Source texture data is preserved. */
  invalidate() {
    this.#viewCache.clear();
    this.#refineGeneration++;
    this.#activeRefineKey = null;
  }

  /** Release all resources. */
  destroy() {
    this.invalidate();
    this.#viewCache = null;
    this.#textureData = null;
  }
}
