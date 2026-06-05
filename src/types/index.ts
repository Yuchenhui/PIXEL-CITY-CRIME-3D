/**
 * Central type definitions for the game.
 * All enums, config interfaces, runtime entity interfaces,
 * game state shape, and event types are defined here.
 */
import * as THREE from 'three';
import type { Body } from 'cannon-es';
import type { StoryProgress } from '@story/types';

// ========== Enums ==========

/** Top-level game mode */
export enum GameMode {
  /** Open-world sandbox with random encounters */
  FreeRoam = 'freeroam',
  /** Wave-based survival with escalating difficulty */
  Survival = 'survival',
  /** Story-driven campaign with missions, NPCs, and dialogue */
  Story = 'story',
}

/** High-level game state machine */
export enum GameStateType {
  Loading = 'loading',
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'gameover',
}

/** Enemy behavioural state */
export enum EnemyState {
  /** Wandering randomly */
  Patrol = 'patrol',
  /** Moving towards player / last known position */
  Chase = 'chase',
  /** In attack range with line-of-sight */
  Attack = 'attack',
  /** Fleeing away from player (civilians) */
  Flee = 'flee',
}

/** Enemy archetype identifier */
export enum EnemyTypeName {
  Civilian = 'civilian',
  Gang = 'gang',
  Police = 'police',
  Heavy = 'heavy',
  // Story mode — 九龙城寨
  TriadEnforcer = 'triad_enforcer',
  CorruptCop = 'corrupt_cop',
  DrugDealer = 'drug_dealer',
  Boss = 'boss',
}

/** Pickup item types dropped by enemies */
export enum PickupType {
  Health = 'health',
  Ammo = 'ammo',
  Armor = 'armor',
}

export enum AmbientType {
  Rain = 'rain',
  Chatter = 'chatter',
  Machinery = 'machinery',
  Dripping = 'dripping',
  NeonBuzz = 'neon_buzz',
  Sizzling = 'sizzling',
  Chopping = 'chopping',
  VendorCalls = 'vendor_calls',
  Mahjong = 'mahjong',
  TvStatic = 'tv_static',
}

/** Procedural sound effect identifiers (see AudioManager) */
export enum SoundType {
  Shoot = 'shoot',
  Hit = 'hit',
  Explosion = 'explosion',
  Pickup = 'pickup',
  Reload = 'reload',
  Damage = 'damage',
}

// ========== Config Interfaces ==========

/** Static weapon configuration (one entry per weapon slot) */
export interface WeaponConfig {
  /** Display name shown in HUD */
  name: string;
  /** Damage per pellet per hit */
  dmg: number;
  /** Fire rate cooldown in seconds */
  rate: number;
  /** Magazine capacity (rounds before reload) */
  mag: number;
  /** Reload duration in seconds */
  reload: number;
  /** True = hold to auto-fire; false = semi-auto (one click per shot) */
  auto: boolean;
  /** Maximum raycast range in world units */
  range: number;
  /** Spread cone half-angle in radians */
  spread: number;
  /** Viewmodel length scale (affects 1st-person weapon model size) */
  viewScale: number;
  /** Tracer / muzzle flash colour (hex) */
  color: number;
  /** Pellets per shot (>1 for shotguns) */
  pellets?: number;
  /** Spawns an explosion on hit (RPG) */
  explosive?: boolean;
  /** Uses arc trajectory instead of raycast */
  arc?: boolean;
  /** Continuous flame particles instead of discrete tracers */
  flame?: boolean;
  /** ADS zoom factor (e.g. 3 = 3x scope) */
  zoom?: number;
}

/** Static vehicle configuration (one entry per vehicle type) */
export interface VehicleConfig {
  /** Display name */
  name: string;
  /** Body width in world units */
  w: number;
  /** Body height in world units */
  h: number;
  /** Body length in world units */
  l: number;
  /** Top speed in m/s */
  maxSpd: number;
  /** Acceleration in m/s² */
  acc: number;
  /** Turn rate in rad/s */
  turn: number;
  /** Hit points */
  hp: number;
  /** Body colour (hex) */
  color: number;
}

