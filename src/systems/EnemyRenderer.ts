/**
 * Enemy rendering module: mesh creation, weapon models, bullet tracers, death animation.
 *
 * All Three.js mesh operations for enemies live here.
 * EnemyAI delegates rendering to this class.
 *
 * Mesh child order (used by walking animation):
 *   0=torso  1=head  2=lArm  3=rArm  4=lLeg  5=rLeg  6=weapon(optional)
 */
import * as THREE from 'three';
import { EnemyTypeName, type EnemyEntity } from '@game/index';
import { ENEMY_TYPES } from '@config/enemies';
import { CFG } from '@config/constants';

// ========== Shared geometries — created once, reused by all enemies ==========

const SHARED = {
  torsoGeo: new THREE.BoxGeometry(0.6, 0.8, 0.4),
  headGeo: new THREE.SphereGeometry(0.22, 6, 5),
  armGeo: new THREE.BoxGeometry(0.18, 0.6, 0.18),
  legGeo: new THREE.BoxGeometry(0.2, 0.7, 0.2),
  headMat: new THREE.MeshLambertMaterial({ color: 0xddaa77 }),
  legMat: new THREE.MeshLambertMaterial({ color: 0x444444 }),
  gunMetal: new THREE.MeshLambertMaterial({ color: 0x333333 }),
  gunDark: new THREE.MeshLambertMaterial({ color: 0x222222 }),
  // Per-type body materials (created lazily)
  bodyMats: new Map<number, THREE.MeshLambertMaterial>(),
};

function getBodyMat(color: number): THREE.MeshLambertMaterial {
  let mat = SHARED.bodyMats.get(color);
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({ color });
    SHARED.bodyMats.set(color, mat);
  }
  return mat;
}

// ========== Tracer resources ==========

// Enemy tracer shared geometry
const ENEMY_TRACER_GEO = (() => {
  const g = new THREE.CylinderGeometry(0.015, 0.015, 1, 3);
  g.rotateX(Math.PI / 2);
  return g;
})();

// Tracer object pool size — enough for simultaneous fire from 20 enemies
const ENEMY_TRACER_POOL_SIZE = 20;

// ========== Death animation constants ==========

const DEATH_ANIM_DURATION = 1.0;  // seconds for the fall animation
const DEATH_VISIBLE_DURATION = 3;  // seconds before mesh fades out

// ========== Enemy weapon model creation ==========

/** Create a weapon model for an enemy based on weapon id */
function createEnemyWeapon(weaponId: number): THREE.Group {
  const g = new THREE.Group();
  switch (weaponId) {
    case 0: { // Pistol — small handgun
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.12, 0.2),
        SHARED.gunMetal,
      );
      body.position.set(0, 0, -0.05);
      g.add(body);
      const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.1, 0.05),
        SHARED.gunDark,
      );
      grip.position.set(0, -0.08, 0.05);
      g.add(grip);
      break;
    }
    case 3: { // SMG — compact automatic
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.08, 0.4),
        SHARED.gunMetal,
      );
      body.position.set(0, 0, -0.15);
      g.add(body);
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.15, 5),
        SHARED.gunDark,
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.4);
      g.add(barrel);
      const mag = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.14, 0.04),
        SHARED.gunDark,
      );
      mag.position.set(0, -0.1, -0.1);
      g.add(mag);
      const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.08, 0.05),
        SHARED.gunDark,
      );
      grip.position.set(0, -0.07, 0.05);
      g.add(grip);
      break;
    }
    case 5: { // RPG — large tube launcher
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8),
        SHARED.gunMetal,
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0, -0.2);
      g.add(tube);
      const sight = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.08, 0.03),
        SHARED.gunDark,
      );
      sight.position.set(0, 0.08, -0.1);
      g.add(sight);
      const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.1, 0.05),
        SHARED.gunDark,
      );
      grip.position.set(0, -0.08, 0.05);
      g.add(grip);
      break;
    }
    default: { // Generic weapon
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.08, 0.3),
        SHARED.gunMetal,
      );
      body.position.set(0, 0, -0.1);
      g.add(body);
      break;
    }
  }
  // Position at right hand area of enemy mesh
  g.position.set(0.45, 1.1, -0.2);
  return g;
}

