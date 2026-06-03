/**
 * Enemy AI system: spawn, state machine, movement, attack, and cleanup.
 *
 * Mesh child order (used by walking animation):
 *   0=torso  1=head  2=lArm  3=rArm  4=lLeg  5=rLeg  6=weapon(optional)
 *
 * Rendering (mesh creation, tracers, death animation) is delegated to EnemyRenderer.
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
  type EnemyEntity,
} from '@game/index';
import { ENEMY_TYPES, ENEMY_SCORE, ENEMY_MONEY } from '@config/enemies';
import { CFG } from '@config/constants';
import { AudioManager } from '@core/AudioManager';
import { StateManager } from '@core/StateManager';
import { ParticleManager } from './ParticleManager';
import { PickupSystem } from './PickupSystem';
import { PhysicsManager } from '@core/PhysicsManager';
import { CombatLog } from '@ui/CombatLog';
import { EnemyRenderer } from './EnemyRenderer';

// Seconds before dead enemy mesh is removed from the scene
const DEATH_CLEANUP_DURATION = 5;

/**
 * Enemy AI system: spawn, state machine, movement, attack, and cleanup.
 */
export class EnemyAI {
  private enemies: EnemyEntity[] = [];
  private enemyGroup: THREE.Group;
  private renderer: EnemyRenderer;

  constructor(
    enemyGroup: THREE.Group,
    renderer: EnemyRenderer,
    private audio: AudioManager,
    private stateManager: StateManager,
    private particles: ParticleManager,
    private pickupSystem: PickupSystem,
    private physics: PhysicsManager,
    private combatLog: CombatLog,
  ) {
    this.enemyGroup = enemyGroup;
    this.renderer = renderer;
  }

  /** Spawn a single enemy at position */
  spawnEnemy(x: number, z: number, type: EnemyTypeName): void {
    const mesh = this.renderer.createMesh(type);
    mesh.position.set(x, 0, z);
    this.enemyGroup.add(mesh);

    const et = ENEMY_TYPES[type];
    this.enemies.push({
      mesh, type, x, z,
      hp: et.hp, maxHp: et.hp,
      angle: Math.random() * Math.PI * 2,
      state: EnemyState.Patrol,
      stateTimer: CFG.ENEMY.PATROL_TIMER_MIN + Math.random() * CFG.ENEMY.PATROL_TIMER_RANGE, // 2–4s before first patrol re-roll
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
        const d = CFG.ENEMY.SPAWN_MIN_DIST + Math.random() * CFG.ENEMY.SPAWN_DIST_RANGE; // 30–90 units from player
        x = playerX + Math.cos(a) * d;
        z = playerZ + Math.sin(a) * d;
        attempts++;
      } while (this.physics.checkBuildingCollision(x, z, 1) && attempts < CFG.ENEMY.SPAWN_MAX_ATTEMPTS);

      if (attempts < CFG.ENEMY.SPAWN_MAX_ATTEMPTS) {
        const type = types[Math.floor(Math.random() * types.length)];
        this.spawnEnemy(x, z, type);
      }
    }
  }

