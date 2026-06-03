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

  // === Sub-objects: grouped constants by system ===

  /** Enemy AI behaviour and combat tuning */
  ENEMY: {
    /** Minimum spawn distance from player (units) */
    SPAWN_MIN_DIST: 30,
    /** Random spawn distance range added to minimum (units) */
    SPAWN_DIST_RANGE: 60,
    /** Max attempts to find a non-colliding spawn position */
    SPAWN_MAX_ATTEMPTS: 20,
    /** Seconds to remember last known player position after losing sight */
    ALERT_TIMER: 4,
    /** Distance at which enemies switch from chase to attack state */
    ATTACK_DIST: 15,
    /** Minimum patrol re-roll timer (seconds) */
    PATROL_TIMER_MIN: 2,
    /** Random range added to patrol timer (seconds) */
    PATROL_TIMER_RANGE: 2,
    /** Minimum search patrol timer when reaching last known position (seconds) */
    SEARCH_TIMER_MIN: 1.5,
    /** Random range added to search patrol timer (seconds) */
    SEARCH_TIMER_RANGE: 1,
    /** SMG (weapon id 3) fire cooldown (seconds) */
    FIRE_RATE_SMG: 0.5,
    /** RPG (weapon id 5) fire cooldown (seconds) */
    FIRE_RATE_RPG: 2,
    /** Default pistol fire cooldown (seconds) */
    FIRE_RATE_DEFAULT: 0.8,
    /** Accuracy decay factor at max sight range (hitChance = accuracy * (1 - dist/sight * this)) */
    DIST_ACCURACY_DECAY: 0.5,
    /** Gun muzzle offset from enemy centre (units) */
    GUN_OFFSET: 0.8,
    /** Gun muzzle Y height (units) */
    GUN_HEIGHT: 1.5,
    /** Max random offset when bullet misses (units) */
    MISS_OFFSET_RANGE: 4,
    /** Minimum miss impact random distance (units) */
    MISS_DIST_MIN: 1,
    /** Y height of miss impact particles (units) */
    MISS_Y: 0.3,
    /** Civilian flee speed multiplier */
    FLEE_SPEED_MUL: 1.3,
    /** Collision radius for enemy movement checks (units) */
    MOVE_COLLISION_R: 0.5,
    /** Milliseconds divisor for walking leg animation speed */
    WALK_ANIM_SPEED: 200,
    /** Leg swing amplitude (radians) */
    LEG_SWING_AMP: 0.4,
    /** Seconds to chain the next kill for combo multiplier */
    COMBO_TIMER: 3,
    /** Maximum combo multiplier cap */
    COMBO_MAX: 10,
    /** Pickup drop probability on enemy kill */
    DROP_RATE: 0.3,
    /** Enemy tracer fade duration (milliseconds) */
    TRACER_FADE_MS: 80,
    /** Death animation tilt angle (radians, ~80°) */
    DEATH_TILT_RAD: 1.4,
    /** Death animation side tilt factor */
    DEATH_SIDE_FACTOR: 0.5,
    /** Death animation Y position lowering (units) */
    DEATH_LOWER: 0.8,
    /** Death animation arm rotation (radians) */
    DEATH_ARM_ROT: 0.8,
    /** Deterministic seed multiplier for per-enemy death side tilt */
    DEATH_SIDE_SEED: 3.7,
  } as const,

  /** Vehicle driving and collision tuning */
  VEHICLE: {
    /** Distance to show 'press E' hint (units) */
    NEAR_DIST: 4,
    /** Maximum distance to enter a vehicle (units) */
    ENTER_DIST: 5,
    /** Offset distance when exiting a vehicle (units) */
    EXIT_OFFSET: 3,
    /** Brake deceleration multiplier per frame */
    BRAKE_DECEL: 0.95,
    /** Coast deceleration multiplier per frame (no input) */
    COAST_DECEL: 0.98,
    /** Minimum speed below which vehicle stops (m/s) */
    MIN_SPEED: 0.5,
    /** Speed threshold for full steering effectiveness (m/s) */
    STEER_SPEED_THRESH: 10,
    /** Minimum speed to trigger building collision particles (m/s) */
    BUILDING_CRASH_PARTICLE_THRESH: 3,
    /** Speed multiplier after building collision */
    BUILDING_CRASH_DECEL: 0.1,
    /** Distance threshold for running over enemies (units) */
    RUNOVER_DIST: 2,
    /** Minimum speed to run over enemies (m/s) */
    RUNOVER_SPEED_THRESH: 5,
    /** Damage = speed × this multiplier on run-over */
    RUNOVER_DMG_MUL: 2,
    /** Score awarded for running over an enemy */
    RUNOVER_SCORE: 15,
    /** Push factor for the moving vehicle on collision */
    COLLISION_PUSH_SELF: 0.6,
    /** Push factor for the other vehicle on collision */
    COLLISION_PUSH_OTHER: 0.4,
    /** Speed retention after vehicle-to-vehicle collision */
    COLLISION_SPEED_RETAIN: 0.3,
    /** Minimum relative speed for collision particles (m/s) */
    COLLISION_PARTICLE_THRESH: 3,
    /** Minimum relative speed for collision damage (m/s) */
    COLLISION_DMG_SPEED_THRESH: 10,
    /** Damage = relativeSpeed × this multiplier on high-speed collision */
    COLLISION_DMG_MUL: 0.5,
    /** Maximum yaw angle for interior look-around (radians) */
    INTERIOR_YAW_LIMIT: 1.2,
    /** Maximum up pitch for interior look-around (radians) */
    INTERIOR_PITCH_UP: 0.5,
    /** Maximum down pitch for interior look-around (radians) */
    INTERIOR_PITCH_DOWN: 0.6,
  } as const,

  /** Shooting system tuning */
  WEAPON_SYS: {
    /** Muzzle flash light duration (milliseconds) */
    MUZZLE_FLASH_MS: 50,
    /** Viewmodel recoil kick amount (units) */
    RECOIL_AMOUNT: 0.05,
    /** Recoil return duration (milliseconds) */
    RECOIL_RETURN_MS: 80,
    /** Spread multiplier when shooting from a vehicle */
    VEHICLE_SPREAD_MUL: 2,
    /** Fire timer after switching weapons (seconds) */
    SWITCH_FIRE_TIMER: 0.3,
    /** Player tracer lifetime (milliseconds) */
    TRACER_LIFE_MS: 60,
    /** Explosion blast radius (units) */
    EXPLOSION_RADIUS: 8,
    /** Explosion base damage at centre */
    EXPLOSION_DMG: 120,
    /** Score awarded for each enemy killed by explosion */
    EXPLOSION_KILL_SCORE: 20,
  } as const,

  /** Particle system tuning */
  PARTICLE: {
    /** Gravity applied to particles (units/s²) — differs from CFG.GRAVITY for visual feel */
    GRAVITY: 15,
    /** Max horizontal spawn velocity (units/s) */
    SPAWN_VEL_XZ: 8,
    /** Minimum upward spawn velocity (units/s) */
    SPAWN_VEL_UP_MIN: 2,
    /** Maximum upward spawn velocity (units/s) */
    SPAWN_VEL_UP_MAX: 5,
    /** Minimum particle lifetime (seconds) */
    LIFE_MIN: 0.5,
    /** Random range added to particle lifetime (seconds) */
    LIFE_RANGE: 0.5,
  } as const,

  /** Wave and freeroam spawning tuning */
  WAVE: {
    /** Base enemy count for wave 1 (actual = BASE + wave × PER_WAVE) */
    BASE_COUNT: 3,
    /** Additional enemies per wave number */
    COUNT_PER_WAVE: 2,
    /** Break duration between survival waves (seconds) */
    BREAK_DURATION: 5,
    /** Score bonus multiplier per wave cleared */
    CLEAR_BONUS: 100,
    /** Freeroam respawn probability factor (dt × RATE per frame) */
    FREEROAM_RESPAWN_RATE: 0.5,
  } as const,

  /** Game loop and HUD update intervals */
  GAME: {
    /** Threat scan interval (seconds) */
    THREAT_SCAN_INTERVAL: 2,
    /** Threat scan detection range (units) */
    THREAT_SCAN_RANGE: 40,
    /** Minimap render update interval (seconds) */
    MINIMAP_INTERVAL: 0.5,
    /** Seconds between wanted level auto-decay */
    WANTED_DECAY_TIMER: 15,
    /** Maximum wanted level (stars) */
    MAX_WANTED: 5,
    /** Menu camera pan speed (units/s) */
    MENU_CAM_PAN_SPEED: 2,
    /** Menu camera height (units) */
    MENU_CAM_HEIGHT: 20,
    /** Menu camera Z movement speed (units/s) */
    MENU_CAM_Z_SPEED: 1,
  } as const,

  /** Pickup item tuning */
  PICKUP: {
    /** Pickup lifetime before disappearing (seconds) */
    LIFETIME: 30,
    /** Collection distance from player (units) */
    COLLECT_DIST: 2,
    /** HP restored by health pickup */
    HEALTH_AMOUNT: 25,
    /** Ammo refill: magazine count multiplier */
    AMMO_MAG_MUL: 3,
    /** Armor points restored by armor pickup */
    ARMOR_AMOUNT: 30,
  } as const,

  /** Rendering and camera settings */
  RENDER: {
    /** FogExp2 density (higher = thicker fog) */
    FOG_DENSITY: 0.014,
    /** Camera far clipping plane (units) */
    FAR_PLANE: 250,
    /** Maximum device pixel ratio cap */
    MAX_PIXEL_RATIO: 1.5,
    /** Shadow map resolution (pixels) */
    SHADOW_MAP_SIZE: 512,
    /** Shadow camera far plane (units) */
    SHADOW_CAM_FAR: 150,
    /** Shadow camera extent in each direction (units) */
    SHADOW_CAM_EXTENT: 60,
    /** Maximum delta time cap to prevent spiral of death (seconds) */
    DELTA_CAP: 0.05,
    /** Default camera field of view (degrees) */
    CAMERA_FOV: 75,
    /** Camera FOV when inside a vehicle (degrees) */
    CAMERA_FOV_VEHICLE: 90,
  } as const,

  /** Water border settings */
  WATER: {
    /** Width of water border strip (units) */
    BORDER_WIDTH: 20,
    /** Extension beyond map edge for water planes (units) */
    BORDER_EXTEND: 40,
  } as const,

  /** Player additional tuning */
  PLAYER_EXTRA: {
    /** Head bob frequency when walking (rad/s) */
    HEAD_BOB_WALK_FREQ: 10,
    /** Head bob frequency when sprinting (rad/s) */
    HEAD_BOB_SPRINT_FREQ: 14,
    /** Head bob vertical amplitude (units) */
    HEAD_BOB_AMP: 0.04,
    /** Camera X rotation margin from vertical (radians) */
    CAMERA_X_MARGIN: 0.1,
    /** Fraction of damage absorbed by armor */
    ARMOR_ABSORB: 0.6,
    /** Starting cash for a new game */
    STARTING_CASH: 200,
    /** Pistol ammo count (effectively unlimited) */
    PISTOL_AMMO: 999,
  } as const,

  /** Physics step settings */
  PHYSICS: {
    /** Fixed timestep for Cannon-es world step (seconds) */
    STEP_RATE: 1 / 60,
    /** Maximum sub-steps per Cannon-es step */
    MAX_SUB_STEPS: 3,
    /** Minimum distance² for LOS check — closer always visible */
    LOS_MIN_DIST_SQ: 4,
    /** LOS sampling step factor (fraction of grid resolution) */
    LOS_STEP_FACTOR: 0.8,
    /** LOS sample collision radius (units) */
    LOS_CHECK_R: 0.3,
  } as const,

  // Story mode
  STORY: {
    /** Story system update rate (Hz) — lower than frame rate to save CPU */
    UPDATE_HZ: 5,
    /** Distance to trigger proximity-based mission events (units) */
    TRIGGER_RANGE: 20,
    /** Distance to interact with an NPC (units) */
    NPC_INTERACT_DIST: 3,
    /** Height of the dialogue panel in the HUD (pixels) */
    DIALOGUE_PANEL_HEIGHT: 200,
  } as const,
  } as const;

/** Computed world size (total map dimension) */
export const WORLD_SIZE = CFG.MAP_BLOCKS * (CFG.BLOCK_SIZE + CFG.ROAD_W);

/** Grid cell size for spatial partitioning */
export const GRID_RES = 2;
