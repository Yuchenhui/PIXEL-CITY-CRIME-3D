import * as THREE from 'three';
import { CFG, WORLD_SIZE } from '@config/constants';
import type { BuildingData } from '@game/index';

/**
 * Vegetation: tree generation using InstancedMesh for minimal draw calls.
 */
export class VegetationSystem {
  private trunkMesh: THREE.InstancedMesh | null = null;
  private leafMesh: THREE.InstancedMesh | null = null;

  /** Generate trees using InstancedMesh (2 draw calls total) */
  generate(group: THREE.Group, buildingGrid: BuildingData[]): void {
    const halfMap = CFG.MAP_BLOCKS * (CFG.BLOCK_SIZE + CFG.ROAD_W) / 2;

    // Shared geometry and materials (created once)
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
    const leafGeo = new THREE.SphereGeometry(1.5, 6, 5);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2a8a1a });

    const maxTrees = CFG.TREE_COUNT;
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, maxTrees);
    this.leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, maxTrees);
    this.trunkMesh.castShadow = true;
    this.leafMesh.castShadow = false; // Trees don't need shadow for perf

    const dummy = new THREE.Object3D();
    let count = 0;

    for (let i = 0; i < maxTrees; i++) {
      const tx = Math.random() * WORLD_SIZE - halfMap;
      const tz = Math.random() * WORLD_SIZE - halfMap;

      if (!this.collidesWithBuilding(tx, tz, 1, buildingGrid)) {
        // Trunk
        dummy.position.set(tx, 1, tz);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.trunkMesh.setMatrixAt(count, dummy.matrix);

        // Leaves
        dummy.position.set(tx, 3, tz);
        dummy.updateMatrix();
        this.leafMesh.setMatrixAt(count, dummy.matrix);

        count++;
      }
    }

    this.trunkMesh.count = count;
    this.leafMesh.count = count;
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.leafMesh.instanceMatrix.needsUpdate = true;

    group.add(this.trunkMesh);
    group.add(this.leafMesh);
  }

  private collidesWithBuilding(x: number, z: number, r: number, grid: BuildingData[]): boolean {
    for (const b of grid) {
      if (Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) return true;
    }
    return false;
  }

  dispose(): void {
    if (this.trunkMesh) {
      this.trunkMesh.geometry.dispose();
      (this.trunkMesh.material as THREE.Material).dispose();
      this.trunkMesh = null;
    }
    if (this.leafMesh) {
      this.leafMesh.geometry.dispose();
      (this.leafMesh.material as THREE.Material).dispose();
      this.leafMesh = null;
    }
  }
}