// ========== EnemyRenderer class ==========

/**
 * Handles all Three.js rendering for enemies: mesh creation, tracers, death animation.
 */
export class EnemyRenderer {
  private scene: THREE.Scene;
  /** Pre-allocated tracer mesh pool for object reuse */
  private tracerPool: THREE.Mesh[];
  /** Index of next available tracer slot (circular) */
  private tracerNextSlot = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Pre-allocate tracer pool — all invisible until needed
    this.tracerPool = new Array<THREE.Mesh>(ENEMY_TRACER_POOL_SIZE);
    for (let i = 0; i < ENEMY_TRACER_POOL_SIZE; i++) {
      const m = new THREE.Mesh(ENEMY_TRACER_GEO, new THREE.MeshBasicMaterial({ color: 0xffaa44 }));
      m.visible = false;
      this.tracerPool[i] = m;
    }
  }

  /**
   * Create a humanoid 3D mesh for an enemy (shared geometry/material).
   * Child order: [0]torso [1]head [2]lArm [3]rArm [4]lLeg [5]rLeg [6]weapon?
   */
  createMesh(type: EnemyTypeName): THREE.Group {
    const g = new THREE.Group();
    const c = ENEMY_TYPES[type].color;
    const bodyMat = getBodyMat(c);

    // Torso (only part that casts shadow)
    const torso = new THREE.Mesh(SHARED.torsoGeo, bodyMat);
    torso.position.y = 1.2;
    torso.castShadow = true;
    g.add(torso);

    // Head
    const head = new THREE.Mesh(SHARED.headGeo, SHARED.headMat);
    head.position.y = 1.85;
    head.castShadow = false;
    g.add(head);

    // Arms
    const lArm = new THREE.Mesh(SHARED.armGeo, bodyMat);
    lArm.position.set(-0.45, 1.1, 0);
    lArm.castShadow = false;
    g.add(lArm);
    const rArm = new THREE.Mesh(SHARED.armGeo, bodyMat);
    rArm.position.set(0.45, 1.1, 0);
    rArm.castShadow = false;
    g.add(rArm);

    // Legs
    const lLeg = new THREE.Mesh(SHARED.legGeo, SHARED.legMat);
    lLeg.position.set(-0.15, 0.35, 0);
    lLeg.castShadow = false;
    g.add(lLeg);
    const rLeg = new THREE.Mesh(SHARED.legGeo, SHARED.legMat);
    rLeg.position.set(0.15, 0.35, 0);
    rLeg.castShadow = false;
    g.add(rLeg);

    // Weapon model (only for armed enemies)
    const weaponId = ENEMY_TYPES[type].weapon;
    if (weaponId >= 0) {
      const weapon = createEnemyWeapon(weaponId);
      g.add(weapon);
    }

    return g;
  }

  /** Spawn a visible bullet tracer from enemy gun towards target (uses object pool) */
  spawnEnemyTracer(
    sx: number, sy: number, sz: number,
    ex: number, ey: number, ez: number,
    weaponId: number,
  ): void {
    const dx = ex - sx;
    const dy = ey - sy;
    const dz = ez - sz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.5) return;

    // Color varies by weapon type
    const color = weaponId === 5 ? 0xff6644 : weaponId === 3 ? 0xffcc44 : 0xffaa44;
    const thickness = weaponId === 5 ? 2.5 : weaponId === 3 ? 1.5 : 1;

    const m = this.tracerPool[this.tracerNextSlot];
    this.tracerNextSlot = (this.tracerNextSlot + 1) % ENEMY_TRACER_POOL_SIZE;

    // Dispose previous material to prevent GPU memory leak
    const oldMat = m.material as THREE.MeshBasicMaterial;
    if (oldMat) oldMat.dispose();

    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    m.material = mat;
    m.position.set(
      (sx + ex) * 0.5,
      (sy + ey) * 0.5,
      (sz + ez) * 0.5,
    );
    m.scale.set(thickness, thickness, len);
    m.lookAt(ex, ey, ez);
    m.visible = true;
    mat.opacity = 0.6;
    this.scene.add(m);

    // Fade out quickly — when done, return mesh to pool
    const startTime = performance.now();
    const fadeDuration = CFG.ENEMY.TRACER_FADE_MS;
    const fade = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= fadeDuration || !m.visible) {
        m.visible = false;
        this.scene.remove(m);
        return;
      }
      mat.opacity = 0.6 * (1 - elapsed / fadeDuration);
      requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
  }

  /**
   * Procedural death animation: tilt backwards/sideways and lower to ground.
   * Phase 1 (0–1s): rotate the group and lower Y position to simulate falling.
   * Phase 2 (1–3s): corpse lies on ground, visible.
   * After 3s: mesh.hidden = true (existing fade-out).
   */
  updateDeathAnimation(e: EnemyEntity, currentTime: number): void {
    const elapsed = currentTime - e.deathTime;

    if (elapsed < DEATH_ANIM_DURATION) {
      // Phase 1: procedural fall animation
      const t = elapsed / DEATH_ANIM_DURATION; // 0→1 progress
      const eased = t * t * (3 - 2 * t); // smoothstep easing

      // Tilt backward (rotate around X axis: 0 → ~80 degrees)
      e.mesh.rotation.x = eased * CFG.ENEMY.DEATH_TILT_RAD; // ~80 degrees

      // Slight random sideways tilt for variety (seeded from initial angle)
      const sideTilt = (Math.sin(e.angle * CFG.ENEMY.DEATH_SIDE_SEED) * CFG.ENEMY.DEATH_SIDE_FACTOR); // deterministic per enemy
      e.mesh.rotation.z = eased * sideTilt;

      // Lower the mesh to the ground as it falls
      e.mesh.position.y = -eased * CFG.ENEMY.DEATH_LOWER;

      // Arms go limp (children[2]=lArm, children[3]=rArm)
      if (e.mesh.children[2]) (e.mesh.children[2] as THREE.Mesh).rotation.x = eased * CFG.ENEMY.DEATH_ARM_ROT;
      if (e.mesh.children[3]) (e.mesh.children[3] as THREE.Mesh).rotation.x = -eased * CFG.ENEMY.DEATH_ARM_ROT;
    } else {
      // Phase 2: hold final death pose
      e.mesh.rotation.x = CFG.ENEMY.DEATH_TILT_RAD;
      e.mesh.rotation.z = Math.sin(e.angle * CFG.ENEMY.DEATH_SIDE_SEED) * CFG.ENEMY.DEATH_SIDE_FACTOR;
      e.mesh.position.y = -CFG.ENEMY.DEATH_LOWER;
      if (e.mesh.children[2]) (e.mesh.children[2] as THREE.Mesh).rotation.x = CFG.ENEMY.DEATH_ARM_ROT;
      if (e.mesh.children[3]) (e.mesh.children[3] as THREE.Mesh).rotation.x = -CFG.ENEMY.DEATH_ARM_ROT;
    }

    // Existing fade-out: hide after DEATH_VISIBLE_DURATION seconds
    if (elapsed > DEATH_VISIBLE_DURATION) {
      e.mesh.visible = false;
    }
  }

  /** Clear all tracer meshes from scene */
  clear(): void {
    for (const m of this.tracerPool) {
      if (m.visible) {
        m.visible = false;
        this.scene.remove(m);
      }
    }
  }
}
