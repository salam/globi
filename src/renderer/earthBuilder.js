import {
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  BackSide,
} from 'three';

const EARTH_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EARTH_FRAG_DAY_NIGHT = /* glsl */`
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    float NdotL = dot(normal, normalize(sunDirection));
    float dayNightBlend = smoothstep(-0.15, 0.25, NdotL);

    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);

    // Night lights boosted slightly
    vec4 nightLit = nightColor * 1.4;

    vec4 baseColor = mix(nightLit, dayColor, dayNightBlend);

    // Fresnel rim tinted blue
    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    vec3 rimColor = vec3(0.3, 0.5, 1.0) * fresnel * 0.6;

    // Ambient fill on dark side
    float ambient = 0.03 * (1.0 - dayNightBlend);

    gl_FragColor = vec4(baseColor.rgb + rimColor + ambient, 1.0);
  }
`;

const EARTH_FRAG_DAY_ONLY = /* glsl */`
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    vec4 dayColor = texture2D(dayTexture, vUv);

    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    vec3 rimColor = vec3(0.3, 0.5, 1.0) * fresnel * 0.4;

    gl_FragColor = vec4(dayColor.rgb + rimColor, 1.0);
  }
`;

const ATMOS_VERT = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOS_FRAG = /* glsl */`
  uniform vec3 sunDirection;
  uniform vec3 atmosphereColor;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    // Fresnel-based atmospheric glow
    float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.0);

    // Sun-facing side is brighter
    float sunFacing = max(0.0, dot(normal, normalize(sunDirection)));
    float brightness = 0.4 + 0.6 * sunFacing;

    vec3 color = atmosphereColor * brightness;
    float alpha = fresnel * 0.7;

    gl_FragColor = vec4(color, alpha);
  }
`;

const DEFAULT_SUN_DIRECTION = new Vector3(1.0, 0.5, 0.5).normalize();
const DEFAULT_ATMOSPHERE_COLOR = [0.3, 0.6, 1.0];

/**
 * Creates a Three.js Mesh representing the Earth sphere with a custom
 * day/night ShaderMaterial (shader material).
 *
 * @param {object} [options]
 * @param {import('three').Texture|null} [options.dayTexture]   - Day-side texture
 * @param {import('three').Texture|null} [options.nightTexture] - Night-side city-lights texture
 * @param {import('three').Vector3}      [options.sunDirection] - Normalised sun direction vector
 * @param {boolean}                      [options.nightLayer]   - When false, skip night blending (default true)
 * @returns {import('three').Mesh}
 */
export function createEarthMesh(options = {}) {
  const {
    dayTexture = null,
    nightTexture = null,
    sunDirection = DEFAULT_SUN_DIRECTION,
    nightLayer = true,
  } = options;

  const geometry = new SphereGeometry(1, 64, 64);

  const material = new ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      sunDirection: { value: sunDirection },
    },
    vertexShader: EARTH_VERT,
    fragmentShader: nightLayer ? EARTH_FRAG_DAY_NIGHT : EARTH_FRAG_DAY_ONLY,
  });

  return new Mesh(geometry, material);
}

/**
 * Creates a slightly enlarged sphere Mesh used as an atmospheric glow shell
 * around the Earth. Rendered on the BackSide (inside facing out) with
 * Fresnel-based transparency.
 *
 * @param {object} [options]
 * @param {import('three').Vector3} [options.sunDirection]    - Normalised sun direction vector
 * @param {number[]}                [options.atmosphereColor] - RGB triplet in [0,1] range
 * @returns {import('three').Mesh}
 */
export function createAtmosphereMesh(options = {}) {
  const {
    sunDirection = DEFAULT_SUN_DIRECTION,
    atmosphereColor = DEFAULT_ATMOSPHERE_COLOR,
  } = options;

  const geometry = new SphereGeometry(1.06, 64, 64);

  const material = new ShaderMaterial({
    uniforms: {
      sunDirection: { value: sunDirection },
      atmosphereColor: { value: atmosphereColor },
    },
    vertexShader: ATMOS_VERT,
    fragmentShader: ATMOS_FRAG,
    side: BackSide,
    transparent: true,
    depthWrite: false,
  });

  return new Mesh(geometry, material);
}
