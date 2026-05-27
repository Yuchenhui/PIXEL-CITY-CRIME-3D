/**
 * Enemy AI system: spawn, state machine, movement, attack, and cleanup.
 *
 * Mesh child order (used by walking animation):
 *   0=torso  1=head  2=lArm  3=rArm  4=lLeg  5=rLeg  6=weapon(optional)
 *
 * AI overview:
 *   - Enemies detect the player via distance + line-of-sight (PhysicsManager.hasLineOfSight)
 *   - When LOS is lost, enemies chase to last known position for 4 seconds before giving up
 *   - Attack accuracy is distance-dependent: full accuracy at point-blank, halves at max sight
 *   - Civilians always flee; police are peaceful when wanted=0
 */
import * as THREE from 'three';
import {
  EnemyTypeName, EnemyState, SoundType,
  type EnemyEntity, type EnemyConfig,
} from '@game/index';
import { ENEMY_TYPES, ENEMY_SCORE, ENEMY_MONEY } from '@config/enemies';
import { CFG } from '@config/constants';
import { AudioManager } from '@core/AudioManager';
import { StateManager } from '@core/StateManager';
import { ParticleManager } from './ParticleManager';
import { PickupSystem } from './PickupSystem';
import { PhysicsManager } from '@core/PhysicsManager';
import { CombatLog } from '@ui/CombatLog';

// Shared geometries — created once, reused by all enemies
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

// Enemy tracer shared geometry
const ENEMY_TRACER_GEO = (() => {
  const g = new THREE.CylinderGeometry(0.015, 0.015, 1, 3);
  g.rotateX(Math.PI / 2);
  return g;
})();

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

/**
 * Enemy AI system: spawn, state machine, movement, attack, and cleanup.
 */
export class EnemyAI {
  private enemies: EnemyEntity[] = [];
  private enemyGroup: THREE.Group;
  private scene: THREE.Scene;

  constructor(
    enemyGroup: THREE.Group,
    scene: THREE.Scene,
    private audio: AudioManager,
    private stateManager: StateManager,
    private particles: ParticleManager,
    private pickupSystem: PickupSystem,
    private physics: PhysicsManager,
    private combatLog: CombatLog,
  ) {
    this.enemyGroup = enemyGroup;
    this.scene = scene;
  }

