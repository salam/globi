import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Color,
} from 'three';

/**
 * Create a ring mesh for a celestial body.
 * Returns null if the body has no ring config.
 *
 * The ring lies in the XZ plane (equatorial). Since it's a child of globeGroup,
 * it inherits the body's obliquity tilt automatically.
 *
 * @param {object} planetConfig - Resolved planet config
 * @param {import('three').Texture|null} [ringTexture] - Optional alpha texture for Saturn
 * @returns {import('three').Mesh|null}
 */
export function createRingMesh(planetConfig, ringTexture = null) {
  const rings = planetConfig?.rings;
  if (!rings) return null;

  const geometry = new RingGeometry(rings.innerRadius, rings.outerRadius, 128);

  // Fix UVs for radial texture mapping (Three.js RingGeometry UVs are
  // in [0,1] based on angle; we remap to radial distance for the strip texture)
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    const t = (dist - rings.innerRadius) / (rings.outerRadius - rings.innerRadius);
    uv.setXY(i, t, 0.5);
  }

  const color = new Color(rings.color || '#ffffff');

  const material = new MeshBasicMaterial({
    color,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    opacity: rings.opacity ?? 0.5,
  });

  if (ringTexture) {
    material.map = ringTexture;
    material.alphaMap = ringTexture;
    // When texture is present, let it drive the alpha
    material.opacity = 1.0;
  }

  const mesh = new Mesh(geometry, material);
  // Ring lies in XZ plane by default — rotate to be horizontal
  mesh.rotation.x = -Math.PI / 2;

  return mesh;
}