/** Static enemy archetype configuration */
export interface EnemyConfig {
  /** Hit points */
  hp: number;
  /** Movement speed in m/s */
  spd: number;
  /** Damage per attack */
  dmg: number;
  /** Body colour (hex) */
  color: number;
  /** Detection sight range in world units (before LOS check) */
  sight: number;
  /** Weapon slot index (-1 = unarmed) */
  weapon: number;
  /** Base hit probability 0–1 at close range; halves at max sight */
  accuracy: number;
}

// ========== Runtime Entity Interfaces ==========

/** Axis-aligned building collision data used by PhysicsManager spatial grid */
export interface BuildingData {
  /** Centre X */
  x: number;
  /** Centre Z */
  z: number;
  /** Half-width along X axis */
  hw: number;
  /** Half-depth along Z axis */
  hd: number;
  /** Total height */
  h: number;
}

/** Runtime vehicle instance */
export interface VehicleEntity {
  /** Three.js mesh group */
  mesh: THREE.Group;
  /** Static config for this vehicle type */
  type: VehicleConfig;
  /** Current world X position */
  x: number;
  /** Current world Z position */
  z: number;
  /** Facing angle in radians (0 = +Z) */
  angle: number;
  /** Current speed in m/s (negative = reversing) */
  speed: number;
  /** Current hit points */
  hp: number;
  /** Maximum hit points (from config) */
  maxHp: number;
  /** Optional cannon-es rigid body (future physics integration) */
  body?: Body;
}

/** Runtime enemy instance — managed by EnemyAI */
export interface EnemyEntity {
  /** Three.js mesh group (children order: torso, head, lArm, rArm, lLeg, rLeg, [weapon]) */
  mesh: THREE.Group;
  /** Archetype identifier */
  type: EnemyTypeName;
  /** Current world X */
  x: number;
  /** Current world Z */
  z: number;
  /** Current hit points */
  hp: number;
  /** Maximum hit points (from config) */
  maxHp: number;
  /** Facing / movement angle in radians */
  angle: number;
  /** Current AI state */
  state: EnemyState;
  /** Countdown for patrol re-roll and other timed transitions */
  stateTimer: number;
  /** Random wander direction used during Patrol state */
  patrolAngle: number;
  /** Cooldown before next attack fires (seconds) */
  fireTimer: number;
  /** True once HP reaches 0 */
  dead: boolean;
  /** Game time at which this enemy died (for corpse fade-out) */
  deathTime: number;
  /** Last X where the enemy saw the player (for chase-after-LOS-lost) */
  lastKnownX: number;
  /** Last Z where the enemy saw the player */
  lastKnownZ: number;
  /** Seconds remaining before the enemy forgets the last known position */
  alertTimer: number;
}

/** Runtime particle (managed by ParticleManager pool) */
export interface ParticleEntity {
  mesh: THREE.Mesh;
  /** X velocity */
  vx: number;
  /** Y velocity (affected by gravity) */
  vy: number;
  /** Z velocity */
  vz: number;
  /** Remaining lifetime in seconds */
  life: number;
}

/** Runtime pickup item lying on the ground */
export interface PickupEntity {
  mesh: THREE.Mesh;
  type: PickupType;
  /** World X */
  x: number;
  /** World Z */
  z: number;
  /** Remaining lifetime in seconds before auto-despawn */
  life: number;
}

// ========== Game State Interface ==========

/**
 * Mutable game state — single source of truth for the entire game.
 * Updated every frame in the game loop; read by HUD, minimap, and systems.
 */
export interface GameState {
  // --- Meta ---
  /** Current high-level game state */
  state: GameStateType;
  /** Active game mode (freeroam or survival) */
  mode: GameMode;

