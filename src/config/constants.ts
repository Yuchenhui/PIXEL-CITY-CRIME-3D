/** Core game configuration constants */
export const CFG = {
  // Map generation
  MAP_BLOCKS: 20,
  BLOCK_SIZE: 24,
  ROAD_W: 8,

  // Building generation
  BUILD_MIN_H: 8,
  BUILD_MAX_H: 40,

  // Physics
  GRAVITY: 25,
  JUMP_VEL: 10,

  // Player
  PLAYER_H: 1.7,
  PLAYER_R: 0.4,
  WALK_SPD: 6,
  SPRINT_SPD: 11,
  MOUSE_SENS: 0.002,

  // Time
  DAY_LENGTH: 300,

  // Limits
  MAX_ENEMIES: 20,
  MAX_PARTICLES: 100,

  // Vehicles
  VEHICLE_COUNT: 15,

  // Trees
  TREE_COUNT: 80,

  // Enemy spawn
  FREEROAM_MIN_ENEMIES: 10,
  INITIAL_FREEROAM_ENEMIES: 15,
  INITIAL_SURVIVAL_ENEMIES: 5,
} as const;

/** Computed world size (total map dimension) */
export const WORLD_SIZE = CFG.MAP_BLOCKS * (CFG.BLOCK_SIZE + CFG.ROAD_W);

/** Grid cell size for spatial partitioning */
export const GRID_RES = 2;
