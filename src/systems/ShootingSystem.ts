import * as THREE from 'three';
import { CFG } from '@config/constants';
import { SoundType } from '@game/index';
import { WEAPONS } from '@config/weapons';
import { AudioManager } from '@core/AudioManager';
import { StateManager } from '@core/StateManager';
import { ParticleManager } from './ParticleManager';
import { EnemyAI } from './EnemyAI';

/**
 * Shooting system: raycasting, weapon viewmodel, tracers, explosions, muzzle flash, recoil.
 */
export class ShootingSystem {
  private weaponViewModel: THREE.Group;
  private muzzleFlash: THREE.PointLight;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();

  // Pre-allocated temp vectors to avoid per-shot GC
  private _dir = new THREE.Vector3();
  private _start = new THREE.Vector3();
  private _end = new THREE.Vector3();
  private _offset = new THREE.Vector3(0.3, -0.15, -0.5);
  private _offsetQ = new THREE.Vector3();

  // Shared tracer geometry (unit-length cylinder aligned to -Z axis, scaled per tracer)
  private static tracerGeo = (() => {
    const g = new THREE.CylinderGeometry(0.01, 0.01, 1, 3);
    g.rotateX(Math.PI / 2);
    return g;
  })();

  constructor(
    camera: THREE.PerspectiveCamera,
    private scene: THREE.Scene,
    private audio: AudioManager,
    private stateManager: StateManager,
    private particles: ParticleManager,
    private enemyAI: EnemyAI,
  ) {
    this.camera = camera;

    // Weapon viewmodel group attached to camera
    this.weaponViewModel = new THREE.Group();
    camera.add(this.weaponViewModel);
    scene.add(camera);

    // Muzzle flash light
    this.muzzleFlash = new THREE.PointLight(0xffaa44, 0, 5);
    this.muzzleFlash.position.set(0.3, -0.2, -0.8);
    this.weaponViewModel.add(this.muzzleFlash);

    this.updateWeaponModel();
  }

