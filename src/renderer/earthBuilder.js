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

const BODY_FRAG_SINGLE = /* glsl */`
  uniform sampler2D dayTexture;
  uniform vec3 sunDirection;
  uniform vec3 rimColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    vec3 lightDir = normalize(sunDirection);

    float NdotL = max(0.0, dot(normal, lightDir));
    float ambient = 0.05;
    float diffuse = NdotL;

    vec4 texColor = texture2D(dayTexture, vUv);

    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    vec3 rim = rimColor * fresnel * 0.4;

    gl_FragColor = vec4(texColor.rgb * (ambient + diffuse) + rim, 1.0);
  }
`;

const BODY_FRAG_VENUS = /* glsl */`
  uniform sampler2D dayTexture;
  uniform sampler2D atmosphereTexture;
  uniform float atmosphereTextureBlend;
  uniform vec3 sunDirection;
  uniform vec3 rimColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    vec3 lightDir = normalize(sunDirection);

    float NdotL = max(0.0, dot(normal, lightDir));
    float ambient = 0.05;
    float diffuse = NdotL;

    vec4 surfaceColor = texture2D(dayTexture, vUv) * 0.3;
    vec4 atmoColor = texture2D(atmosphereTexture, vUv);
    vec4 texColor = mix(surfaceColor, atmoColor, atmosphereTextureBlend);

    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    vec3 rim = rimColor * fresnel * 0.6;

    gl_FragColor = vec4(texColor.rgb * (ambient + diffuse) + rim, 1.0);
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

const ATMOS_FRAG_V2 = /* glsl */`
  uniform vec3 sunDirection;
  uniform vec3 atmosphereColor;
  uniform float atmosphereDensity;
  uniform float scaleHeightNorm;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    float rawFresnel = 1.0 - abs(dot(viewDir, normal));
    float fresnel = exp(-rawFresnel / max(scaleHeightNorm, 0.01));
    fresnel = 1.0 - fresnel;

    float sunFacing = max(0.0, dot(normal, normalize(sunDirection)));
    float brightness = 0.4 + 0.6 * sunFacing;

    vec3 color = atmosphereColor * brightness;
    float alpha = fresnel * atmosphereDensity;

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
 * Create a body mesh with the appropriate shader for the body type.
 * @param {object} [options]
 * @param {'dayNight'|'single'|'venusAtmosphere'} [options.shaderMode='dayNight']
 * @param {import('three').Texture|null} [options.dayTexture]
 * @param {import('three').Texture|null} [options.nightTexture]
 * @param {import('three').Texture|null} [options.atmosphereTexture]
 * @param {number} [options.atmosphereTextureBlend=0.85]
 * @param {import('three').Vector3} [options.sunDirection]
 * @param {number[]|import('three').Color} [options.rimColor]
 * @returns {import('three').Mesh}
 */
export function createBodyMesh(options = {}) {
  const {
    shaderMode = 'dayNight',
    dayTexture = null,
    nightTexture = null,
    atmosphereTexture = null,
    atmosphereTextureBlend = 0.85,
    sunDirection = DEFAULT_SUN_DIRECTION,
    rimColor = DEFAULT_ATMOSPHERE_COLOR,
  } = options;

  const geometry = new SphereGeometry(1, 64, 64);

  const uniforms = {
    dayTexture: { value: dayTexture },
    sunDirection: { value: sunDirection },
    rimColor: { value: rimColor },
  };

  let fragmentShader;
  if (shaderMode === 'venusAtmosphere') {
    uniforms.atmosphereTexture = { value: atmosphereTexture };
    uniforms.atmosphereTextureBlend = { value: atmosphereTextureBlend };
    fragmentShader = BODY_FRAG_VENUS;
  } else if (shaderMode === 'single') {
    fragmentShader = BODY_FRAG_SINGLE;
  } else {
    // dayNight (Earth)
    uniforms.nightTexture = { value: nightTexture };
    fragmentShader = nightTexture ? EARTH_FRAG_DAY_NIGHT : EARTH_FRAG_DAY_ONLY;
  }

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: EARTH_VERT,
    fragmentShader,
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
 * @param {number}                  [options.thickness]       - Shell thickness above radius 1.0 (default 0.06)
 * @param {number}                  [options.density]         - Atmosphere opacity density (default 0.7)
 * @param {number}                  [options.scaleHeightNorm] - Normalised scale height for falloff (default 0.5)
 * @returns {import('three').Mesh}
 */
export function createAtmosphereMesh(options = {}) {
  const {
    sunDirection = DEFAULT_SUN_DIRECTION,
    atmosphereColor = DEFAULT_ATMOSPHERE_COLOR,
    thickness = 0.06,
    density = 0.7,
    scaleHeightNorm = 0.5,
  } = options;

  const radius = 1.0 + thickness;
  const geometry = new SphereGeometry(radius, 64, 64);

  const material = new ShaderMaterial({
    uniforms: {
      sunDirection: { value: sunDirection },
      atmosphereColor: { value: atmosphereColor },
      atmosphereDensity: { value: density },
      scaleHeightNorm: { value: scaleHeightNorm },
    },
    vertexShader: ATMOS_VERT,
    fragmentShader: ATMOS_FRAG_V2,
    side: BackSide,
    transparent: true,
    depthWrite: false,
  });

  return new Mesh(geometry, material);
}
