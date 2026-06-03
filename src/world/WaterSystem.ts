import * as THREE from 'three';
import { CFG, WORLD_SIZE } from '@config/constants';

/**
 * Water system: boundary water planes at the map edges.
 */
export class WaterSystem {
  private meshes: THREE.Mesh[] = [];

  /** Generate water border planes */
  generate(group: THREE.Group): void {
    const halfMap = CFG.MAP_BLOCKS * (CFG.BLOCK_SIZE + CFG.ROAD_W) / 2;
    const waterSize = CFG.WATER.BORDER_WIDTH;
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x1a4a8a,
      transparent: true,
      opacity: 0.7,
    });

    const edges: [number, number][] = [
      [-halfMap - waterSize / 2, 0],
      [halfMap + waterSize / 2, 0],
      [0, -halfMap - waterSize / 2],
      [0, halfMap + waterSize / 2],
    ];

    for (const [wx, wz] of edges) {
      const isX = wx !== 0;
      const w = new THREE.Mesh(
        new THREE.PlaneGeometry(
          isX ? waterSize : WORLD_SIZE + CFG.WATER.BORDER_EXTEND,
          isX ? WORLD_SIZE + CFG.WATER.BORDER_EXTEND : waterSize,
        ),
        waterMat,
      );
      w.rotation.x = -Math.PI / 2;
      w.position.set(wx, -0.5, wz);
      group.add(w);
      this.meshes.push(w);
    }
  }

  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
    this.meshes = [];
  }
}