  /** Rebuild the weapon viewmodel mesh for current weapon */
  updateWeaponModel(): void {
    // Keep muzzle flash (children[0]), remove the rest
    while (this.weaponViewModel.children.length > 1) {
      this.weaponViewModel.remove(this.weaponViewModel.children[1]);
    }

    const s = this.stateManager.getState();
    const w = WEAPONS[s.weaponIdx];
    const g = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, w.viewScale),
      new THREE.MeshLambertMaterial({ color: w.color }),
    );
    body.position.set(0, 0, -w.viewScale / 2);
    g.add(body);

    // Weapon-specific details
    if (w.name === 'Shotgun') {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6),
        new THREE.MeshLambertMaterial({ color: 0x444444 }),
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.35);
      g.add(barrel);
    }
    if (w.name === 'Sniper') {
      const scope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6),
        new THREE.MeshLambertMaterial({ color: 0x222222 }),
      );
      scope.position.set(0, 0.06, -0.15);
      g.add(scope);
    }
    if (w.name === 'RPG') {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8),
        new THREE.MeshLambertMaterial({ color: 0x555555 }),
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0, -0.25);
      g.add(tube);
    }
    if (w.name === 'Flamer') {
      const nozzle = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.15, 6),
        new THREE.MeshLambertMaterial({ color: 0x884422 }),
      );
      nozzle.rotation.x = -Math.PI / 2;
      nozzle.position.set(0, 0, -0.35);
      g.add(nozzle);
    }

    // Grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.04),
      new THREE.MeshLambertMaterial({ color: 0x333333 }),
    );
    grip.position.set(0, -0.08, 0);
    g.add(grip);

    g.position.set(0.3, -0.25, -0.4);
    g.rotation.y = 0.05;
    this.weaponViewModel.add(g);
  }

  /** Fire the current weapon */
  shoot(): void {
    const s = this.stateManager.getMutableState();
    const w = WEAPONS[s.weaponIdx];

    if (s.reloading || s.fireTimer > 0) return;
    // Can only fire owned weapons (pistol always owned)
    if (s.weaponIdx > 0 && !s.ownedWeapons[s.weaponIdx]) return;
    if (s.ammo[s.weaponIdx] <= 0 && s.weaponIdx !== 0) return;

    s.fireTimer = w.rate;
    s.totalShots++;
    if (s.weaponIdx !== 0) s.ammo[s.weaponIdx]--;
    this.audio.playSound(SoundType.Shoot, 0.2);

    // Muzzle flash
    this.muzzleFlash.intensity = 3;
    setTimeout(() => { this.muzzleFlash.intensity = 0; }, CFG.WEAPON_SYS.MUZZLE_FLASH_MS);

    // Recoil
    if (this.weaponViewModel.children[1]) {
      const vm = this.weaponViewModel.children[1];
      vm.position.z += CFG.WEAPON_SYS.RECOIL_AMOUNT;
      setTimeout(() => { vm.position.z = -0.4; }, CFG.WEAPON_SYS.RECOIL_RETURN_MS);
    }

    // Fire pellets
    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const spread = w.spread * (s.inVehicle !== null ? CFG.WEAPON_SYS.VEHICLE_SPREAD_MUL : 1);
      this._dir.set(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        -1,
      ).normalize();
      this._dir.applyQuaternion(this.camera.quaternion);

      this.raycaster.set(this.camera.position, this._dir);
      this.raycaster.far = w.range;

      // Collect alive enemy meshes without allocating arrays
      const enemies = this.enemyAI.getEnemies();
      const enemyMeshes: THREE.Object3D[] = [];
      for (let ei = 0; ei < enemies.length; ei++) {
        if (!enemies[ei].dead) enemyMeshes.push(enemies[ei].mesh);
      }
      const hits = this.raycaster.intersectObjects(enemyMeshes, true);


      if (hits.length > 0) {
        const hitObj = hits[0];
        for (const e of this.enemyAI.getEnemies()) {
          if (e.dead) continue;
          if (e.mesh === hitObj.object || e.mesh === hitObj.object.parent) {
            this.enemyAI.hitEnemy(e, w.dmg);
            break;
          }
        }
      }

      // Bullet tracer
      if (!w.flame) {
        this._start.copy(this.camera.position);
        this._offsetQ.copy(this._offset).applyQuaternion(this.camera.quaternion);
        this._start.add(this._offsetQ);
        if (hits.length > 0) {
          this._end.copy(hits[0].point);
        } else {
          this._end.copy(this.camera.position).addScaledVector(this._dir, w.range);
        }
        this.spawnTracer(this._start, this._end, w.color);
      }

      // Flame particles
      if (w.flame) {
        const dist = 2 + Math.random() * 3;
        const fp = this._end.copy(this.camera.position).addScaledVector(this._dir, dist);
        this.particles.spawn(fp.x, fp.y, fp.z, Math.random() > 0.5 ? 0xff4400 : 0xffaa00, 3);
      }

      // Explosive
      if (w.explosive && hits.length > 0) {
        this.spawnExplosion(hits[0].point);
      }
    }

    // Auto-reload
    if (s.ammo[s.weaponIdx] <= 0 && s.weaponIdx !== 0) {
      this.startReload();
    }
  }

  /** Start weapon reload */
  startReload(): void {
    const s = this.stateManager.getMutableState();
    if (s.reloading || s.weaponIdx === 0) return;
    const w = WEAPONS[s.weaponIdx];
    if (s.ammo[s.weaponIdx] >= w.mag) return;
    s.reloading = true;
    s.reloadTimer = w.reload;
    this.audio.playSound(SoundType.Reload, 0.2);
  }

  /** Switch to a different weapon */
  switchWeapon(idx: number): void {
    const s = this.stateManager.getMutableState();
    if (idx === s.weaponIdx || idx < 0 || idx >= WEAPONS.length) return;
    if (!s.ownedWeapons[idx]) return; // Can't switch to unowned weapon
    s.weaponIdx = idx;
    s.reloading = false;
    s.fireTimer = CFG.WEAPON_SYS.SWITCH_FIRE_TIMER;
    this.updateWeaponModel();
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, color: number): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.1) return;

    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
    const m = new THREE.Mesh(ShootingSystem.tracerGeo, mat);
    m.position.set(
      (start.x + end.x) * 0.5,
      (start.y + end.y) * 0.5,
      (start.z + end.z) * 0.5,
    );
    m.scale.set(1, 1, len);
    m.lookAt(end);
    this.scene.add(m);
    setTimeout(() => {
      mat.dispose();
      this.scene.remove(m);
    }, CFG.WEAPON_SYS.TRACER_LIFE_MS);
  }

  private spawnExplosion(pos: THREE.Vector3): void {
    this.audio.playSound(SoundType.Explosion, 0.5);
    this.particles.spawn(pos.x, pos.y, pos.z, 0xff4400, 20);
    this.particles.spawn(pos.x, pos.y, pos.z, 0xffaa00, 15);

    // Light flash
    const fl = new THREE.PointLight(0xff6600, 5, 20);
    fl.position.copy(pos);
    this.scene.add(fl);
    setTimeout(() => this.scene.remove(fl), 200);

    // Area damage to enemies
    const s = this.stateManager.getMutableState();
    for (const e of this.enemyAI.getEnemies()) {
      if (e.dead) continue;
      const d = Math.sqrt((e.x - pos.x) ** 2 + (e.z - pos.z) ** 2);
      if (d < CFG.WEAPON_SYS.EXPLOSION_RADIUS) {
        e.hp -= CFG.WEAPON_SYS.EXPLOSION_DMG * (1 - d / CFG.WEAPON_SYS.EXPLOSION_RADIUS);
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          e.deathTime = s.time;
          s.kills++;
          s.score += CFG.WEAPON_SYS.EXPLOSION_KILL_SCORE;
        }
      }
    }
  }
}
