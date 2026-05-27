import * as THREE from 'three';
import { CFG, WORLD_SIZE } from '@config/constants';
import type { BuildingData } from '@game/index';
import { BuildingSystem } from './BuildingSystem';
import { RoadSystem } from './RoadSystem';
import { VegetationSystem } from './VegetationSystem';
import { WaterSystem } from './WaterSystem';

/**
 * World generation orchestrator: coordinates all sub-generators.
 */
export class WorldGenerator {
  private buildingSystem = new BuildingSystem();
  private roadSystem = new RoadSystem();
  private vegetationSystem = new VegetationSystem();
  private waterSystem = new WaterSystem();

  /** Generate the full world into the given group. Returns building collision data. */
  generate(worldGroup: THREE.Group): BuildingData[] {
    // Ground plane — lowered below roads and pushed back via polygon offset to prevent Z-fighting
    const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2);
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0x3a7a2a,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    worldGroup.add(ground);

    // Roads (generates road surfaces + lane markings + sidewalks)
    this.roadSystem.generate(worldGroup);

    // Buildings (generates InstancedMesh + collision grid)
    const buildingGrid = this.buildingSystem.generate(worldGroup);

    // Trees (needs building grid for collision avoidance)
    this.vegetationSystem.generate(worldGroup, buildingGrid);

    // Water borders
    this.waterSystem.generate(worldGroup);

    return buildingGrid;
  }

  /** Get building collision grid */
  getBuildingGrid(): BuildingData[] {
    return this.buildingSystem.getBuildingGrid();
  }

  /** Dispose all sub-system resources */
  dispose(): void {
    this.buildingSystem.dispose();
    this.roadSystem.dispose();
    this.vegetationSystem.dispose();
    this.waterSystem.dispose();
  }
}
