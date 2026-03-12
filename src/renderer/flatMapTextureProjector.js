/**
 * FlatMapTextureProjector — projects an equirectangular texture onto the flat map canvas.
 *
 * Uses OffscreenCanvas which is browser-only. This class is NOT unit-tested directly;
 * the FlatMapRenderer guards texture projection behind `if (this.#textureImage)` so
 * Node.js tests never reach this code.
 */

export class FlatMapTextureProjector {
  #cache = new Map();
  #textureCanvas = null;
  #textureCtx = null;

  /**
   * Project the texture onto the main canvas context.
   *
   * @param {CanvasRenderingContext2D} ctx  Target canvas 2D context.
   * @param {HTMLImageElement|ImageBitmap} texture  Equirectangular source texture.
   * @param {object} projection  Projection object with inverse(x,y,clat,clon).
   * @param {string} projectionName  Name of the projection (for cache key).
   * @param {number} centerLat
   * @param {number} centerLon
   * @param {number} width   Canvas width in physical pixels.
   * @param {number} height  Canvas height in physical pixels.
   * @param {function} projectionToPixel  (x,y) → {px,py}
   * @param {function} pixelToProjection  (px,py) → {x,y}
   * @param {boolean} [lowRes=false]  Use lower resolution for drag performance.
   */
  project(ctx, texture, projection, projectionName, centerLat, centerLon, width, height,
    projectionToPixel, pixelToProjection, lowRes = false) {
    const step = lowRes ? 4 : 1;
    const cacheKey = `${projectionName},${centerLat},${centerLon},${width},${height},${lowRes}`;

    let offscreen = this.#cache.get(cacheKey);
    if (!offscreen) {
      offscreen = new OffscreenCanvas(width, height);
      const offCtx = offscreen.getContext('2d');

      // Ensure source texture is available as a canvas we can sample
      if (!this.#textureCanvas) {
        this.#textureCanvas = new OffscreenCanvas(texture.width || 2048, texture.height || 1024);
        this.#textureCtx = this.#textureCanvas.getContext('2d');
        this.#textureCtx.drawImage(texture, 0, 0);
      }

      const texW = this.#textureCanvas.width;
      const texH = this.#textureCanvas.height;
      const srcData = this.#textureCtx.getImageData(0, 0, texW, texH).data;
      const imgData = offCtx.createImageData(width, height);
      const buf = imgData.data;

      for (let py = 0; py < height; py += step) {
        for (let px = 0; px < width; px += step) {
          const { x, y } = pixelToProjection(px, py);
          const latLon = projection.inverse(x, y, centerLat, centerLon);
          if (!latLon) continue;

          const { lat, lon } = latLon;
          const u = ((lon + 180) / 360) * texW;
          const v = ((90 - lat) / 180) * texH;

          const tx = Math.floor(u) % texW;
          const ty = Math.min(Math.floor(v), texH - 1);
          const srcIdx = (ty * texW + tx) * 4;

          for (let dy = 0; dy < step && py + dy < height; dy++) {
            for (let dx = 0; dx < step && px + dx < width; dx++) {
              const idx = ((py + dy) * width + (px + dx)) * 4;
              buf[idx]     = srcData[srcIdx];
              buf[idx + 1] = srcData[srcIdx + 1];
              buf[idx + 2] = srcData[srcIdx + 2];
              buf[idx + 3] = srcData[srcIdx + 3];
            }
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      this.#cache.set(cacheKey, offscreen);
    }

    ctx.drawImage(offscreen, 0, 0);
  }

  /** Clear cached renders (e.g., after projection/center change). */
  invalidate() {
    this.#cache.clear();
    this.#textureCanvas = null;
    this.#textureCtx = null;
  }

  /** Release all resources. */
  destroy() {
    this.invalidate();
    this.#cache = null;
  }
}
