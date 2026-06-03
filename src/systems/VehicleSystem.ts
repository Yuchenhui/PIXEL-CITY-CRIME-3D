import * as THREE from 'three';
import { CFG } from '@config/constants';
import { VEHICLE_TYPES } from '@config/vehicles';
import { SoundType, type VehicleEntity } from '@game/index';
import { AudioManager } from '@core/AudioManager';
import { StateManager } from '@core/StateManager';
import { PhysicsManager } from '@core/PhysicsManager';
import { ParticleManager } from './ParticleManager';
import { EnemyAI } from './EnemyAI';
import { distance2D } from '@utils/math';
import { CombatLog } from '@ui/CombatLog';
import { InputManager } from '@core/InputManager';

/**
 * Vehicle system: spawn, enter/exit, driving physics, third-person camera, run-over.
 */
export class VehicleSystem {
  private vehicles: VehicleEntity[] = [];
  private vehicleGroup: THREE.Group;

  // Pre-allocated temp vector for camera lerp
  private _camTarget = new THREE.Vector3();

  // Car interior viewmodel (created once, repositioned each frame)
  private interiorGroup: THREE.Group;
  private interiorYaw = 0;
  private interiorPitch = 0;

  // Shared wheel geometry/material (all vehicles use same wheels)
  private static wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
  private static wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  private static hlMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });

  constructor(
    vehicleGroup: THREE.Group,
    private engine_camera: THREE.PerspectiveCamera,
    private audio: AudioManager,
    private stateManager: StateManager,
    private physics: PhysicsManager,
    private particles: ParticleManager,
    private enemyAI: EnemyAI,
    private combatLog: CombatLog,
    private input: InputManager,
  ) {
    this.vehicleGroup = vehicleGroup;
    this.interiorGroup = this.createInterior();
  }

  /** Create a 3D vehicle mesh */
  private createMesh(type: typeof VEHICLE_TYPES[number]): THREE.Group {
    const g = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(type.w, type.h * 0.6, type.l),
      new THREE.MeshLambertMaterial({ color: type.color }),
    );
    body.position.y = type.h * 0.4;
    body.castShadow = true;
    g.add(body);

    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(type.w * 0.8, type.h * 0.35, type.l * 0.5),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(type.color).multiplyScalar(0.8) }),
    );
    roof.position.y = type.h * 0.75;
    roof.castShadow = false;
    g.add(roof);

    // Wheels (shared geometry/material)
    const positions: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [sx, sz] of positions) {
      const w = new THREE.Mesh(VehicleSystem.wheelGeo, VehicleSystem.wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * type.w / 2, 0.3, sz * type.l * 0.35);
      w.castShadow = false;
      g.add(w);
    }

    // Headlights (shared material)
    for (const hx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), VehicleSystem.hlMat);
      hl.position.set(hx, type.h * 0.35, type.l / 2);
      hl.castShadow = false;
      g.add(hl);
    }

    // Police lights
    if (type.name === 'Police') {
      const pl = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.15, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xff0000 }),
      );
      pl.position.y = type.h * 0.95;
      pl.castShadow = false;
      g.add(pl);
    }

    return g;
  }

  /** Spawn vehicles across the map */
  spawnVehicles(count: number): void {
    const CELL = CFG.BLOCK_SIZE + CFG.ROAD_W;
    const halfMap = CFG.MAP_BLOCKS * CELL / 2;

    for (let i = 0; i < count; i++) {
      const bx = Math.floor(Math.random() * CFG.MAP_BLOCKS);
      const bz = Math.floor(Math.random() * CFG.MAP_BLOCKS);
      const vx = bx * CELL - halfMap + CFG.ROAD_W / 2 + Math.random() * CFG.ROAD_W;
      const vz = bz * CELL - halfMap + Math.random() * CELL;
      const vt = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
      this.createVehicle(vx, vz, vt, Math.random() * Math.PI * 2);
    }
  }

  private createVehicle(x: number, z: number, type: typeof VEHICLE_TYPES[number], angle: number): void {
    const g = this.createMesh(type);
    g.position.set(x, 0, z);
    g.rotation.y = angle;
    this.vehicleGroup.add(g);
    this.vehicles.push({
      mesh: g, type, x, z, angle,
      speed: 0, hp: type.hp, maxHp: type.hp,
    });
  }

  /** Get all vehicles */
  getVehicles(): VehicleEntity[] {
    return this.vehicles;
  }

  /** Check if player is near any vehicle (for hint display) */
  isNearVehicle(playerX: number, playerZ: number): boolean {
    for (const v of this.vehicles) {
      if (v.hp <= 0) continue;
      if (distance2D(playerX, playerZ, v.x, v.z) < CFG.VEHICLE.NEAR_DIST) return true;
    }
    return false;
  }

  /** Try to enter the nearest vehicle. Returns true if successful. */
  tryEnter(playerX: number, playerZ: number): boolean {
    let best = -1;
    let bestD: number = CFG.VEHICLE.ENTER_DIST;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.hp <= 0) continue;
      const d = distance2D(playerX, playerZ, v.x, v.z);
      if (d < bestD) { bestD = d; best = i; }
    }

    if (best >= 0) {
      this.engine_camera.fov = CFG.RENDER.CAMERA_FOV_VEHICLE;
      this.engine_camera.fov = CFG.RENDER.CAMERA_FOV;
      this.engine_camera.updateProjectionMatrix();
      this.interiorYaw = 0;
      this.interiorPitch = 0;
      // Attach interior to camera so it follows automatically
      if (this.interiorGroup.parent !== this.engine_camera) {
        this.engine_camera.add(this.interiorGroup);
      }
      this.interiorGroup.visible = true;
      this.audio.playSound(SoundType.Pickup, 0.2);
      return true;
    }
    return false;
  }

  /** Exit the current vehicle */
  exit(): void {
    const s = this.stateManager.getMutableState();
    if (s.inVehicle === null) return;

    const v = this.vehicles[s.inVehicle];
    let exitX = v.x + Math.cos(v.angle + Math.PI / 2) * CFG.VEHICLE.EXIT_OFFSET;
    let exitZ = v.z + Math.sin(v.angle + Math.PI / 2) * CFG.VEHICLE.EXIT_OFFSET;

    // Fallback to other side if blocked
    if (this.physics.checkBuildingCollision(exitX, exitZ, CFG.PLAYER_R)) {
      exitX = v.x - Math.cos(v.angle + Math.PI / 2) * CFG.VEHICLE.EXIT_OFFSET;
      exitZ = v.z - Math.sin(v.angle + Math.PI / 2) * CFG.VEHICLE.EXIT_OFFSET;
    }

    this.engine_camera.position.set(exitX, CFG.PLAYER_H, exitZ);
    this.engine_camera.fov = CFG.RENDER.CAMERA_FOV;
    this.engine_camera.rotation.set(0, 0, 0);
    this.engine_camera.updateProjectionMatrix();
    this.interiorGroup.visible = false;
    s.inVehicle = null;
  }

  /** Update vehicle driving (called when inVehicle is not null) */
  updateDriving(
    dt: number,
    keys: Record<string, boolean>,
    mouseDown: boolean,
    fireTimer: number,
    shootFn: () => void,
  ): void {
    const s = this.stateManager.getMutableState();
    const v = this.vehicles[s.inVehicle!];

    if (!v || v.hp <= 0) {
      s.inVehicle = null;
      this.engine_camera.fov = CFG.RENDER.CAMERA_FOV;
      this.engine_camera.updateProjectionMatrix();
      this.interiorGroup.visible = false;
      return;
    }

    let accel = 0;
    let steer = 0;
    if (keys['KeyW']) accel = 1;
    if (keys['KeyS']) accel = -0.5;
    if (keys['KeyA']) steer = -1;
    if (keys['KeyD']) steer = 1;
    if (keys['Space']) v.speed *= CFG.VEHICLE.BRAKE_DECEL;

    if (accel) v.speed += accel * v.type.acc * dt;
    else v.speed *= CFG.VEHICLE.COAST_DECEL;
    v.speed = Math.max(-v.type.maxSpd * 0.3, Math.min(v.type.maxSpd, v.speed));
    if (Math.abs(v.speed) < CFG.VEHICLE.MIN_SPEED) v.speed = 0;

    const sf = Math.min(1, Math.abs(v.speed) / CFG.VEHICLE.STEER_SPEED_THRESH);
    v.angle += steer * v.type.turn * sf * dt * (v.speed > 0 ? 1 : -1);

    const nx = v.x + Math.sin(v.angle) * v.speed * dt;
    const nz = v.z + Math.cos(v.angle) * v.speed * dt;
    const collisionRadius = Math.max(v.type.w, v.type.l) / 2;
    if (!this.physics.checkBuildingCollision(nx, nz, collisionRadius)) {
      v.x = nx;
      v.z = nz;
    } else {
      // Building collision: heavy speed reduction + particle burst
      if (Math.abs(v.speed) > CFG.VEHICLE.BUILDING_CRASH_PARTICLE_THRESH) {
        this.particles.spawn(nx, 0.5, nz, 0x888888, 4);
        this.audio.playSound(SoundType.Hit, 0.3);
      }
      v.speed *= CFG.VEHICLE.BUILDING_CRASH_DECEL;
    }

    v.mesh.position.set(v.x, 0, v.z);
    v.mesh.rotation.y = v.angle;

    // First-person interior camera
    this.updateInteriorView(v, dt);

    // Run over enemies
    for (const e of this.enemyAI.getEnemies()) {
      if (e.dead) continue;
      if (distance2D(v.x, v.z, e.x, e.z) < CFG.VEHICLE.RUNOVER_DIST && Math.abs(v.speed) > CFG.VEHICLE.RUNOVER_SPEED_THRESH) {
        e.hp -= Math.abs(v.speed) * CFG.VEHICLE.RUNOVER_DMG_MUL;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          e.deathTime = s.time;
          s.kills++;
          s.score += CFG.VEHICLE.RUNOVER_SCORE;
          this.combatLog.logVehicleRunOver();
          this.combatLog.logKill(e.type);
          if (e.type === 'civilian') {
            s.wanted = Math.min(CFG.GAME.MAX_WANTED, s.wanted + 2);
            s.wantedTimer = CFG.GAME.WANTED_DECAY_TIMER;
          }
        }
        this.particles.spawn(e.x, 1, e.z, 0xaa1111, 5);
      }
    }

    // Shoot from vehicle
    if (mouseDown && fireTimer <= 0) {
      shootFn();
    }
    // Vehicle-to-vehicle collision
    this.resolveVehicleCollisions(v);
  }

  /** Create car interior viewmodel (dashboard, steering wheel, pillars) */
  private createInterior(): THREE.Group {
    const g = new THREE.Group();
    const dashMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    // Dashboard
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.4), dashMat);
    dash.position.set(0, -0.3, -0.7);
    g.add(dash);

    // Steering wheel (torus-like using ring)
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.02, 6, 12),
      frameMat,
    );
    wheel.position.set(-0.3, -0.15, -0.55);
    wheel.rotation.x = -0.5;
    g.add(wheel);

    // A-pillars (left and right)
    const pillarGeo = new THREE.BoxGeometry(0.06, 0.8, 0.06);
    const lp = new THREE.Mesh(pillarGeo, frameMat);
    lp.position.set(-0.85, 0.1, -0.5);
    lp.rotation.z = 0.15;
    g.add(lp);
    const rp = new THREE.Mesh(pillarGeo, frameMat);
    rp.position.set(0.85, 0.1, -0.5);
    rp.rotation.z = -0.15;
    g.add(rp);

    // Rearview mirror
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.06, 0.04),
      new THREE.MeshLambertMaterial({ color: 0x555555 }),
    );
    mirror.position.set(0, 0.35, -0.6);
    g.add(mirror);

    g.visible = false;
    return g;
  }

  /** Update interior view: first-person camera + mouse look */
  private updateInteriorView(v: VehicleEntity, dt: number): void {
    // Consume mouse input for look-around
    const { dx, dy } = this.input.consumeMouseDelta();
    this.interiorYaw -= dx * CFG.MOUSE_SENS;
    this.interiorPitch -= dy * CFG.MOUSE_SENS;
    this.interiorYaw = Math.max(-CFG.VEHICLE.INTERIOR_YAW_LIMIT, Math.min(CFG.VEHICLE.INTERIOR_YAW_LIMIT, this.interiorYaw));
    this.interiorPitch = Math.max(-CFG.VEHICLE.INTERIOR_PITCH_DOWN, Math.min(CFG.VEHICLE.INTERIOR_PITCH_UP, this.interiorPitch));

    // Position camera at driver seat (world space)
    const sin = Math.sin(v.angle);
    const cos = Math.cos(v.angle);
    const driverX = v.x + sin * 0.3 - cos * 0.4;
    const driverZ = v.z + cos * 0.3 + sin * 0.4;
    this.engine_camera.position.set(driverX, v.type.h * 0.65, driverZ);

    // Camera rotation: vehicle direction + mouse look offset
    this.engine_camera.rotation.order = 'YXZ';
    this.engine_camera.rotation.set(
      this.interiorPitch,
      v.angle + this.interiorYaw,
      0,
    );

    // Interior is a child of camera — auto-follows, just keep it visible
    this.interiorGroup.visible = true;
    this.interiorGroup.position.set(0, 0, 0);
    this.interiorGroup.rotation.set(0, 0, 0);
  }
  /** Clear all vehicles */

  /**
   * Check and resolve collision between the given vehicle and all other vehicles.
   * Uses circle-based collision with combined radii.
   */
  private resolveVehicleCollisions(moving: VehicleEntity): void {
    const movingRadius = Math.max(moving.type.w, moving.type.l) / 2;
    for (const other of this.vehicles) {
      if (other === moving || other.hp <= 0) continue;
      const otherRadius = Math.max(other.type.w, other.type.l) / 2;
      const minDist = movingRadius + otherRadius;
      const dx = moving.x - other.x;
      const dz = moving.z - other.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDist && dist > 0.01) {
        // Push vehicles apart to resolve overlap
        const overlap = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        moving.x += nx * overlap * CFG.VEHICLE.COLLISION_PUSH_SELF;
        moving.z += nz * overlap * CFG.VEHICLE.COLLISION_PUSH_SELF;
        other.x -= nx * overlap * CFG.VEHICLE.COLLISION_PUSH_OTHER;
        other.z -= nz * overlap * CFG.VEHICLE.COLLISION_PUSH_OTHER;

        // Momentum transfer: moving vehicle transfers speed to the other
        const relSpeed = moving.speed;
        moving.speed *= CFG.VEHICLE.COLLISION_SPEED_RETAIN;
        if (Math.abs(relSpeed) > CFG.VEHICLE.COLLISION_PARTICLE_THRESH) {
          const cx = (moving.x + other.x) / 2;
          const cz = (moving.z + other.z) / 2;
          this.particles.spawn(cx, 0.5, cz, 0xaaaaaa, 4);
          this.audio.playSound(SoundType.Hit, 0.2);
        }

        // Sync mesh positions
        moving.mesh.position.set(moving.x, 0, moving.z);
        other.mesh.position.set(other.x, 0, other.z);

        // Damage both vehicles on high-speed impact
        if (Math.abs(relSpeed) > CFG.VEHICLE.COLLISION_DMG_SPEED_THRESH) {
          const dmg = Math.abs(relSpeed) * CFG.VEHICLE.COLLISION_DMG_MUL;
          moving.hp = Math.max(0, moving.hp - dmg);
          other.hp = Math.max(0, other.hp - dmg);
        }
      }
    }
  }
  clear(): void {
    for (const v of this.vehicles) {
      this.vehicleGroup.remove(v.mesh);
    }
    this.vehicles = [];
    this.interiorGroup.visible = false;
  }
}
