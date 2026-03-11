import { normalizeScene, validateScene } from '../scene/schema.js';

function base64Encode(input) {
  return Buffer.from(input, 'utf8').toString('base64');
}

export function exportSceneToUSDZ(sceneInput) {
  const scene = normalizeScene(sceneInput);
  const result = validateScene(scene);
  if (!result.valid) {
    throw new Error(`Cannot export invalid scene: ${result.errors.join('; ')}`);
  }

  const manifest = {
    format: 'usdz-placeholder-v1',
    note: 'This project requires a dedicated USD authoring backend for production USDZ packages.',
    scene,
  };

  return {
    filename: 'scene.usdz.txt',
    mimeType: 'text/plain',
    contentBase64: base64Encode(JSON.stringify(manifest)),
  };
}
