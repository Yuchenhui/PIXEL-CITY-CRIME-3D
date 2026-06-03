import { WORLD_SIZE } from '@config/constants';
import type { BuildingData, EnemyEntity, VehicleEntity } from '@game/index';

/**
 * Minimap 2D renderer: draws a top-down view of the game world.
 * Supports zoom levels: 0.5 (close/detail), 1 (default), 2 (wide/overview).
 */
export class MinimapRenderer {
  private ctx: CanvasRenderingContext2D;
  private size = 140;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /**
   * Render the minimap from current world state.
   * @param zoom Zoom level (0.5 = close, 1 = default, 2 = far).
   *             Higher zoom = larger area shown = less detail.
   */
  render(
    buildingGrid: BuildingData[],
    playerX: number,
    playerZ: number,
    enemies: EnemyEntity[],
    vehicles: VehicleEntity[],
    zoom = 1,
  ): void {
    const ctx = this.ctx;
    const s = this.size;

    // Effective world range to display (larger zoom = bigger area)
    const viewRange = (WORLD_SIZE / 2) * zoom;

    // Scale: pixels per world unit
    const scale = s / (viewRange * 2);

    // Clear
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, s, s);

    // Buildings
    ctx.fillStyle = '#555';
    for (const b of buildingGrid) {
      const bx = (b.x - playerX) * scale + s / 2;
      const bz = (b.z - playerZ) * scale + s / 2;
      const bw = b.hw * 2 * scale;
      const bd = b.hd * 2 * scale;
      // Cull off-screen buildings
      if (bx + bw < 0 || bx > s || bz + bd < 0 || bz > s) continue;
      ctx.fillRect(bx - bw / 2, bz - bd / 2, bw, bd);
    }

    // Player (always centered)
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(s / 2 - 2, s / 2 - 2, 4, 4);

    // Enemies
    for (const e of enemies) {
      if (e.dead) continue;
      const ex = (e.x - playerX) * scale + s / 2;
      const ez = (e.z - playerZ) * scale + s / 2;
      if (ex < 0 || ex > s || ez < 0 || ez > s) continue;
      ctx.fillStyle = e.type === 'civilian' ? '#888' : e.type === 'police' ? '#4444ff' : '#ff4444';
      ctx.fillRect(ex - 1, ez - 1, 2, 2);
    }

    // Vehicles
    ctx.fillStyle = '#ffff44';
    for (const v of vehicles) {
      if (v.hp <= 0) continue;
      const vx = (v.x - playerX) * scale + s / 2;
      const vz = (v.z - playerZ) * scale + s / 2;
      if (vx < 0 || vx > s || vz < 0 || vz > s) continue;
      ctx.fillRect(vx - 1, vz - 1, 3, 3);
    }

    // Zoom level label
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${zoom}x`, 4, 12);
  }
}
