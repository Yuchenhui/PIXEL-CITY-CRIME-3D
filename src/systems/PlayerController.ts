import * as THREE from 'three';
import { CFG } from '@config/constants';
import { WEAPONS } from '@config/weapons';
import { SoundType } from '@game/index';
import { InputManager } from '@core/InputManager';
import { StateManager } from '@core/StateManager';
import { PhysicsManager } from '@core/PhysicsManager';
import { AudioManager } from '@core/AudioManager';
import { VehicleSystem } from './VehicleSystem';
import { ShootingSystem } from './ShootingSystem';
import { CombatLog } from '@ui/CombatLog';

/**
 * First-person player controller: movement, camera, shooting input, vehicle interaction.
 */
export class PlayerController {
  private camera: THREE.PerspectiveCamera;

  // Pre-allocated temp vectors to avoid per-frame GC pressure
  private _forward = new THREE.Vector3();
  private _right = new THREE.Vector3();
  private _up = new THREE.Vector3(0, 1, 0);

  constructor(
    camera: THREE.PerspectiveCamera,
    private input: InputManager,
    private stateManager: StateManager,
    private physics: PhysicsManager,
    private audio: AudioManager,
    private vehicleSystem: VehicleSystem,
    private shootingSystem: ShootingSystem,
    private combatLog: CombatLog,
  ) {
    this.camera = camera;
  }

  /** Main update tick */
  update(dt: number): void {
    const s = this.stateManager.getMutableState();
    if (s.hp <= 0) return;

    // Fire timer
    s.fireTimer = Math.max(0, s.fireTimer - dt);

    // Reload timer
    if (s.reloading) {
      s.reloadTimer -= dt;
      if (s.reloadTimer <= 0) {
        s.reloading = false;
        s.ammo[s.weaponIdx] = WEAPONS[s.weaponIdx].mag;
      }
    }

    // Vehicle mode
    if (s.inVehicle !== null) {
      this.vehicleSystem.updateDriving(
        dt, this.input.keys, this.input.mouseDown, s.fireTimer,
        () => this.shootingSystem.shoot(),
      );
      return;
    }

    // === On-foot movement ===
    this.updateMovement(dt);
    this.updateCamera();
    this.updateShootingInput();
    this.updateInputActions();
  }

  private updateMovement(dt: number): void {
    const s = this.stateManager.getMutableState();
    const sprint = this.input.keys['ShiftLeft'] || this.input.keys['ShiftRight'];
    const spd = (sprint ? CFG.SPRINT_SPD : CFG.WALK_SPD) * s.sprintMul;

    this.camera.getWorldDirection(this._forward);
    this._forward.y = 0;
    this._forward.normalize();

    this._right.crossVectors(this._forward, this._up);

    let mx = 0, mz = 0;
    if (this.input.keys['KeyW']) { mx += this._forward.x; mz += this._forward.z; }
    if (this.input.keys['KeyS']) { mx -= this._forward.x; mz -= this._forward.z; }
    if (this.input.keys['KeyA']) { mx -= this._right.x; mz -= this._right.z; }
    if (this.input.keys['KeyD']) { mx += this._right.x; mz += this._right.z; }

    const mlen = Math.sqrt(mx * mx + mz * mz);
    if (mlen > 0) { mx /= mlen; mz /= mlen; }

    const nx = this.camera.position.x + mx * spd * dt;
    const nz = this.camera.position.z + mz * spd * dt;

    if (!this.physics.checkBuildingCollision(nx, this.camera.position.z, CFG.PLAYER_R)) {
      this.camera.position.x = nx;
    }
    if (!this.physics.checkBuildingCollision(this.camera.position.x, nz, CFG.PLAYER_R)) {
      this.camera.position.z = nz;
    }

    // Jump & gravity
    if (this.input.keys['Space'] && s.onGround) {
      s.velY = CFG.JUMP_VEL;
      s.onGround = false;
    }
    s.velY -= CFG.GRAVITY * dt;
    this.camera.position.y += s.velY * dt;
    if (this.camera.position.y <= CFG.PLAYER_H) {
      this.camera.position.y = CFG.PLAYER_H;
      s.velY = 0;
      s.onGround = true;
    }

    // Head bob
    if (mlen > 0 && s.onGround) {
      s.bobPhase += dt * (sprint ? 14 : 10);
      this.camera.position.y += Math.sin(s.bobPhase) * 0.04;
    }
  }

  private updateCamera(): void {
    const { dx, dy } = this.input.consumeMouseDelta();
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y -= dx * CFG.MOUSE_SENS;
    this.camera.rotation.x -= dy * CFG.MOUSE_SENS;
    this.camera.rotation.x = Math.max(
      -Math.PI / 2 + 0.1,
      Math.min(Math.PI / 2 - 0.1, this.camera.rotation.x),
    );
  }

  private updateShootingInput(): void {
    const w = WEAPONS[this.stateManager.getState().weaponIdx];
    if (this.input.mouseDown && (!w.auto || this.stateManager.getState().fireTimer! <= 0)) {
      if (w.auto) {
        this.shootingSystem.shoot();
      } else {
        this.shootingSystem.shoot();
        this.input.mouseDown = false;
      }
    }
  }

  private updateInputActions(): void {
    const s = this.stateManager.getState();

    // Weapon switch (1-8)
    for (let d = 1; d <= 8; d++) {
      if (this.input.keys[`Digit${d}`]) {
        this.shootingSystem.switchWeapon(d - 1);
        this.input.resetKey(`Digit${d}`);
      }
    }

    // Reload
    if (this.input.keys['KeyR']) {
      this.shootingSystem.startReload();
      this.input.resetKey('KeyR');
    }

    // Enter/exit vehicle
    if (this.input.keys['KeyE']) {
      this.input.resetKey('KeyE');
      if (s.inVehicle !== null) {
        this.vehicleSystem.exit();
      } else {
        this.vehicleSystem.tryEnter(this.camera.position.x, this.camera.position.z);
      }
    }
  }

  /** Apply damage to the player. Returns actual HP lost. */
  takeDamage(dmg: number, enemyType?: string): number {
    const s = this.stateManager.getMutableState();
    if (s.hp <= 0) return 0;
    const originalDmg = dmg;
    if (s.armor > 0) {
      const absorbed = Math.min(s.armor, dmg * 0.6);
      s.armor -= absorbed;
      dmg -= absorbed;
    }
    s.hp -= dmg;
    this.audio.playSound(SoundType.Damage, 0.2);
    if (s.hp <= 0) s.hp = 0;

    // Log the event
    if (enemyType) {
      this.combatLog.logDamage(enemyType, originalDmg, dmg);
    }
    return dmg;
  }
}