  /** Get count of alive enemies */
  getAliveCount(): number {
    let count = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].dead) count++;
    }
    return count;
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
        this.renderer.updateDeathAnimation(e, s.time);
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
        e.alertTimer = CFG.ENEMY.ALERT_TIMER; // Remember position for ALERT_TIMER seconds after losing sight
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
            e.stateTimer = CFG.ENEMY.PATROL_TIMER_MIN + Math.random() * CFG.ENEMY.PATROL_TIMER_RANGE;
          }
          e.state = EnemyState.Patrol;
        } else {
          e.state = dist < CFG.ENEMY.ATTACK_DIST ? EnemyState.Attack : EnemyState.Chase;
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
            e.stateTimer = CFG.ENEMY.SEARCH_TIMER_MIN + Math.random() * CFG.ENEMY.SEARCH_TIMER_RANGE;
            e.state = EnemyState.Patrol;
          }
        }
      } else if (e.stateTimer <= 0) {
        e.state = EnemyState.Patrol;
        e.patrolAngle = Math.random() * Math.PI * 2;
        e.stateTimer = CFG.ENEMY.PATROL_TIMER_MIN + Math.random() * CFG.ENEMY.PATROL_TIMER_RANGE;
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
            e.fireTimer = et.weapon === 3 ? CFG.ENEMY.FIRE_RATE_SMG : et.weapon === 5 ? CFG.ENEMY.FIRE_RATE_RPG : CFG.ENEMY.FIRE_RATE_DEFAULT;

            // Accuracy roll: closer = easier to hit, farther = harder
            // At distance 0: hitChance = accuracy
            // At max sight: hitChance = accuracy * 0.5
            const distFactor = 1 - (dist / et.sight) * CFG.ENEMY.DIST_ACCURACY_DECAY;
            const hitChance = et.accuracy * distFactor;
            const hit = Math.random() < hitChance;

            // Muzzle flash at gun position
            const gunX = e.x + Math.sin(moveAng) * CFG.ENEMY.GUN_OFFSET;
            const gunZ = e.z + Math.cos(moveAng) * CFG.ENEMY.GUN_OFFSET;
            this.particles.spawn(gunX, CFG.ENEMY.GUN_HEIGHT, gunZ, 0xffaa44, 2);

            // Spawn visible tracer from enemy gun towards player
            const tracerEndX = hit ? playerX : playerX + (Math.random() - 0.5) * CFG.ENEMY.MISS_OFFSET_RANGE;
            const tracerEndY = hit ? CFG.ENEMY.GUN_HEIGHT : CFG.ENEMY.MISS_Y + Math.random() * CFG.ENEMY.GUN_HEIGHT;
            const tracerEndZ = hit ? playerZ : playerZ + (Math.random() - 0.5) * CFG.ENEMY.MISS_OFFSET_RANGE;
            this.renderer.spawnEnemyTracer(gunX, CFG.ENEMY.GUN_HEIGHT, gunZ, tracerEndX, tracerEndY, tracerEndZ, et.weapon);

            if (hit) {
              takeDamage(et.dmg, e.type);
            } else {
              // Miss — bullet impact near the player
              const missAngle = Math.random() * Math.PI * 2;
              const missDist = CFG.ENEMY.MISS_DIST_MIN + Math.random() * 2;
              this.particles.spawn(
                playerX + Math.cos(missAngle) * missDist,
                CFG.ENEMY.MISS_Y,
                playerZ + Math.sin(missAngle) * missDist,
                0x888866, 1,
              );
              this.combatLog.logEnemyMiss(e.type);
            }
          }
          break;
        case EnemyState.Flee:
          moveAng = Math.atan2(-dx, -dz);
          moveSpd = et.spd * CFG.ENEMY.FLEE_SPEED_MUL;
          break;
      }

      e.angle = moveAng;
      const nx = e.x + Math.sin(moveAng) * moveSpd * dt;
      const nz = e.z + Math.cos(moveAng) * moveSpd * dt;

      if (!this.physics.checkBuildingCollision(nx, nz, CFG.ENEMY.MOVE_COLLISION_R)) {
        e.x = nx;
        e.z = nz;
      } else {
        e.patrolAngle = Math.random() * Math.PI * 2;
      }

      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = moveAng;

      // Walking animation: swing legs (children[4]=lLeg, children[5]=rLeg)
      if (moveSpd > 0.5) {
        const t = performance.now() / CFG.ENEMY.WALK_ANIM_SPEED;
        if (e.mesh.children[4]) (e.mesh.children[4] as THREE.Mesh).rotation.x = Math.sin(t) * CFG.ENEMY.LEG_SWING_AMP;
        if (e.mesh.children[5]) (e.mesh.children[5] as THREE.Mesh).rotation.x = -Math.sin(t) * CFG.ENEMY.LEG_SWING_AMP;
      }
    }

    // Cleanup dead enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].dead && s.time - this.enemies[i].deathTime > DEATH_CLEANUP_DURATION) {
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
      s.comboTimer = CFG.ENEMY.COMBO_TIMER; // 3 seconds to chain the next kill

      this.combatLog.logKill(enemy.type);

      // Score: base × combo multiplier (capped at 10x to prevent runaway scoring)
      const mult = Math.min(s.combo, CFG.ENEMY.COMBO_MAX);
      const base = ENEMY_SCORE[enemy.type];
      s.score += base * mult;

      // Money reward (see ENEMY_MONEY in config/enemies.ts)
      const reward = ENEMY_MONEY[enemy.type];
      s.money += reward;
      this.combatLog.logMoney(reward);

      // Wanted level: killing civilians is heavily penalised (+2 stars),
      // killing police/heavy adds 1 star each
      if (enemy.type === EnemyTypeName.Civilian) {
        s.wanted = Math.min(CFG.GAME.MAX_WANTED, s.wanted + 2);
        s.wantedTimer = CFG.GAME.WANTED_DECAY_TIMER;
      } else if (enemy.type === EnemyTypeName.Police || enemy.type === EnemyTypeName.Heavy) {
        s.wanted = Math.min(CFG.GAME.MAX_WANTED, s.wanted + 1);
        s.wantedTimer = CFG.GAME.WANTED_DECAY_TIMER;
      }
      s.maxWanted = Math.max(s.maxWanted, s.wanted);

      // 30% drop rate — enough to reward kills without flooding the map
      if (Math.random() < CFG.ENEMY.DROP_RATE) {
        this.pickupSystem.spawnPickup(enemy.x, enemy.z);
      }
      return true;
    }
    return false;
  }

  /** Clear all enemies */
  clear(): void {
    for (const e of this.enemies) {
      this.enemyGroup.remove(e.mesh);
    }
    this.enemies = [];
  }
}
