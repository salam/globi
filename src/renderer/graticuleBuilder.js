import { BufferGeometry, Float32BufferAttribute, LineSegments, LineBasicMaterial } from 'three';
import { latLonToCartesian } from '../math/geo.js';

export function createGraticule(options = {}) {
  const color = options.color ?? 0xbed8ff;
  const opacity = options.opacity ?? 0.16;
  const vertices = [];

  // Latitude lines every 30° from -60 to 60
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += 4) {
      const a = latLonToCartesian(lat, lon, 1, 0.001);
      const b = latLonToCartesian(lat, lon + 4, 1, 0.001);
      vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  // Longitude lines every 30° from -150 to 180
  for (let lon = -150; lon <= 180; lon += 30) {
    for (let lat = -85; lat < 85; lat += 3) {
      const a = latLonToCartesian(lat, lon, 1, 0.001);
      const b = latLonToCartesian(lat + 3, lon, 1, 0.001);
      vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));

  const material = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  return new LineSegments(geometry, material);
}
