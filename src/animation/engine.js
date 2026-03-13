function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpolateValue(start, end, t) {
  if (typeof start === 'number' && typeof end === 'number') {
    return lerp(start, end, t);
  }

  if (isObject(start) && isObject(end)) {
    const keys = new Set([...Object.keys(start), ...Object.keys(end)]);
    const result = {};
    for (const key of keys) {
      const left = start[key];
      const right = end[key];
      if (typeof left === 'number' && typeof right === 'number') {
        result[key] = lerp(left, right, t);
      } else {
        result[key] = t < 0.5 ? left : right;
      }
    }
    return result;
  }

  return t < 0.5 ? start : end;
}

const EASING = {
  'linear': t => t,
  'ease-in': t => t * t,
  'ease-out': t => t * (2 - t),
  'ease-in-out': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'bounce': t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  'elastic': t => t === 0 || t === 1 ? t : -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI),
};

export function normalizeKeyframes(keyframes = []) {
  return keyframes
    .map((frame) => ({
      t: Number(frame.t ?? 0),
      value: frame.value ?? {},
      ...(frame.easing ? { easing: frame.easing } : {}),
    }))
    .sort((a, b) => a.t - b.t);
}

export function interpolateKeyframes(keyframesInput, timeMs) {
  const keyframes = normalizeKeyframes(keyframesInput);
  if (keyframes.length === 0) {
    return undefined;
  }
  if (keyframes.length === 1) {
    return structuredClone(keyframes[0].value);
  }

  if (timeMs <= keyframes[0].t) {
    return structuredClone(keyframes[0].value);
  }

  const last = keyframes[keyframes.length - 1];
  if (timeMs >= last.t) {
    return structuredClone(last.value);
  }

  for (let i = 1; i < keyframes.length; i += 1) {
    const right = keyframes[i];
    if (timeMs > right.t) {
      continue;
    }

    const left = keyframes[i - 1];
    const span = right.t - left.t || 1;
    const alpha = (timeMs - left.t) / span;
    const easeFn = EASING[left.easing] || EASING.linear;
    return interpolateValue(left.value, right.value, easeFn(alpha));
  }

  return structuredClone(last.value);
}

export class AnimationEngine {
  #animations = new Map();

  register(id, keyframesInput, options = {}) {
    const keyframes = normalizeKeyframes(keyframesInput);
    if (keyframes.length < 2) {
      throw new Error('Animation must have at least two keyframes');
    }

    const duration = keyframes[keyframes.length - 1].t - keyframes[0].t;
    if (duration <= 0) {
      throw new Error('Animation keyframes must span positive time');
    }

    this.#animations.set(id, {
      keyframes,
      loop: Boolean(options.loop),
      duration,
      startTime: keyframes[0].t,
    });
  }

  unregister(id) {
    this.#animations.delete(id);
  }

  sample(id, timeMs) {
    const animation = this.#animations.get(id);
    if (!animation) {
      return undefined;
    }

    const { keyframes, loop, duration, startTime } = animation;

    if (!loop) {
      return interpolateKeyframes(keyframes, timeMs);
    }

    const wrappedTime = (((timeMs - startTime) % duration) + duration) % duration;
    return interpolateKeyframes(keyframes, startTime + wrappedTime);
  }

  ids() {
    return Array.from(this.#animations.keys());
  }
}
