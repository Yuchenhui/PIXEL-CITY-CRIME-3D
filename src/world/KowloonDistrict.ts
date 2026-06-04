/**
 * 九龙城寨 (Kowloon Walled City) district generator.
 *
 * Creates a dense cluster of tightly-packed buildings with narrow alleys,
 * overhanging structures, and interconnected pathways. The district is
 * positioned near the world centre and excluded from normal generation.
 *
 * Unlike the regular BuildingSystem (which uses InstancedMesh chunks),
 * Kowloon buildings are individual meshes because they need varied
 * materials and overhanging geometry that InstancedMesh cannot express.
 */
import * as THREE from 'three';
import { CFG } from '@config/constants';
import { randomRange, randomInt, randomPick } from '@utils/math';
import type { BuildingData } from '@game/index';
import { KOWLOON_CENTRE_X, KOWLOON_CENTRE_Z, KOWLOON_RADIUS } from './StoryLocations';
import { getRandomBuildingMaterial } from './TextureManager';

// ========== Kowloon-specific constants ==========

/** Dark, grimy colour palette for Kowloon buildings */
const KOWLOON_COLORS = [
  0x3a3530, 0x4a4540, 0x353030, 0x454035,
  0x3a3a3a, 0x504a40, 0x3d3835, 0x484340,
];

/** Narrow alley width - 九龙城寨的巷子非常窄 */
const ALLEY_W = 1.0;

/** Minimum building width */
const MIN_W = 3;

/** Maximum building width */
const MAX_W = 7;

/** Minimum building height — 九龙城寨楼层很高 */
const MIN_H = 18;

/** Maximum building height */
const MAX_H = 60;

/** Grid cell size for the Kowloon district */
const CELL_SIZE = 8;

/** Overhang probability (fraction of buildings that extend outward at top) */
const OVERHANG_CHANCE = 0.4;

/** Maximum overhang extension (units) */
const OVERHANG_MAX = 3.0;

/** Bridge probability between nearby buildings */
const BRIDGE_CHANCE = 0.25;

/**
 * Generate the Kowloon Walled City district.
 * Returns collision data for physics integration.
 */
export class KowloonDistrict {
  private meshes: THREE.Mesh[] = [];
  private bridges: THREE.Mesh[] = [];

  /**
   * Generate Kowloon buildings into the given group.
   * Returns collision data.
   */
  generate(group: THREE.Group): BuildingData[] {
    const buildingGrid: BuildingData[] = [];
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    // Grid dimensions: fill a square of side 2*r centred on (cx, cz)
    const gridHalf = Math.floor(r / CELL_SIZE);
    const usedPositions: Set<string> = new Set();
    const buildingPositions: Array<{ x: number; z: number; w: number; d: number; h: number }> = [];

    const buildGeo = new THREE.BoxGeometry(1, 1, 1);
    const dummy = new THREE.Object3D();

    for (let gx = -gridHalf; gx <= gridHalf; gx++) {
      for (let gz = -gridHalf; gz <= gridHalf; gz++) {
        const worldX = cx + gx * CELL_SIZE;
        const worldZ = cz + gz * CELL_SIZE;

        // Distance check — stay within circular radius
        const dx = worldX - cx;
        const dz = worldZ - cz;
        if (Math.sqrt(dx * dx + dz * dz) > r) continue;

        // Random chance to leave a gap (alley intersection)
        if (Math.random() < 0.1) continue;

        const key = `${gx},${gz}`;
        if (usedPositions.has(key)) continue;
        usedPositions.add(key);

        // Generate 2-4 buildings per cell (very dense packing)
        const count = randomInt(2, 4);
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

          // Store for bridge generation
          buildingPositions.push({ x: px, z: pz, w, d, h });

          // Overhanging upper floors (九龙城寨标志性的伸出结构)
          if (Math.random() < OVERHANG_CHANCE) {
            this.createOverhangs(group, buildGeo, px, pz, w, d, h, color);
          }
        }
      }
    }

