import {
  AmbientLight,
  DirectionalLight,
  Euler,
  Group,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  SRGBColorSpace,
} from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import { createEarthMesh, createAtmosphereMesh } from './earthBuilder.js';
import { createGraticule } from './graticuleBuilder.js';
import { MarkerManager } from './markerManager.js';
import { ArcPathManager } from './arcPathManager.js';
import { RegionManager } from './regionManager.js';
import { CalloutManager } from './calloutManager.js';
import { getSunLightVector } from '../math/solar.js';
import { clampLatitude, normalizeLongitude } from '../math/sphereProjection.js';
import { latLonToCartesian, cartesianToLatLon } from '../math/geo.js';

const DEG_TO_RAD = Math.PI / 180;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4;
const CAMERA_BASE_DISTANCE = 3;
const IDLE_ROTATION_SPEED_DEFAULT = 0;

/**
 * ThreeGlobeRenderer — Three.js-based globe renderer.
 *
 * Camera design: camera stays fixed at (0, 0, distance), globe mesh rotates.
 * panBy(deltaLon, deltaLat) rotates the globe group.
 * getCameraState() derives centerLon/centerLat from the globe group's Euler angles.
 */
export class ThreeGlobeRenderer {
  // --- Scene & rendering ---
  #scene = null;
  #camera = null;
  #webglRenderer = null;
  #css2dRenderer = null;

  // --- Globe hierarchy ---
  #globeGroup = null;
  #earthMesh = null;
  #atmosphereMesh = null;
  #graticule = null;
  #markerGroup = null;
  #arcGroup = null;
  #regionGroup = null;
  #calloutGroup = null;

  // --- Sub-managers ---
  #markerManager = new MarkerManager();
  #arcPathManager = new ArcPathManager();
  #regionManager = new RegionManager();
  #calloutManager = new CalloutManager();

  // --- Camera state (derived from globe rotation) ---
  #centerLon = 0;
  #centerLat = 0;
  #zoom = 1;

  // --- Rendering loop ---
  #rafId = null;
  #dirty = true;
  #lastScene = null;

  // --- Texture loader ---
  #textureLoader = new TextureLoader();
  #loadedTextures = new Map(); // uri → texture

  // --- Sun direction (for shader uniforms) ---
  #sunDirection = new Vector3(-5, 3, 8).normalize();

  // --- Container reference for resize/destroy ---
  #container = null;

  // ---------------------------------------------------------------------------
  // Public API — camera state
  // ---------------------------------------------------------------------------

  /**
   * Returns the current camera state: centerLon, centerLat, zoom.
   * These are derived from the globe group's rotation.
   */
  getCameraState() {
    return {
      centerLon: this.#centerLon,
      centerLat: this.#centerLat,
      zoom: this.#zoom,
    };
  }

  /**
   * Pause idle rotation by saving the current speed and setting it to zero.
   * Safe to call multiple times — only the first call saves the speed.
   */
  pauseIdleRotation() {
    if (this.#savedRotationSpeed === null) {
      this.#savedRotationSpeed = this.#rotationSpeed;
      this.#rotationSpeed = 0;
    }
  }

