import { azimuthalEquidistant } from './azimuthalEquidistant.js';
import { orthographic } from './orthographic.js';
import { equirectangular } from './equirectangular.js';

const registry = {
  azimuthalEquidistant,
  orthographic,
  equirectangular,
};

export const PROJECTION_NAMES = Object.keys(registry);

export function getProjection(name) {
  return registry[name] || null;
}
