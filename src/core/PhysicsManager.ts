import * as CANNON from 'cannon-es';
import type { BuildingData } from '@game/index';
import { GRID_RES, WORLD_SIZE } from '@config/constants';

/**
 * Spatial hash cell for O(1) collision lookup.
 */
interface SpatialCell {
  buildings: BuildingData[];
}

/**
 * Cannon-es physics world manager: handles rigid bodies, collision, and stepping.
 * Uses spatial hashing for fast building collision queries.
 */
export class PhysicsManager {
  world: CANNON.World;

  /** Player body (kinematic, controlled manually) */
  playerBody: CANNON.Body;

  /** Static building bodies for collision */
  private buildingBodies: CANNON.Body[] = [];

  /** Spatial hash grid for O(1) collision lookups */
  private spatialGrid: Map<number, SpatialCell> = new Map();
  private gridW = 0;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -25, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    // Player kinematic body
    this.playerBody = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Sphere(0.4),
      position: new CANNON.Vec3(0, 1.7, 5),
      collisionFilterGroup: 1,
      collisionFilterMask: 1,
    });
    this.world.addBody(this.playerBody);
  }

  /** Build spatial hash grid from building data */
  private buildSpatialGrid(buildings: BuildingData[]): void {
    this.spatialGrid.clear();
    this.gridW = Math.ceil(WORLD_SIZE * 2 / GRID_RES) + 1;
    const halfWorld = WORLD_SIZE;

    for (const b of buildings) {
      // Insert building into all grid cells it overlaps
      const minX = Math.floor((b.x - b.hw + halfWorld) / GRID_RES);
      const maxX = Math.floor((b.x + b.hw + halfWorld) / GRID_RES);
      const minZ = Math.floor((b.z - b.hd + halfWorld) / GRID_RES);
      const maxZ = Math.floor((b.z + b.hd + halfWorld) / GRID_RES);

      for (let gx = minX; gx <= maxX; gx++) {
        for (let gz = minZ; gz <= maxZ; gz++) {
          const key = gx * this.gridW + gz;
          let cell = this.spatialGrid.get(key);
          if (!cell) {
            cell = { buildings: [] };
            this.spatialGrid.set(key, cell);
          }
          cell.buildings.push(b);
        }
      }
    }
  }

  /** Build static rigid bodies from building collision data */
  buildFromBuildingGrid(buildings: BuildingData[]): void {
    // Remove old building bodies
    for (const body of this.buildingBodies) {
      this.world.removeBody(body);
    }
    this.buildingBodies = [];

    // Build spatial hash for fast queries
    this.buildSpatialGrid(buildings);

    // Only create cannon bodies for a subset of buildings near the player
    // (cannon-es handles detailed physics; spatial grid handles fast queries)
    // For now, skip individual building bodies since we use spatial grid for collision
  }

  /** Add a ground plane */
  addGroundPlane(): void {
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
  }

  /** Step the physics world */
  step(dt: number): void {
    this.world.step(1 / 60, dt, 3);
  }

  /** Update player body position from external coordinates */
  setPlayerPosition(x: number, y: number, z: number): void {
    this.playerBody.position.set(x, y, z);
  }

  /** Get player body position */
  getPlayerPosition(): { x: number; y: number; z: number } {
    return {
      x: this.playerBody.position.x,
      y: this.playerBody.position.y,
      z: this.playerBody.position.z,
    };
  }

  /**
   * Check if a sphere at (x,z) with radius r collides with any building.
   * Uses spatial hash for O(1) lookup instead of O(n) scan.
   */
  checkBuildingCollision(x: number, z: number, r: number): boolean {
    const halfWorld = WORLD_SIZE;
    const gx = Math.floor((x + halfWorld) / GRID_RES);
    const gz = Math.floor((z + halfWorld) / GRID_RES);
    const key = gx * this.gridW + gz;
    const cell = this.spatialGrid.get(key);

    if (!cell) return false;

    for (const b of cell.buildings) {
      if (Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if there is a clear line of sight between two XZ points.
   * Samples along the line and checks each point against the spatial grid.
   * Returns false if any building blocks the path.
   */
  hasLineOfSight(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < 4) return true; // Very close, always visible

    const dist = Math.sqrt(distSq);
    // Step size matches grid resolution for reliable detection
    const step = GRID_RES * 0.8;
    const steps = Math.ceil(dist / step);

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = fromX + dx * t;
      const sz = fromZ + dz * t;

      if (this.checkBuildingCollision(sx, sz, 0.3)) {
        return false;
      }
    }
    return true;
  }

  /** Clear all building bodies */
  clearBuildings(): void {
    for (const body of this.buildingBodies) {
      this.world.removeBody(body);
    }
    this.buildingBodies = [];
    this.spatialGrid.clear();
  }
}