  /**
   * Resume idle rotation by restoring the previously saved speed.
   * No-op if idle rotation is not currently paused.
   */
  resumeIdleRotation() {
    if (this.#savedRotationSpeed !== null) {
      this.#rotationSpeed = this.#savedRotationSpeed;
      this.#savedRotationSpeed = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API — navigation
  // ---------------------------------------------------------------------------

  /**
   * Pan the globe by the given longitude and latitude offsets (in degrees).
   * Rotates the globe group; camera stays fixed.
   */
  panBy(deltaLon, deltaLat) {
    const dLon = Number(deltaLon ?? 0);
    const dLat = Number(deltaLat ?? 0);

    this.#centerLon = normalizeLongitude(this.#centerLon + dLon);
    this.#centerLat = clampLatitude(this.#centerLat + dLat);
    this.#applyGlobeRotation();
    this.#dirty = true;
  }

  /**
   * Adjust zoom level by deltaScale. Clamped to [ZOOM_MIN, ZOOM_MAX].
   */
  zoomBy(deltaScale) {
    const next = this.#zoom + Number(deltaScale ?? 0);
    this.#zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    this.#updateCameraDistance();
    this.#dirty = true;
  }

  /**
   * Instantly fly to a geographic target.
   * @param {{ lat: number, lon: number }} target
   * @param {{ zoom?: number }} options
   */
  flyTo(target, options = {}) {
    this.#centerLon = normalizeLongitude(target.lon ?? 0);
    this.#centerLat = clampLatitude(target.lat ?? 0);
    if (typeof options.zoom === 'number') {
      this.#zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, options.zoom));
    }
    this.#applyGlobeRotation();
    this.#updateCameraDistance();
    this.#dirty = true;
  }

  // ---------------------------------------------------------------------------
  // Public API — lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialise the renderer inside a DOM container.
   * @param {HTMLElement} container
   * @param {object} [options]
   * @param {object} [options.initialScene]
   */
  init(container, options = {}) {
    this.#container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // --- WebGLRenderer ---
    let webglRenderer;
    try {
      webglRenderer = new WebGLRenderer({ antialias: true });
      // Verify context was actually created
      if (!webglRenderer.getContext()) {
        throw new Error('no context');
      }
    } catch (_) {
      throw new Error('WebGL is not available');
    }
    webglRenderer.setSize(width, height);
    webglRenderer.setPixelRatio(globalThis.devicePixelRatio ?? 1);
    webglRenderer.setClearColor(0x020b18, 1);
    webglRenderer.outputColorSpace = SRGBColorSpace;
    const canvas = webglRenderer.domElement;
    canvas.style.display = 'block';
    container.appendChild(canvas);
    this.#webglRenderer = webglRenderer;

    // --- CSS2DRenderer overlay ---
    const css2dRenderer = new CSS2DRenderer();
    css2dRenderer.setSize(width, height);
    const labelDiv = css2dRenderer.domElement;
    labelDiv.style.position = 'absolute';
    labelDiv.style.top = '0';
    labelDiv.style.left = '0';
    labelDiv.style.pointerEvents = 'none';
    container.appendChild(labelDiv);
    this.#css2dRenderer = css2dRenderer;

    // --- Scene ---
    const scene = new Scene();
    this.#scene = scene;

    // --- Camera ---
    const aspect = width / height;
    const camera = new PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(0, 0, CAMERA_BASE_DISTANCE / this.#zoom);
    camera.lookAt(0, 0, 0);
    this.#camera = camera;

    // --- Lights ---
    const ambientLight = new AmbientLight(0x222244, 0.4);
    scene.add(ambientLight);
    const dirLight = new DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(-5, 3, 8);
    scene.add(dirLight);

    // --- Globe group (rotates) ---
    const globeGroup = new Group();
    this.#globeGroup = globeGroup;
    scene.add(globeGroup);

    // --- Earth mesh ---
    const earthMesh = createEarthMesh({
      sunDirection: this.#sunDirection,
      nightLayer: true,
    });
    this.#earthMesh = earthMesh;
    globeGroup.add(earthMesh);

    // --- Graticule ---
    const graticule = createGraticule();
    this.#graticule = graticule;
    globeGroup.add(graticule);

    // --- Sub-manager groups ---
    this.#markerGroup = new Group();
    globeGroup.add(this.#markerGroup);

    this.#arcGroup = new Group();
    globeGroup.add(this.#arcGroup);

    this.#regionGroup = new Group();
    globeGroup.add(this.#regionGroup);

    this.#calloutGroup = new Group();
    globeGroup.add(this.#calloutGroup);

    // --- Atmosphere mesh (outside globe group — does not rotate) ---
    const atmosphereMesh = createAtmosphereMesh({ sunDirection: this.#sunDirection });
    this.#atmosphereMesh = atmosphereMesh;
    scene.add(atmosphereMesh);

    // --- Apply initial globe rotation ---
    this.#applyGlobeRotation();

    // --- Render initial scene if provided ---
    if (options.initialScene) {
      this.renderScene(options.initialScene);
    }

    // --- Start rAF loop ---
    this.#startLoop();
  }

  /**
   * Update the scene data. Marks the renderer dirty so next frame re-renders.
   * @param {object} scene
   */
  renderScene(scene) {
    if (!scene) return;
    this.#lastScene = scene;
    this.#dirty = true;

    // Update sub-managers with new scene data
    const locale = scene.locale ?? 'en';

    if (this.#markerGroup) {
      this.#markerManager.update(this.#markerGroup, scene.markers ?? [], locale);
    }
    if (this.#arcGroup) {
      this.#arcPathManager.update(this.#arcGroup, scene.arcs ?? [], scene.paths ?? []);
    }
    if (this.#regionGroup) {
      this.#regionManager.update(this.#regionGroup, scene.regions ?? []);
    }

    // Callout manager + CSS2D labels
    if (this.#calloutGroup) {
      this.#calloutManager.update(this.#calloutGroup, scene.markers ?? [], locale);

      if (typeof CSS2DObject !== 'undefined' && this.#globeGroup) {
        // Remove old CSS2D label objects from globe group
        this.#css2dCleanup();

        const labels = this.#calloutManager.createCSS2DLabels(CSS2DObject);
        for (const { id, object, div } of labels) {
          this.#globeGroup.add(object);
          // Wire hover/click event listeners (E7)
          const mode = object.userData?.calloutMode;
          if (mode === 'hover') {
            div.addEventListener('mouseenter', () => this.#calloutManager.showCallout(id));
            div.addEventListener('mouseleave', () => this.#calloutManager.hideCallout(id));
          } else if (mode === 'click') {
            div.addEventListener('click', () => {
              const data = this.#calloutManager.getCalloutData()?.get(id);
              if (data?.visible) {
                this.#calloutManager.hideCallout(id);
              } else {
                this.#calloutManager.showCallout(id);
              }
            });
          }
          // Clicking a callout label triggers inspect for the marker
          div.addEventListener('click', () => {
            const markerData = this.#markerManager.getMarkerMap()?.get(id);
            if (markerData && this.#container) {
              const marker = markerData.marker;
              const anchorPos = this.#worldToClient(markerData.object.position);
              const event = new CustomEvent('calloutClick', {
                bubbles: true,
                detail: { kind: 'marker', id, entity: marker, anchor: anchorPos },
              });
              this.#container.dispatchEvent(event);
            }
          });
        }
      }
    }

    // Update textures from planet config
    const planet = scene.planet ?? {};
    this.#updateTextures(planet);

    // Update sun direction uniform
    this.#updateSunDirection(planet);

    // Update idle rotation speed
    if (typeof planet.rotationSpeed === 'number') {
      this.#rotationSpeed = planet.rotationSpeed;
    } else {
      this.#rotationSpeed = IDLE_ROTATION_SPEED_DEFAULT;
    }

    // If no Three.js renderer available (Node.js tests), skip WebGL-specific steps
  }

  /**
   * Resize the renderer to new dimensions.
   */
  resize(width, height) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    if (this.#webglRenderer) {
      this.#webglRenderer.setSize(w, h);
    }
    if (this.#css2dRenderer) {
      this.#css2dRenderer.setSize(w, h);
    }
    if (this.#camera) {
      this.#camera.aspect = w / h;
      this.#camera.updateProjectionMatrix();
    }
    if (this.#arcPathManager) {
      this.#arcPathManager.setResolution(w, h);
    }
    this.#dirty = true;
  }

  /**
   * Hit-test at client coordinates. Returns { kind, id, entity, anchor } or null.
   */
  hitTest(clientX, clientY) {
    if (!this.#webglRenderer || !this.#camera || !this.#scene) {
      return null;
    }

    const canvas = this.#webglRenderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(ndcX, ndcY), this.#camera);

    // Test markers first
    const markerObjects = this.#markerGroup ? [...this.#markerGroup.children] : [];
    const markerHits = raycaster.intersectObjects(markerObjects, false);
    if (markerHits.length > 0) {
      const hit = markerHits[0];
      const markerId = hit.object.userData?.markerId;
      const markerData = this.#markerManager.getMarkerMap()?.get(markerId);
      if (markerData) {
        const anchorPos = this.#worldToClient(hit.object.position);
        return {
          kind: 'marker',
          id: markerId,
          entity: markerData.marker,
          anchor: anchorPos,
        };
      }
    }

    // Test arcs/paths
    const arcObjects = this.#arcGroup ? [...this.#arcGroup.children] : [];
    const arcHits = raycaster.intersectObjects(arcObjects, false);
    if (arcHits.length > 0) {
      const hit = arcHits[0];
      const { entityId, kind } = hit.object.userData ?? {};
      const anchorPos = this.#worldToClient(hit.point);
      return {
        kind: kind ?? 'arc',
        id: entityId,
        entity: null,
        anchor: anchorPos,
      };
    }

    // Test regions
    const regionObjects = this.#regionGroup ? [...this.#regionGroup.children] : [];
    const regionHits = raycaster.intersectObjects(regionObjects, false);
    if (regionHits.length > 0) {
      const hit = regionHits[0];
      const { entityId } = hit.object.userData ?? {};
      const anchorPos = this.#worldToClient(hit.point);
      return {
        kind: 'region',
        id: entityId,
        entity: null,
        anchor: anchorPos,
      };
    }

    return null;
  }

  /**
   * Convert screen (client) coordinates to geographic lat/lon by raycasting
   * against the earth mesh. Returns { lat, lon } or null if off-globe.
   */
  screenToLatLon(clientX, clientY) {
    if (!this.#webglRenderer || !this.#camera || !this.#earthMesh) {
      return null;
    }

    const canvas = this.#webglRenderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(ndcX, ndcY), this.#camera);
    const hits = raycaster.intersectObject(this.#earthMesh);
    if (hits.length === 0) return null;

    const worldPoint = hits[0].point.clone();
    const inverseRotation = this.#globeGroup.quaternion.clone().invert();
    worldPoint.applyQuaternion(inverseRotation);

    const geo = cartesianToLatLon(worldPoint.x, worldPoint.y, worldPoint.z);
    return { lat: geo.lat, lon: geo.lon };
  }

  /**
   * Project a geographic point to client (screen) coordinates.
   * @param {{ lat: number, lon: number, alt?: number }} point
   * @returns {{ clientX: number, clientY: number, visible: boolean } | null}
   */
  filterCallouts(matchingIds) {
    this.#calloutManager.filterCallouts(matchingIds);
    this.#dirty = true;
  }

  projectPointToClient(point) {
    if (!this.#camera || !this.#webglRenderer) {
      return null;
    }

    const cart = latLonToCartesian(point.lat ?? 0, point.lon ?? 0, 1, point.alt ?? 0);
    const worldPos = new Vector3(cart.x, cart.y, cart.z);

    // Apply globe group rotation
    if (this.#globeGroup) {
      worldPos.applyQuaternion(this.#globeGroup.quaternion);
    }

    return this.#worldToClient(worldPos);
  }

  /**
   * Tear down all GPU resources and DOM elements.
   */
  destroy() {
    this.#stopLoop();

    // Dispose sub-managers
    this.#markerManager?.dispose();
    this.#arcPathManager?.dispose();
    this.#regionManager?.dispose();
    this.#calloutManager?.dispose();

    // Dispose Three.js objects
    if (this.#earthMesh) {
      this.#earthMesh.geometry?.dispose();
      this.#earthMesh.material?.dispose();
    }
    if (this.#atmosphereMesh) {
      this.#atmosphereMesh.geometry?.dispose();
      this.#atmosphereMesh.material?.dispose();
    }
    if (this.#graticule) {
      this.#graticule.geometry?.dispose();
      this.#graticule.material?.dispose();
    }

    // Dispose all loaded textures
    for (const tex of this.#loadedTextures.values()) {
      tex.dispose();
    }
    this.#loadedTextures.clear();

    // Dispose WebGL renderer and remove from DOM
    if (this.#webglRenderer) {
      const canvas = this.#webglRenderer.domElement;
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      this.#webglRenderer.dispose();
      this.#webglRenderer = null;
    }

    // Remove CSS2D overlay from DOM
    if (this.#css2dRenderer) {
      const labelEl = this.#css2dRenderer.domElement;
      if (labelEl.parentNode) {
        labelEl.parentNode.removeChild(labelEl);
      }
      this.#css2dRenderer = null;
    }

    this.#scene = null;
    this.#camera = null;
    this.#globeGroup = null;
    this.#earthMesh = null;
    this.#atmosphereMesh = null;
    this.#graticule = null;
    this.#markerGroup = null;
    this.#arcGroup = null;
    this.#regionGroup = null;
    this.#calloutGroup = null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Idle rotation speed in deg/frame (set from planet.rotationSpeed). */
  #rotationSpeed = IDLE_ROTATION_SPEED_DEFAULT;

  /** Saved rotation speed while idle rotation is paused (null = not paused). */
  #savedRotationSpeed = null;

  /** Apply the current centerLon/centerLat as globe group Euler angles. */
  #applyGlobeRotation() {
    if (!this.#globeGroup) return;
    // latLonToCartesian puts (0,0) on +X with z negated for Three.js UV alignment.
    // Camera at +Z. YXZ: Y by -(centerLon+90°), then X by centerLat.
    this.#globeGroup.rotation.set(
      this.#centerLat * DEG_TO_RAD,
      -(this.#centerLon + 90) * DEG_TO_RAD,
      0,
      'YXZ'
    );
  }

  /** Move camera based on current zoom level. */
  #updateCameraDistance() {
    if (!this.#camera) return;
    this.#camera.position.set(0, 0, CAMERA_BASE_DISTANCE / this.#zoom);
  }

  /** Update earth mesh textures from planet config (E3, E4). */
  #updateTextures(planet) {
    if (!this.#earthMesh) return;
    const mat = this.#earthMesh.material;
    if (!mat?.uniforms) return;

    const dayUri = planet?.dayTextureUri ?? planet?.textureUri;
    const nightUri = planet?.nightTextureUri;

    if (dayUri) {
      const tex = this.#loadTexture(dayUri, 'dayTexture');
      if (tex) mat.uniforms.dayTexture.value = tex;
    }
    if (nightUri) {
      const tex = this.#loadTexture(nightUri, 'nightTexture');
      if (tex) mat.uniforms.nightTexture.value = tex;
    }
  }

  /**
   * Load a texture by URI. Returns cached texture if already loaded.
   * On error dispatches a 'textureError' custom event (E4).
   */
  #loadTexture(uri, uniformName) {
    if (this.#loadedTextures.has(uri)) {
      return this.#loadedTextures.get(uri);
    }

    const tex = this.#textureLoader.load(
      uri,
      (loadedTex) => {
        loadedTex.colorSpace = SRGBColorSpace;
        this.#loadedTextures.set(uri, loadedTex);
        if (this.#earthMesh?.material?.uniforms?.[uniformName]) {
          this.#earthMesh.material.uniforms[uniformName].value = loadedTex;
          this.#earthMesh.material.needsUpdate = true;
        }
        this.#dirty = true;
      },
      undefined,
      (err) => {
        // E4: emit textureError event
        const event = new CustomEvent('textureError', { detail: { uri, uniformName, error: err } });
        if (this.#container) {
          this.#container.dispatchEvent(event);
        }
      }
    );

    return tex;
  }

  /** Update sun direction uniform on earth and atmosphere meshes. */
  #updateSunDirection(planet) {
    const camera = this.getCameraState();
    const sunVec = getSunLightVector(camera, planet?.lightingTimestamp);
    const v = new Vector3(sunVec.x, sunVec.y, sunVec.z);
    this.#sunDirection.copy(v);

    if (this.#earthMesh?.material?.uniforms?.sunDirection) {
      this.#earthMesh.material.uniforms.sunDirection.value = v;
    }
    if (this.#atmosphereMesh?.material?.uniforms?.sunDirection) {
      this.#atmosphereMesh.material.uniforms.sunDirection.value = v;
    }
  }

  /** Remove previously added CSS2D label objects from the globe group. */
  #css2dCleanup() {
    if (!this.#globeGroup) return;
    const toRemove = this.#globeGroup.children.filter(
      (child) => child.isCSS2DObject
    );
    for (const obj of toRemove) {
      this.#globeGroup.remove(obj);
    }
  }

  /** Convert a Three.js world position to client {clientX, clientY, visible}. */
  #worldToClient(worldPos) {
    if (!this.#camera || !this.#webglRenderer) return null;

    const v = worldPos.clone().project(this.#camera);
    const canvas = this.#webglRenderer.domElement;
    const rect = canvas.getBoundingClientRect();

    const clientX = rect.left + ((v.x + 1) / 2) * rect.width;
    const clientY = rect.top + ((-v.y + 1) / 2) * rect.height;
    const visible = v.z < 1; // in front of far plane

    return { clientX, clientY, visible };
  }

  /** Start the requestAnimationFrame render loop. */
  #startLoop() {
    const tick = () => {
      this.#rafId = requestAnimationFrame(tick);
      this.#frame();
    };
    this.#rafId = requestAnimationFrame(tick);
  }

  /** Stop the render loop. */
  #stopLoop() {
    if (this.#rafId != null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  /** Elapsed time accumulator for animations (seconds). */
  #elapsedTime = 0;
  #lastFrameTime = 0;

  /** Per-frame logic: idle rotation, callout visibility, conditional render. */
  #frame() {
    // Track elapsed time for animations
    const now = performance.now() / 1000;
    if (this.#lastFrameTime > 0) {
      this.#elapsedTime += now - this.#lastFrameTime;
    }
    this.#lastFrameTime = now;

    // Idle rotation
    if (this.#rotationSpeed !== 0 && this.#globeGroup) {
      this.#centerLon = normalizeLongitude(this.#centerLon + this.#rotationSpeed);
      this.#applyGlobeRotation();
      this.#dirty = true;
    }

    // Animate marker pulse rings
    if (this.#markerManager.hasPulseAnimations()) {
      this.#markerManager.animate(this.#elapsedTime);
      this.#dirty = true;
    }

    // Update callout visibility (E10)
    if (this.#camera && this.#globeGroup) {
      const cameraPos = this.#camera.position.clone();
      const globeQuat = this.#globeGroup.quaternion;
      this.#calloutManager.updateVisibility(cameraPos, globeQuat);
    }

    // Only render when dirty
    if (!this.#dirty) return;
    this.#dirty = false;

    if (this.#webglRenderer && this.#scene && this.#camera) {
      this.#webglRenderer.render(this.#scene, this.#camera);
    }
    if (this.#css2dRenderer && this.#scene && this.#camera) {
      this.#css2dRenderer.render(this.#scene, this.#camera);
    }
  }
}
