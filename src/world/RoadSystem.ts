import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CFG, WORLD_SIZE } from '@config/constants';

// Number of spatial chunks per axis for frustum culling
const ROAD_CHUNKS = 2;

/**
 * Road generation: spatially-chunked merged geometries for frustum culling.
 * Roads are segmented per-chunk so each merged mesh has a tight bounding sphere.
 */
export class RoadSystem {
  private meshes: THREE.Mesh[] = [];

  /** Generate roads, lane markings, and sidewalks using chunked merged geometry */
  generate(group: THREE.Group): void {
    const BS = CFG.BLOCK_SIZE;
    const RW = CFG.ROAD_W;
    const CELL = BS + RW;
    const halfMap = CFG.MAP_BLOCKS * CELL / 2;
    const chunkCount = ROAD_CHUNKS * ROAD_CHUNKS;
    const chunkSize = WORLD_SIZE / ROAD_CHUNKS;

    // Per-chunk geometry collectors
    const roadGeos: THREE.BufferGeometry[][] = Array.from({ length: chunkCount }, () => []);
    const lineGeos: THREE.BufferGeometry[][] = Array.from({ length: chunkCount }, () => []);
    const swGeos: THREE.BufferGeometry[][] = Array.from({ length: chunkCount }, () => []);

    // Helper: determine chunk index from world position
    const chunkOf = (x: number, z: number): number => {
      const cx = Math.min(ROAD_CHUNKS - 1, Math.max(0, Math.floor((x + halfMap) / chunkSize)));
      const cz = Math.min(ROAD_CHUNKS - 1, Math.max(0, Math.floor((z + halfMap) / chunkSize)));
      return cx * ROAD_CHUNKS + cz;
    };

    // Roads — segmented per chunk for tight bounding spheres
    for (let i = 0; i <= CFG.MAP_BLOCKS; i++) {
      const pos = i * CELL - halfMap;

      // Horizontal road: split into segments along X axis, one per chunk column
      for (let cxi = 0; cxi < ROAD_CHUNKS; cxi++) {
        const segLen = chunkSize;
        const segCenterX = -halfMap + cxi * chunkSize + chunkSize / 2;
        const hrGeo = new THREE.PlaneGeometry(segLen, RW);
        hrGeo.rotateX(-Math.PI / 2);
        hrGeo.translate(segCenterX, 0.05, pos);
        roadGeos[chunkOf(segCenterX, pos)].push(hrGeo);
      }

      // Vertical road: split into segments along Z axis, one per chunk row
      for (let czi = 0; czi < ROAD_CHUNKS; czi++) {
        const segLen = chunkSize;
        const segCenterZ = -halfMap + czi * chunkSize + chunkSize / 2;
        const vrGeo = new THREE.PlaneGeometry(RW, segLen);
        vrGeo.rotateX(-Math.PI / 2);
        vrGeo.translate(pos, 0.05, segCenterZ);
        roadGeos[chunkOf(pos, segCenterZ)].push(vrGeo);
      }

      // Lane markings — already small, just assign to correct chunk
      for (let j = -halfMap; j < halfMap; j += 6) {
        const ci1 = chunkOf(pos, j);
        const lm = new THREE.PlaneGeometry(0.3, 2);
        lm.rotateX(-Math.PI / 2);
        lm.translate(pos, 0.07, j);
        lineGeos[ci1].push(lm);

        const ci2 = chunkOf(j, pos);
        const lm2 = new THREE.PlaneGeometry(2, 0.3);
        lm2.rotateX(-Math.PI / 2);
        lm2.translate(j, 0.07, pos);
        lineGeos[ci2].push(lm2);
      }
    }

    // Sidewalks
    for (let bx = 0; bx < CFG.MAP_BLOCKS; bx++) {
      for (let bz = 0; bz < CFG.MAP_BLOCKS; bz++) {
        const cx = bx * CELL - halfMap + RW / 2;
        const cz = bz * CELL - halfMap + RW / 2;
        const sw = new THREE.PlaneGeometry(BS, BS);
        sw.rotateX(-Math.PI / 2);
        sw.translate(cx + BS / 2, 0.10, cz + BS / 2);
        swGeos[chunkOf(cx + BS / 2, cz + BS / 2)].push(sw);
      }
    }

    // Materials
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const swMat = new THREE.MeshLambertMaterial({ color: 0x999988, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

    // Merge and create meshes per chunk
    for (let ci = 0; ci < chunkCount; ci++) {
      this.mergeAndAdd(roadGeos[ci], roadMat, group, true);
      this.mergeAndAdd(lineGeos[ci], lineMat, group, false);
      this.mergeAndAdd(swGeos[ci], swMat, group, true);
    }
  }

  private mergeAndAdd(
    geos: THREE.BufferGeometry[],
    mat: THREE.Material,
    group: THREE.Group,
    receiveShadow: boolean,
  ): void {
    if (geos.length === 0) return;
    const merged = mergeGeometries(geos);
    if (!merged) return;

    const mesh = new THREE.Mesh(merged, mat);
    mesh.receiveShadow = receiveShadow;
    // Compute tight bounding sphere for accurate frustum culling
    mesh.geometry.computeBoundingSphere();
    group.add(mesh);
    this.meshes.push(mesh);

    // Dispose source geometries
    for (const g of geos) g.dispose();
  }

  /** Dispose all road meshes */
  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
    this.meshes = [];
  }
}
