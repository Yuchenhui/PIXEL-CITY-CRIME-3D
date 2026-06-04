/**
 * 九龙城寨 (Kowloon Walled City) district generator.
 *
 * Creates a dense cluster of tightly-packed buildings with narrow alleys,
 * overhanging structures, and interconnected pathways. The district is
 * positioned near the world centre and excluded from normal generation.
 *
 * Unlike the regular BuildingSystem (which uses InstancedMesh chunks),
 * Kowloon buildings are individual meshes because they need varied
 * materials (red facade for Triad HQ, neon for nightclub, etc.) and
 * overhanging geometry that InstancedMesh cannot express.
 */
import * as THREE from 'three';
import { CFG } from '@config/constants';
import { randomRange, randomInt, randomPick } from '@utils/math';
import type { BuildingData } from '@game/index';
import { KOWLOON_CENTRE_X, KOWLOON_CENTRE_Z, KOWLOON_RADIUS } from './StoryLocations';
import { getRandomBuildingMaterial, createKowloonMaterial } from './TextureManager';

// ========== Kowloon-specific constants ==========

/** Dark, grimy colour palette for Kowloon buildings */
const KOWLOON_COLORS = [
  0x3a3530, 0x4a4540, 0x353030, 0x454035,
  0x3a3a3a, 0x504a40, 0x3d3835, 0x484340,
];

/** Narrow alley width (normal roads are 8 units) */
const ALLEY_W = 2.0;

/** Minimum building width */
const MIN_W = 3;

/** Maximum building width */
const MAX_W = 8;

/** Minimum building height — Kowloon buildings are taller than normal */
const MIN_H = 15;

/** Maximum building height */
const MAX_H = 55;

/** Grid cell size for the Kowloon district (building footprint + alley) */
const CELL_SIZE = 10;

/** Overhang probability (fraction of buildings that extend outward at top) */
const OVERHANG_CHANCE = 0.25;

/** Maximum overhang extension (units) */
const OVERHANG_MAX = 2.5;

/**
 * Generate the Kowloon Walled City district.
 * Returns collision data for physics integration.
 */
export class KowloonDistrict {
  private meshes: THREE.Mesh[] = [];

  /** Generate Kowloon buildings into the given group. Returns collision data. */
  generate(group: THREE.Group): BuildingData[] {
    const buildingGrid: BuildingData[] = [];
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    // Grid dimensions: fill a square of side 2*r centred on (cx, cz)
    const gridHalf = Math.floor(r / CELL_SIZE);
    const usedPositions: Set<string> = new Set();

    // Carve a few wider pathways through the district (N/S and E/W)
    const mainPathX = cx; // vertical path at x = centre
    const mainPathZ = cz; // horizontal path at z = centre

    const buildGeo = new THREE.BoxGeometry(1, 1, 1);
    const dummy = new THREE.Object3D();

    for (let gx = -gridHalf; gx <= gridHalf; gx++) {
      for (let gz = -gridHalf; gz <= gridHalf; gz++) {
        // Skip cells on main pathways (leave wider gaps)
        const worldX = cx + gx * CELL_SIZE;
        const worldZ = cz + gz * CELL_SIZE;
        if (Math.abs(worldX - mainPathX) < CELL_SIZE && Math.abs(worldZ - mainPathZ) < CELL_SIZE * 3) continue;
        if (Math.abs(worldZ - mainPathZ) < CELL_SIZE && Math.abs(worldX - mainPathX) < CELL_SIZE * 3) continue;

        // Distance check — stay within circular radius
        const dx = worldX - cx;
        const dz = worldZ - cz;
        if (Math.sqrt(dx * dx + dz * dz) > r) continue;

        // Random chance to leave a gap (alley intersection)
        if (Math.random() < 0.15) continue;

        const key = `${gx},${gz}`;
        if (usedPositions.has(key)) continue;
        usedPositions.add(key);

        // Generate 1–3 buildings per cell (dense packing)
        const count = randomInt(1, 3);
        for (let b = 0; b < count; b++) {
          const w = randomRange(MIN_W, MAX_W);
          const d = randomRange(MIN_W, MAX_W);
          const h = randomRange(MIN_H, MAX_H);

          // Offset within cell to create irregular layout
          const ox = randomRange(-CELL_SIZE / 2 + w / 2, CELL_SIZE / 2 - w / 2);
          const oz = randomRange(-CELL_SIZE / 2 + d / 2, CELL_SIZE / 2 - d / 2);
          const px = worldX + ox;
          const pz = worldZ + oz;

          const color = new THREE.Color(randomPick(KOWLOON_COLORS));
          const mat = getRandomBuildingMaterial();

          // Main body
          const mesh = new THREE.Mesh(buildGeo, mat);
          mesh.position.set(px, h / 2, pz);
          mesh.scale.set(w, h, d);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
          this.meshes.push(mesh);

          // Collision data
          buildingGrid.push({
            x: px,
            z: pz,
            hw: w / 2 + CFG.PLAYER_R,
            hd: d / 2 + CFG.PLAYER_R,
            h,
          });

          // Overhanging upper floors (Kowloon signature look)
          if (Math.random() < OVERHANG_CHANCE) {
            const overhang = randomRange(0.5, OVERHANG_MAX);
            const overH = randomRange(3, 8);
            const overY = h - overH / 2;

            // Pick a random side to overhang
            const side = randomInt(0, 3);
            let ox2 = 0;
            let oz2 = 0;
            let ow = w;
            let od = d;

            if (side === 0) { ox2 = overhang; ow = w + overhang; }
            else if (side === 1) { ox2 = -overhang; ow = w + overhang; }
            else if (side === 2) { oz2 = overhang; od = d + overhang; }
            else { oz2 = -overhang; od = d + overhang; }

            const overMat = new THREE.MeshLambertMaterial({
              color: color.clone().multiplyScalar(0.85),
            });
            const overMesh = new THREE.Mesh(buildGeo, overMat);
            overMesh.position.set(px + ox2, overY, pz + oz2);
            overMesh.scale.set(ow, overH, od);
            overMesh.castShadow = true;
            overMesh.receiveShadow = true;
            group.add(overMesh);
            this.meshes.push(overMesh);
          }
        }
      }
    }

    return buildingGrid;
  }

  /** Dispose all Kowloon meshes */
  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
    this.meshes = [];
  }
}