    // Generate connecting bridges between nearby buildings
    this.createBridges(group, buildingPositions);

    // Generate dark ceiling planes to create "underground" feel at ground level
    this.createCeilingShadows(group, cx, cz, r);

    return buildingGrid;
  }

  /**
   * 创建悬挑结构（九龙城寨标志性外观）
   */
  private createOverhangs(
    group: THREE.Group,
    geo: THREE.BufferGeometry,
    px: number,
    pz: number,
    w: number,
    d: number,
    h: number,
    baseColor: THREE.Color
  ): void {
    const overhangCount = randomInt(1, 3);
    for (let i = 0; i < overhangCount; i++) {
      const overhang = randomRange(0.8, OVERHANG_MAX);
      const overH = randomRange(2, 6);
      const overY = h - overH / 2 - randomRange(0, h * 0.3);

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
        color: baseColor.clone().multiplyScalar(0.8),
      });
      const overMesh = new THREE.Mesh(geo, overMat);
      overMesh.position.set(px + ox2, overY, pz + oz2);
      overMesh.scale.set(ow, overH, od);
      overMesh.castShadow = true;
      overMesh.receiveShadow = true;
      group.add(overMesh);
      this.meshes.push(overMesh);
    }
  }

  /**
   * 创建建筑之间的连接桥（九龙城寨特色）
   */
  private createBridges(
    group: THREE.Group,
    buildings: Array<{ x: number; z: number; w: number; d: number; h: number }>
  ): void {
    const bridgeGeo = new THREE.BoxGeometry(1, 1, 1);
    const bridgeMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });

    for (let i = 0; i < buildings.length; i++) {
      const b1 = buildings[i];
      if (Math.random() > BRIDGE_CHANCE) continue;

      // Find nearby buildings
      for (let j = i + 1; j < buildings.length; j++) {
        const b2 = buildings[j];
        const dx = b2.x - b1.x;
        const dz = b2.z - b1.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Only connect buildings that are close and at similar heights
        if (dist > 12 || dist < 3) continue;
        if (Math.abs(b1.h - b2.h) > 10) continue;
        if (Math.random() > 0.3) continue;

        // Create bridge at upper level
        const bridgeH = randomRange(8, Math.min(b1.h, b2.h) * 0.8);
        const bridgeW = randomRange(1.5, 2.5);
        const midX = (b1.x + b2.x) / 2;
        const midZ = (b1.z + b2.z) / 2;
        const midH = (b1.h + b2.h) / 2;

        const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge.position.set(midX, bridgeH, midZ);
        bridge.scale.set(dist, 0.5, bridgeW);
        bridge.castShadow = true;
        bridge.receiveShadow = true;
        group.add(bridge);
        this.bridges.push(bridge);
        this.meshes.push(bridge);
      }
    }
  }

  /**
   * 创建天花板阴影效果（让地面层更暗）
   * 在建筑之间添加黑暗的顶棚，模拟城寨"不见天日"的效果
   */
  private createCeilingShadows(group: THREE.Group, cx: number, cz: number, r: number): void {
    const ceilingGeo = new THREE.PlaneGeometry(1, 1);
    const ceilingMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });

    // 在不同高度创建"黑暗天花板"
    const heights = [12, 18, 25, 32];
    for (const h of heights) {
      // 创建多个黑暗平板覆盖区域
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * r * 0.8;
        const x = cx + Math.cos(angle) * dist;
        const z = cz + Math.sin(angle) * dist;

        const size = randomRange(10, 25);
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.position.set(x, h, z);
        ceiling.rotation.x = -Math.PI / 2;
        ceiling.scale.set(size, size, 1);
        group.add(ceiling);
        this.meshes.push(ceiling);
      }
    }
  }

  /** Dispose all Kowloon meshes */
  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
    this.meshes = [];
    this.bridges = [];
  }
}
