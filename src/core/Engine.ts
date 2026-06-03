import * as THREE from 'three';
import { CFG } from '@config/constants';

/**
 * Three.js engine wrapper: manages scene, camera, renderer, lighting, and fog.
 */
export class Engine {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  sunLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  clock: THREE.Clock;

  /** Sky color presets for day/night interpolation */
  readonly skyColors = {
    day: new THREE.Color(0x87ceeb),
    night: new THREE.Color(0x0a0a2a),
  };

  /** Scene groups for organized rendering */
  worldGroup: THREE.Group;
  vehicleGroup: THREE.Group;
  enemyGroup: THREE.Group;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x87ceeb, CFG.RENDER.FOG_DENSITY);
    this.scene.background = new THREE.Color(0x87ceeb);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      CFG.RENDER.FAR_PLANE,
    );
    this.camera.position.set(0, CFG.PLAYER_H, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CFG.RENDER.MAX_PIXEL_RATIO));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.body.prepend(this.renderer.domElement);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0x6688aa, 0.5);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    this.sunLight.position.set(50, 80, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(CFG.RENDER.SHADOW_MAP_SIZE, CFG.RENDER.SHADOW_MAP_SIZE);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = CFG.RENDER.SHADOW_CAM_FAR;
    this.sunLight.shadow.camera.left = -CFG.RENDER.SHADOW_CAM_EXTENT;
    this.sunLight.shadow.camera.right = CFG.RENDER.SHADOW_CAM_EXTENT;
    this.sunLight.shadow.camera.top = CFG.RENDER.SHADOW_CAM_EXTENT;
    this.sunLight.shadow.camera.bottom = -CFG.RENDER.SHADOW_CAM_EXTENT;
    this.scene.add(this.sunLight);

    // Groups
    this.worldGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.enemyGroup = new THREE.Group();
    this.scene.add(this.worldGroup);
    this.scene.add(this.vehicleGroup);
    this.scene.add(this.enemyGroup);

    // Clock
    this.clock = new THREE.Clock();

    // Resize handler
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  /** Render one frame */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** Get delta time capped at 50ms to avoid spiral of death */
  getDelta(): number {
    return Math.min(this.clock.getDelta(), CFG.RENDER.DELTA_CAP);
  }

  /** Update sky and lighting based on day factor (0=night, 1=day) */
  setSkyFromDayFactor(dayFactor: number, sunAngle: number): void {
    const sky = new THREE.Color().lerpColors(this.skyColors.night, this.skyColors.day, dayFactor);
    this.scene.background = sky;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = sky;
    }

    this.sunLight.position.set(
      Math.cos(sunAngle) * 80,
      Math.sin(sunAngle) * 80 + 20,
      30,
    );
    this.sunLight.intensity = dayFactor * 2;
    this.ambientLight.intensity = 0.2 + dayFactor * 0.5;

    // Sun color warmth at dawn/dusk
    const t = (sunAngle + Math.PI / 2) / (Math.PI * 2);
    if (t < 0.3 || t > 0.7) {
      this.sunLight.color.setHex(0xffaa66);
    } else {
      this.sunLight.color.setHex(0xffeedd);
    }
  }

  /** Clear all world/vehicle/enemy group children */
  clearGroups(): void {
    while (this.worldGroup.children.length) {
      this.worldGroup.remove(this.worldGroup.children[0]);
    }
    while (this.vehicleGroup.children.length) {
      this.vehicleGroup.remove(this.vehicleGroup.children[0]);
    }
    while (this.enemyGroup.children.length) {
      this.enemyGroup.remove(this.enemyGroup.children[0]);
    }
  }

  /** Clean up resources */
  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
