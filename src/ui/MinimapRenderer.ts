import { WORLD_SIZE } from '@config/constants';
import type { BuildingData, EnemyEntity, VehicleEntity } from '@game/index';

/**
 * Minimap 2D renderer: draws a top-down view of the game world.
 */
export class MinimapRenderer {
  private ctx: CanvasRenderingContext2D;
  private size = 140;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** Render the minimap from current world state */
  render(
    buildingGrid: BuildingData[],
    playerX: number,
    playerZ: number,
    enemies: EnemyEntity[],
    vehicles: VehicleEntity[],
  ): void {
    const ctx = this.ctx;
    const s = this.size;
    const scale = s / WORLD_SIZE;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, s, s);

    // Buildings
    ctx.fillStyle = '#555';
    for (const b of buildingGrid) {
      const bx = (b.x + WORLD_SIZE / 2) * scale;
      const bz = (b.z + WORLD_SIZE / 2) * scale;
      ctx.fillRect(bx - b.hw * scale, bz - b.hd * scale, b.hw * 2 * scale, b.hd * 2 * scale);
    }

    // Player
    ctx.fillStyle = '#44ff44';
    const px = (playerX + WORLD_SIZE / 2) * scale;
    const pz = (playerZ + WORLD_SIZE / 2) * scale;
    ctx.fillRect(px - 2, pz - 2, 4, 4);

    // Enemies
    for (const e of enemies) {
      if (e.dead) continue;
      ctx.fillStyle = e.type === 'civilian' ? '#888' : e.type === 'police' ? '#4444ff' : '#ff4444';
      ctx.fillRect(
        (e.x + WORLD_SIZE / 2) * scale - 1,
        (e.z + WORLD_SIZE / 2) * scale - 1,
        2, 2,
      );
    }

    // Vehicles
    ctx.fillStyle = '#ffff44';
    for (const v of vehicles) {
      if (v.hp <= 0) continue;
      ctx.fillRect(
        (v.x + WORLD_SIZE / 2) * scale - 1,
        (v.z + WORLD_SIZE / 2) * scale - 1,
        3, 3,
      );
    }
  }
}