  /**
   * Create a humanoid 3D mesh for an enemy (shared geometry/material).
   * Child order: [0]torso [1]head [2]lArm [3]rArm [4]lLeg [5]rLeg [6]weapon?
   */
  private createMesh(type: EnemyTypeName): THREE.Group {
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

  /** Spawn a single enemy at position */
  spawnEnemy(x: number, z: number, type: EnemyTypeName): void {
    const mesh = this.createMesh(type);
    mesh.position.set(x, 0, z);
    this.enemyGroup.add(mesh);

    const et = ENEMY_TYPES[type];
    this.enemies.push({
      mesh, type, x, z,
      hp: et.hp, maxHp: et.hp,
      angle: Math.random() * Math.PI * 2,
      state: EnemyState.Patrol,
      stateTimer: 2 + Math.random() * 2, // 2–4s before first patrol re-roll
      patrolAngle: Math.random() * Math.PI * 2,
      fireTimer: 0,
      dead: false,
      deathTime: 0,
      lastKnownX: x,
      lastKnownZ: z,
      alertTimer: 0,
    });
  }

  /**
   * Spawn multiple enemies in a ring around the player.
   * @param types Pool to randomly pick from (duplicates increase spawn weight)
   *
   * Spawn distance 30–90 units keeps enemies off-screen but close enough
   * to engage quickly. Building collision check prevents spawning inside walls.
   */
  spawnEnemies(count: number, types: EnemyTypeName[], playerX: number, playerZ: number): void {
    for (let i = 0; i < count; i++) {
      if (this.getAliveCount() >= CFG.MAX_ENEMIES) break;

      let x: number, z: number, attempts = 0;
      do {
        const a = Math.random() * Math.PI * 2;
        const d = 30 + Math.random() * 60; // 30–90 units from player
        x = playerX + Math.cos(a) * d;
        z = playerZ + Math.sin(a) * d;
        attempts++;
      } while (this.physics.checkBuildingCollision(x, z, 1) && attempts < 20);

      if (attempts < 20) {
        const type = types[Math.floor(Math.random() * types.length)];
        this.spawnEnemy(x, z, type);
      }
    }
  }

  /** Get count of alive enemies */
  getAliveCount(): number {
    return this.enemies.filter(e => !e.dead).length;
  }

  /** Get all enemies for external systems (shooting, vehicles) */
  getEnemies(): EnemyEntity[] {
    return this.enemies;
  }

  /** Update all enemies: AI state machine, movement, attack, cleanup */
  update(dt: number, playerX: number, playerZ: number, takeDamage: (dmg: number, type: string) => void): void {
    const s = this.stateManager.getMutableState();

    for (const e of this.enemies) {
      if (e.dead) {
        if (s.time - e.deathTime > 3) e.mesh.visible = false;
        continue;
      }

      const et = ENEMY_TYPES[e.type];
      e.fireTimer = Math.max(0, e.fireTimer - dt);
      e.stateTimer -= dt;
      e.alertTimer = Math.max(0, e.alertTimer - dt);

      const dx = playerX - e.x;
      const dz = playerZ - e.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Line-of-sight check: distance + no building occlusion
      const inRange = dist < et.sight;
      const hasLOS = inRange && this.physics.hasLineOfSight(e.x, e.z, playerX, playerZ);

      // Update last known position when player is visible
      if (hasLOS) {
        e.lastKnownX = playerX;
        e.lastKnownZ = playerZ;
        e.alertTimer = 4; // Remember position for 4 seconds after losing sight
      }

      const canSee = hasLOS;

      // State transitions
      if (canSee) {
        if (e.type === EnemyTypeName.Civilian) {
          e.state = EnemyState.Flee;
        } else if (e.type === EnemyTypeName.Police && s.wanted === 0) {
          // Police are peaceful when player has no wanted level — just patrol
          if (e.stateTimer <= 0) {
            e.patrolAngle = Math.random() * Math.PI * 2;
            e.stateTimer = 2 + Math.random() * 2;
          }
          e.state = EnemyState.Patrol;
        } else {
          e.state = dist < 15 ? EnemyState.Attack : EnemyState.Chase;
        }
      } else if (e.alertTimer > 0 && e.type !== EnemyTypeName.Civilian) {
        // Remember player's last position — chase towards it
        const lkDx = e.lastKnownX - e.x;
        const lkDz = e.lastKnownZ - e.z;
        const lkDist = Math.sqrt(lkDx * lkDx + lkDz * lkDz);
        if (lkDist > 3) {
          e.state = EnemyState.Chase;
        } else {
          // Reached last known position but can't see player — search
          if (e.stateTimer <= 0) {
            e.patrolAngle = Math.random() * Math.PI * 2;
            e.stateTimer = 1.5 + Math.random();
            e.state = EnemyState.Patrol;
          }
        }
      } else if (e.stateTimer <= 0) {
        e.state = EnemyState.Patrol;
        e.patrolAngle = Math.random() * Math.PI * 2;
        e.stateTimer = 2 + Math.random() * 2;
      }

      // Movement and attack
      let moveAng = e.angle;
      let moveSpd = 0;

      switch (e.state) {
        case EnemyState.Patrol:
          moveAng = e.patrolAngle;
          moveSpd = et.spd * 0.3;
          break;
        case EnemyState.Chase:
          if (hasLOS) {
            moveAng = Math.atan2(dx, dz);
          } else {
            // Move towards last known position
            const lkDx = e.lastKnownX - e.x;
            const lkDz = e.lastKnownZ - e.z;
            moveAng = Math.atan2(lkDx, lkDz);
          }
          moveSpd = et.spd;
          break;
        case EnemyState.Attack:
          moveAng = Math.atan2(dx, dz);
          moveSpd = et.spd * 0.3;
          if (et.weapon >= 0 && e.fireTimer <= 0 && canSee) {
            // Fire rate by weapon: SMG=0.5s (rapid), RPG=2s (slow), Pistol=0.8s (default)
            e.fireTimer = et.weapon === 3 ? 0.5 : et.weapon === 5 ? 2 : 0.8;

            // Accuracy roll: closer = easier to hit, farther = harder
            // At distance 0: hitChance = accuracy
            // At max sight: hitChance = accuracy * 0.5
            const distFactor = 1 - (dist / et.sight) * 0.5;
            const hitChance = et.accuracy * distFactor;
            const hit = Math.random() < hitChance;

            // Muzzle flash at gun position
            const gunX = e.x + Math.sin(moveAng) * 0.8;
            const gunZ = e.z + Math.cos(moveAng) * 0.8;
            this.particles.spawn(gunX, 1.5, gunZ, 0xffaa44, 2);

            // Spawn visible tracer from enemy gun towards player
            const tracerEndX = hit ? playerX : playerX + (Math.random() - 0.5) * 4;
            const tracerEndY = hit ? 1.5 : 0.3 + Math.random() * 1.5;
            const tracerEndZ = hit ? playerZ : playerZ + (Math.random() - 0.5) * 4;
            this.spawnEnemyTracer(gunX, 1.5, gunZ, tracerEndX, tracerEndY, tracerEndZ, et.weapon);

            if (hit) {
              takeDamage(et.dmg, e.type);
            } else {
              // Miss — bullet impact near the player
              const missAngle = Math.random() * Math.PI * 2;
              const missDist = 1 + Math.random() * 2;
              this.particles.spawn(
                playerX + Math.cos(missAngle) * missDist,
                0.3,
                playerZ + Math.sin(missAngle) * missDist,
                0x888866, 1,
              );
              this.combatLog.logEnemyMiss(e.type);
            }
          }
          break;
        case EnemyState.Flee:
          moveAng = Math.atan2(-dx, -dz);
          moveSpd = et.spd * 1.3;
          break;
      }

      e.angle = moveAng;
      const nx = e.x + Math.sin(moveAng) * moveSpd * dt;
      const nz = e.z + Math.cos(moveAng) * moveSpd * dt;

      if (!this.physics.checkBuildingCollision(nx, nz, 0.5)) {
        e.x = nx;
        e.z = nz;
      } else {
        e.patrolAngle = Math.random() * Math.PI * 2;
      }

      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = moveAng;

      // Walking animation: swing legs (children[4]=lLeg, children[5]=rLeg)
      if (moveSpd > 0.5) {
        const t = performance.now() / 200;
        if (e.mesh.children[4]) (e.mesh.children[4] as THREE.Mesh).rotation.x = Math.sin(t) * 0.4;
        if (e.mesh.children[5]) (e.mesh.children[5] as THREE.Mesh).rotation.x = -Math.sin(t) * 0.4;
      }
    }

    // Cleanup dead enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].dead && s.time - this.enemies[i].deathTime > 5) {
        this.enemyGroup.remove(this.enemies[i].mesh);
        this.enemies.splice(i, 1);
      }
    }
  }

  /**
   * Handle enemy being hit by a shot. Returns true if killed.
   * On kill: increments combo (capped at 10x multiplier), awards score + money,
   * adjusts wanted level, and rolls a 30% chance to drop a pickup.
   */
  hitEnemy(enemy: EnemyEntity, dmg: number): boolean {
    const s = this.stateManager.getMutableState();
    enemy.hp -= dmg;
    s.hits++;
    this.audio.playSound(SoundType.Hit, 0.15);
    this.particles.spawn(enemy.x, 1.5, enemy.z, 0xaa1111, 5);

    if (enemy.hp <= 0 && !enemy.dead) {
      enemy.dead = true;
      enemy.deathTime = s.time;
      s.kills++;
      s.combo++;
      s.comboTimer = 3; // 3 seconds to chain the next kill

      this.combatLog.logKill(enemy.type);

      // Score: base × combo multiplier (capped at 10x to prevent runaway scoring)
      const mult = Math.min(s.combo, 10);
      const base = ENEMY_SCORE[enemy.type];
      s.score += base * mult;

      // Money reward (see ENEMY_MONEY in config/enemies.ts)
      const reward = ENEMY_MONEY[enemy.type];
      s.money += reward;
      this.combatLog.logMoney(reward);

      // Wanted level: killing civilians is heavily penalised (+2 stars),
      // killing police/heavy adds 1 star each
      if (enemy.type === EnemyTypeName.Civilian) {
        s.wanted = Math.min(5, s.wanted + 2);
        s.wantedTimer = 15;
      } else if (enemy.type === EnemyTypeName.Police || enemy.type === EnemyTypeName.Heavy) {
        s.wanted = Math.min(5, s.wanted + 1);
        s.wantedTimer = 15;
      }
      s.maxWanted = Math.max(s.maxWanted, s.wanted);

      // 30% drop rate — enough to reward kills without flooding the map
      if (Math.random() < 0.3) {
        this.pickupSystem.spawnPickup(enemy.x, enemy.z);
      }
      return true;
    }
    return false;
  }

  /** Spawn a visible bullet tracer from enemy gun towards target */
  private spawnEnemyTracer(
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

    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const m = new THREE.Mesh(ENEMY_TRACER_GEO, mat);
    m.position.set(
      (sx + ex) * 0.5,
      (sy + ey) * 0.5,
      (sz + ez) * 0.5,
    );
    m.scale.set(thickness, thickness, len);
    m.lookAt(ex, ey, ez);
    this.scene.add(m);

    // Fade out quickly
    const startTime = performance.now();
    const fadeDuration = 80;
    const fade = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= fadeDuration) {
        mat.dispose();
        this.scene.remove(m);
        return;
      }
      mat.opacity = 0.6 * (1 - elapsed / fadeDuration);
      requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
  }

  /** Clear all enemies */
  clear(): void {
    for (const e of this.enemies) {
      this.enemyGroup.remove(e.mesh);
    }
    this.enemies = [];
  }
}