  // --- Player vitals ---
  /** Current health points (0 = death) */
  hp: number;
  /** Armour points (absorbs 60% of incoming damage) */
  armor: number;
  /** Cash earned from kills, spent in weapon shop */
  money: number;

  // --- Weapons ---
  /** Index into WEAPONS array for the currently equipped weapon */
  weaponIdx: number;
  /** Per-slot ownership flag (index 0 = pistol, always owned) */
  ownedWeapons: boolean[];
  /** Per-slot ammo count (index 0 = pistol = infinite) */
  ammo: number[];

  // --- Score / kills ---
  /** Total enemies killed */
  kills: number;
  /** Current score (base × combo multiplier) */
  score: number;
  /** Elapsed play time in seconds */
  time: number;

  // --- Wanted level ---
  /** Current wanted stars 0–5 */
  wanted: number;
  /** Seconds until wanted decays by 1 star */
  wantedTimer: number;
  /** Highest wanted level reached (for end-of-game stats) */
  maxWanted: number;

  // --- Combo ---
  /** Current kill combo streak */
  combo: number;
  /** Seconds remaining before combo resets */
  comboTimer: number;

  // --- Shooting stats ---
  /** Total shots fired (for accuracy %) */
  totalShots: number;
  /** Total shots that hit an enemy */
  hits: number;

  // --- Survival wave ---
  /** Current wave number (survival mode) */
  wave: number;
  /** True during the inter-wave break */
  waveBreak: boolean;
  /** Seconds remaining in the inter-wave break */
  waveBreakTimer: number;

  // --- World / time ---
  /** Day-night cycle phase 0–1 (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset) */
  dayTime: number;

  // --- Weapon fire state ---
  /** Seconds remaining before next shot can fire */
  fireTimer: number;
  /** True while the weapon is being reloaded */
  reloading: boolean;
  /** Seconds remaining in the current reload */
  reloadTimer: number;

  // --- Vehicle ---
  /** Index of the vehicle the player is driving, or null if on foot */
  inVehicle: number | null;

  // --- Physics ---
  /** Vertical velocity for jumping / falling */
  velY: number;
  /** True when the player is standing on the ground */
  onGround: boolean;

  // --- Camera ---
  /** Head-bob animation phase (radians) */
  bobPhase: number;
  /** Sprint speed multiplier (1.0 = walk, >1 = sprint) */
  sprintMul: number;

  // --- Game over ---
  /** Game time at which the player died */
  gameOverTime: number;

  // --- Audio ---
  /** Master volume 0–1 (1 = full volume) */
  volume: number;
  /** True when audio is muted */
  muted: boolean;

  // --- Minimap ---
  /** Minimap zoom level (0.5, 1, or 2) */
  minimapZoom: number;

  // --- Story mode ---
  /** Story / mission progress (null when not in story mode) */
  storyProgress: StoryProgress | null;
}
/** End-of-game statistics displayed on the Game Over screen */
export interface GameOverStats {
  score: number;
  kills: number;
  time: number;
  /** Hit accuracy percentage (0–100) */
  accuracy: number;
  maxWanted: number;
  /** Final wave number (survival mode only) */
  wave?: number;
}

// ========== Event Types ==========

/**
 * State change events emitted by StateManager.
 * UI components subscribe to these for efficient DOM updates.
 */
export type StateChangeEvent = 
  | { type: 'hpChange'; value: number }
  | { type: 'armorChange'; value: number }
  | { type: 'weaponChange'; value: number }
  | { type: 'scoreChange'; value: number }
  | { type: 'killsChange'; value: number }
  | { type: 'wantedChange'; value: number }
  | { type: 'comboChange'; value: number }
  | { type: 'stateChange'; value: GameStateType }
  | { type: 'vehicleEnter'; index: number }
  | { type: 'vehicleExit' };

/** Callback signature for state change subscriptions */
export type StateChangeCallback = (event: StateChangeEvent) => void;
