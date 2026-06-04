import * as THREE from 'three';
import { CFG, WORLD_SIZE } from '@config/constants';
import type { BuildingData } from '@game/index';
import { BuildingSystem } from './BuildingSystem';
import { RoadSystem } from './RoadSystem';
import { VegetationSystem } from './VegetationSystem';
import { WaterSystem } from './WaterSystem';
import { KowloonDistrict } from './KowloonDistrict';
import { StoryLocationBuilder } from './StoryLocationBuilder';
import { KowloonDetails } from './KowloonDetails';
import { STORY_LOCATIONS, KOWLOON_CLEARANCE, STORY_LOCATION_CLEARANCE } from './StoryLocations';

/**
 * World generation orchestrator: coordinates all sub-generators.
 */
export class WorldGenerator {
  private buildingSystem = new BuildingSystem();
  private roadSystem = new RoadSystem();
  private vegetationSystem = new VegetationSystem();
  private waterSystem = new WaterSystem();
  private kowloonDistrict: KowloonDistrict | null = null;
  private storyLocationBuilder: StoryLocationBuilder | null = null;
  private kowloonDetails: KowloonDetails | null = null;
  /** Generate the full world into the given group. Returns building collision data. */
  generate(worldGroup: THREE.Group, storyMode = false): BuildingData[] {
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

    // Compute exclusion zones when story mode is active
    const exclusions = storyMode ? this.computeExclusions() : [];

    // Roads (generates road surfaces + lane markings + sidewalks)
    this.roadSystem.generate(worldGroup);

    // Buildings (generates InstancedMesh + collision grid, excluding story areas)
    const buildingGrid = this.buildingSystem.generate(worldGroup, exclusions);

    // Story mode: generate Kowloon district + landmark buildings
    if (storyMode) {
      const storyBuildings = this.generateStoryMode(worldGroup);
      buildingGrid.push(...storyBuildings);
    }

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

  /**
   * Generate story-mode exclusive content: Kowloon Walled City district
   * and all landmark buildings. Returns collision data.
   */
  private generateStoryMode(worldGroup: THREE.Group): BuildingData[] {
    const buildings: BuildingData[] = [];

    // Kowloon Walled City district (dense, narrow alleys)
    this.kowloonDistrict = new KowloonDistrict();
    buildings.push(...this.kowloonDistrict.generate(worldGroup));

    // Landmark buildings (Triad HQ, Drug Factory, etc.)
    this.storyLocationBuilder = new StoryLocationBuilder();
    buildings.push(...this.storyLocationBuilder.generate(worldGroup));

    // Details: wires, garbage, neon signs, fluorescent lights, rats, pipes, laundry
    this.kowloonDetails = new KowloonDetails();
    this.kowloonDetails.generate(worldGroup, buildings);

    return buildings;
  }

  /**
   * Compute exclusion zones for story mode. Normal buildings must not
   * overlap the Kowloon district or any story landmark.
   */
  private computeExclusions(): Array<{ x: number; z: number; radius: number }> {
    const zones: Array<{ x: number; z: number; radius: number }> = [];

    // Kowloon district exclusion
    zones.push({
      x: 0,
      z: 0,
      radius: KOWLOON_CLEARANCE,
    });

    // Each story landmark exclusion
    for (const loc of STORY_LOCATIONS) {
      zones.push({
        x: loc.x,
        z: loc.z,
        radius: STORY_LOCATION_CLEARANCE,
      });
    }

    return zones;
  }

  /** Dispose all sub-system resources */
  dispose(): void {
    this.buildingSystem.dispose();
    this.roadSystem.dispose();
    this.vegetationSystem.dispose();
    this.waterSystem.dispose();
    this.kowloonDistrict?.dispose();
    this.storyLocationBuilder?.dispose();
    this.kowloonDetails?.dispose();
  }
}
