/**
 * Story location builder: generates landmark buildings for each
 * 九龙城寨 story location at fixed world coordinates.
 *
 * Each location has a distinct visual style so the player can recognise it
 * from a distance or on the minimap.
 */
import * as THREE from 'three';
import { CFG } from '@config/constants';
import type { BuildingData } from '@game/index';
import { STORY_LOCATIONS, type StoryLocation } from './StoryLocations';
import { createKowloonMaterial } from './TextureManager';

/** Shared box geometry for all story buildings */
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);

/** Temp object for matrix composition */
const _dummy = new THREE.Object3D();

// ========== Per-type building parameters ==========

interface LocationStyle {
  /** Main building width */
  w: number;
  /** Main building depth */
  d: number;
  /** Main building height */
  h: number;
  /** Primary colour (hex) */
  color: number;
  /** Number of extra accent structures to add */
  accents: number;
}

const STYLES: Record<string, LocationStyle> = {
  entrance: { w: 12, d: 4, h: 8, color: 0xaa7722, accents: 2 },
  hq: { w: 16, d: 14, h: 30, color: 0x992222, accents: 3 },
  factory: { w: 10, d: 10, h: 6, color: 0x555555, accents: 1 },
  police: { w: 14, d: 12, h: 18, color: 0x3355aa, accents: 2 },
  warehouse: { w: 20, d: 14, h: 12, color: 0x887766, accents: 2 },
  nightclub: { w: 12, d: 10, h: 16, color: 0x662266, accents: 4 },
};

/**
 * Build all story-location landmark buildings.
 * Returns collision data for physics integration.
 */
export class StoryLocationBuilder {
  private meshes: THREE.Mesh[] = [];

  /** Generate all story-location buildings. Returns collision data. */
  generate(group: THREE.Group): BuildingData[] {
    const buildingGrid: BuildingData[] = [];

    for (const loc of STORY_LOCATIONS) {
      const data = this.buildLocation(group, loc);
      buildingGrid.push(...data);
    }

    return buildingGrid;
  }

  /** Build a single story location and return its collision data. */
  private buildLocation(group: THREE.Group, loc: StoryLocation): BuildingData[] {
    const buildings: BuildingData[] = [];
    const style = STYLES[loc.type] ?? STYLES.hq;

    // Main building
    const mainMat = createKowloonMaterial('concrete', style.color);
    const mainMesh = new THREE.Mesh(BOX_GEO, mainMat);
    mainMesh.position.set(loc.x, style.h / 2, loc.z);
    mainMesh.scale.set(style.w, style.h, style.d);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);
    this.meshes.push(mainMesh);

    buildings.push({
      x: loc.x,
      z: loc.z,
      hw: style.w / 2 + CFG.PLAYER_R,
      hd: style.d / 2 + CFG.PLAYER_R,
      h: style.h,
    });

