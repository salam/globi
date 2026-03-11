function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function computeIdlePanDelta(rotationSpeed, deltaMs, options = {}) {
  const speed = safeNumber(rotationSpeed, 0);
  const elapsedMs = Math.max(0, safeNumber(deltaMs, 0));
  if (speed === 0 || elapsedMs === 0) {
    return 0;
  }

  const maxFrameMs = Math.max(16, safeNumber(options.maxFrameMs, 250));
  const multiplier = safeNumber(options.multiplier, 0.5);
  const effectiveMs = Math.min(elapsedMs, maxFrameMs);
  const delta = speed * effectiveMs * multiplier;

  return Number.isFinite(delta) ? delta : 0;
}
