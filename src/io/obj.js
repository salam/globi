import { normalizeScene, validateScene } from '../scene/schema.js';
import { latLonToCartesian } from '../math/geo.js';

function vertexLine(v) {
  return `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`;
}

export function exportSceneToOBJ(sceneInput, options = {}) {
  const scene = normalizeScene(sceneInput);
  const result = validateScene(scene);
  if (!result.valid) {
    throw new Error(`Cannot export invalid scene: ${result.errors.join('; ')}`);
  }

  const radius = Number(options.radius ?? scene.planet.radius ?? 1);
  const lines = ['# globby scene export'];
  const vertices = [];

  for (const marker of scene.markers) {
    const v = latLonToCartesian(marker.lat, marker.lon, radius, marker.alt ?? 0);
    vertices.push(v);
    lines.push(vertexLine(v));
  }

  for (const path of scene.paths) {
    const firstIndex = vertices.length + 1;
    for (const point of path.points) {
      const v = latLonToCartesian(point.lat, point.lon, radius, point.alt ?? 0);
      vertices.push(v);
      lines.push(vertexLine(v));
    }

    const indices = path.points.map((_, index) => firstIndex + index).join(' ');
    if (path.points.length >= 2) {
      lines.push(`l ${indices}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
