import * as THREE from 'three';
import { CFG, WORLD_SIZE } from '@config/constants';
import { randomRange, randomInt, randomPick } from '@utils/math';
import type { BuildingData } from '@game/index';

const BUILD_COLORS = [0x6a5040, 0x5a6070, 0x7a6050, 0x505a6a, 0x6a5a50, 0x706a5a, 0x8a7060, 0x607080];

// Number of spatial chunks per axis for frustum culling
const CHUNKS_PER_AXIS = 4;

/**
 * Building generation: spatially-chunked InstancedMesh for proper frustum culling.
 * Instead of one giant InstancedMesh covering the whole world, buildings are split
 * into a grid of smaller InstancedMeshes. Three.js can cull chunks outside the camera view.
 */
export class BuildingSystem {
  private buildingGrid: BuildingData[] = [];
  private chunkMeshes: THREE.InstancedMesh[] = [];

  /** Generate buildings into the given Three.js group. Returns collision data. */
  generate(group: THREE.Group): BuildingData[] {
    const BS = CFG.BLOCK_SIZE;
    const RW = CFG.ROAD_W;
    const CELL = BS + RW;
    const halfMap = CFG.MAP_BLOCKS * CELL / 2;

    // Step 1: Generate all building data into per-chunk buckets
    const chunkCount = CHUNKS_PER_AXIS * CHUNKS_PER_AXIS;
    const chunkSize = WORLD_SIZE / CHUNKS_PER_AXIS;
    const chunkData: { px: number; pz: number; w: number; h: number; d: number; color: THREE.Color }[][] =
      Array.from({ length: chunkCount }, () => []);

    this.buildingGrid = [];

    for (let bx = 0; bx < CFG.MAP_BLOCKS; bx++) {
      for (let bz = 0; bz < CFG.MAP_BLOCKS; bz++) {
        const cx = bx * CELL - halfMap + RW / 2;
        const cz = bz * CELL - halfMap + RW / 2;
        const numB = randomInt(1, 3);

        for (let b = 0; b < numB; b++) {
          const w = randomRange(4, 12);
          const d = randomRange(4, 12);
          const h = randomRange(CFG.BUILD_MIN_H, CFG.BUILD_MAX_H);
          const ox = Math.random() * (BS - w);
          const oz = Math.random() * (BS - d);
          const px = cx + ox + w / 2;
          const pz = cz + oz + d / 2;

          // Collision data
          this.buildingGrid.push({
            x: px, z: pz,
            hw: w / 2 + CFG.PLAYER_R,
            hd: d / 2 + CFG.PLAYER_R,
            h,
          });

          // Determine which chunk this building belongs to
          const chunkX = Math.min(CHUNKS_PER_AXIS - 1, Math.max(0, Math.floor((px + halfMap) / chunkSize)));
          const chunkZ = Math.min(CHUNKS_PER_AXIS - 1, Math.max(0, Math.floor((pz + halfMap) / chunkSize)));
          const chunkIdx = chunkX * CHUNKS_PER_AXIS + chunkZ;

          chunkData[chunkIdx].push({ px, pz, w, h, d, color: new THREE.Color(randomPick(BUILD_COLORS)) });
        }
      }
    }

    // Step 2: Create an InstancedMesh per chunk
    const buildGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const dummy = new THREE.Object3D();

    for (let ci = 0; ci < chunkCount; ci++) {
      const buildings = chunkData[ci];
      if (buildings.length === 0) continue;

      const mesh = new THREE.InstancedMesh(buildGeo, buildMat, buildings.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const colAttr = new Float32Array(buildings.length * 3);

      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        dummy.position.set(b.px, b.h / 2, b.pz);
        dummy.scale.set(b.w, b.h, b.d);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        colAttr[i * 3] = b.color.r;
        colAttr[i * 3 + 1] = b.color.g;
        colAttr[i * 3 + 2] = b.color.b;
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colAttr, 3);

      // Compute tight bounding sphere for this chunk (enables frustum culling)
      mesh.computeBoundingSphere();

      group.add(mesh);
      this.chunkMeshes.push(mesh);
    }

    return this.buildingGrid;
  }

  /** Get collision grid data */
  getBuildingGrid(): BuildingData[] {
    return this.buildingGrid;
  }

  /** Clear and dispose resources */
  dispose(): void {
    for (const m of this.chunkMeshes) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.chunkMeshes = [];
    this.buildingGrid = [];
  }
}
