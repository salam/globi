import { normalizeScene, validateScene } from '../scene/schema.js';

export function exportSceneToJSON(scene, options = {}) {
  const normalized = normalizeScene(scene);
  const result = validateScene(normalized);
  if (!result.valid) {
    throw new Error(`Cannot export invalid scene: ${result.errors.join('; ')}`);
  }

  const spacing = options.pretty === false ? 0 : 2;
  return JSON.stringify(normalized, null, spacing);
}

export function importSceneFromJSON(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }

  const normalized = normalizeScene(parsed);
  const result = validateScene(normalized);
  if (!result.valid) {
    throw new Error(`Invalid scene JSON: ${result.errors.join('; ')}`);
  }
  return normalized;
}