    // Type-specific accent structures
    if (loc.type === 'entrance') {
      // Two pillars flanking the archway
      for (const side of [-1, 1]) {
        const pillarMat = new THREE.MeshLambertMaterial({ color: 0xcc9933 });
        const pillar = new THREE.Mesh(BOX_GEO, pillarMat);
        const px = loc.x + side * (style.w / 2 + 1);
        pillar.position.set(px, 5, loc.z);
        pillar.scale.set(1.5, 10, 1.5);
        pillar.castShadow = true;
        group.add(pillar);
        this.meshes.push(pillar);
        buildings.push({ x: px, z: loc.z, hw: 0.75 + CFG.PLAYER_R, hd: 0.75 + CFG.PLAYER_R, h: 10 });
      }
      // Cross-beam on top
      const beamMat = new THREE.MeshLambertMaterial({ color: 0xaa7722 });
      const beam = new THREE.Mesh(BOX_GEO, beamMat);
      beam.position.set(loc.x, 10, loc.z);
      beam.scale.set(style.w + 3, 1, 2);
      beam.castShadow = true;
      group.add(beam);
      this.meshes.push(beam);
    } else if (loc.type === 'hq') {
      // Red neon trim strip at top
      const trimMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
      const trim = new THREE.Mesh(BOX_GEO, trimMat);
      trim.position.set(loc.x, style.h + 0.5, loc.z);
      trim.scale.set(style.w + 1, 1, style.d + 1);
      group.add(trim);
      this.meshes.push(trim);
      // Side annex
      const annexMat = new THREE.MeshLambertMaterial({ color: 0x881111 });
      const annex = new THREE.Mesh(BOX_GEO, annexMat);
      annex.position.set(loc.x + style.w / 2 + 4, 10, loc.z);
      annex.scale.set(8, 20, 8);
      annex.castShadow = true;
      annex.receiveShadow = true;
      group.add(annex);
      this.meshes.push(annex);
      buildings.push({
        x: loc.x + style.w / 2 + 4,
        z: loc.z,
        hw: 4 + CFG.PLAYER_R,
        hd: 4 + CFG.PLAYER_R,
        h: 20,
      });
    } else if (loc.type === 'factory') {
      // Chimney / vent pipe
      const ventMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
      const vent = new THREE.Mesh(BOX_GEO, ventMat);
      vent.position.set(loc.x + 3, 8, loc.z - 3);
      vent.scale.set(1.5, 16, 1.5);
      vent.castShadow = true;
      group.add(vent);
      this.meshes.push(vent);
      buildings.push({ x: loc.x + 3, z: loc.z - 3, hw: 0.75 + CFG.PLAYER_R, hd: 0.75 + CFG.PLAYER_R, h: 16 });
    } else if (loc.type === 'police') {
      // Police sign bar on roof
      const signMat = new THREE.MeshBasicMaterial({ color: 0x4488ff });
      const sign = new THREE.Mesh(BOX_GEO, signMat);
      sign.position.set(loc.x, style.h + 1, loc.z);
      sign.scale.set(style.w * 0.8, 1.5, 1);
      group.add(sign);
      this.meshes.push(sign);
      // Guard booth
      const boothMat = new THREE.MeshLambertMaterial({ color: 0x3355aa });
      const booth = new THREE.Mesh(BOX_GEO, boothMat);
      booth.position.set(loc.x - style.w / 2 - 3, 2, loc.z + style.d / 2 + 2);
      booth.scale.set(3, 4, 3);
      booth.castShadow = true;
      group.add(booth);
      this.meshes.push(booth);
      buildings.push({
        x: loc.x - style.w / 2 - 3,
        z: loc.z + style.d / 2 + 2,
        hw: 1.5 + CFG.PLAYER_R,
        hd: 1.5 + CFG.PLAYER_R,
        h: 4,
      });
    } else if (loc.type === 'warehouse') {
      // Loading dock canopy
      const canopyMat = new THREE.MeshLambertMaterial({ color: 0x776655 });
      const canopy = new THREE.Mesh(BOX_GEO, canopyMat);
      canopy.position.set(loc.x, 6, loc.z + style.d / 2 + 3);
      canopy.scale.set(style.w, 0.5, 6);
      canopy.castShadow = true;
      group.add(canopy);
      this.meshes.push(canopy);
      // Support pillars for canopy
      for (const side of [-1, 1]) {
        const pillarMat = new THREE.MeshLambertMaterial({ color: 0x665544 });
        const pillar = new THREE.Mesh(BOX_GEO, pillarMat);
        pillar.position.set(loc.x + side * (style.w / 2 - 1), 3, loc.z + style.d / 2 + 3);
        pillar.scale.set(0.5, 6, 0.5);
        group.add(pillar);
        this.meshes.push(pillar);
      }
    } else if (loc.type === 'nightclub') {
      // Neon sign on front
      const neonMat = new THREE.MeshBasicMaterial({ color: 0xff44ff });
      const neon = new THREE.Mesh(BOX_GEO, neonMat);
      neon.position.set(loc.x, style.h * 0.7, loc.z + style.d / 2 + 0.3);
      neon.scale.set(style.w * 0.6, 2, 0.3);
      group.add(neon);
      this.meshes.push(neon);
      // Second neon strip
      const neon2Mat = new THREE.MeshBasicMaterial({ color: 0x44ffff });
      const neon2 = new THREE.Mesh(BOX_GEO, neon2Mat);
      neon2.position.set(loc.x, style.h * 0.5, loc.z + style.d / 2 + 0.3);
      neon2.scale.set(style.w * 0.4, 1, 0.3);
      group.add(neon2);
      this.meshes.push(neon2);
      // Awning over entrance
      const awningMat = new THREE.MeshLambertMaterial({ color: 0x441144 });
      const awning = new THREE.Mesh(BOX_GEO, awningMat);
      awning.position.set(loc.x, 3.5, loc.z + style.d / 2 + 2);
      awning.scale.set(6, 0.3, 4);
      awning.castShadow = true;
      group.add(awning);
      this.meshes.push(awning);
    }

    return buildings;
  }

  /** Dispose all story location meshes */
  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
    this.meshes = [];
  }
}
