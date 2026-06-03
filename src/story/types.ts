/**
 * Type definitions for the story / mission system.
 * Covers mission definitions, runtime state, quest nodes, and NPC data.
 */

// ========== Enums ==========

/** Lifecycle state of a single mission */
export enum MissionState {
  /** Not yet unlocked — prerequisites not met */
  Locked = 'locked',
  /** Unlocked and can be started by the player */
  Available = 'available',
  /** Currently in progress */
  Active = 'active',
  /** Successfully finished */
  Complete = 'complete',
  /** Failed (e.g. time ran out, NPC died) */
  Failed = 'failed',
}

// ========== Mission Definitions ==========

/** A single objective inside a mission */
export interface MissionObjective {
  /** Unique id within the mission (e.g. 'kill_boss', 'reach_safehouse') */
  id: string;
  /** Player-facing description */
  description: string;
  /** How many increments needed (1 = simple boolean, >1 = counter) */
  targetCount: number;
  /** Current progress (0 .. targetCount) */
  currentCount: number;
  /** True once currentCount >= targetCount */
  complete: boolean;
}

/** Rewards granted on mission completion */
export interface MissionRewards {
  /** Cash awarded */
  money?: number;
  /** Score awarded */
  score?: number;
  /** Weapon slot indices to unlock */
  weapons?: number[];
  /** Story flags to set on completion */
  flags?: Record<string, boolean>;
}

/** Static mission definition (loaded once at init) */
export interface MissionDef {
  /** Unique mission identifier (e.g. 'ch1_meet_contact') */
  id: string;
  /** Short display title */
  title: string;
  /** Multi-line description / briefing */
  description: string;
  /** Chapter number (1-based) */
  chapter: number;
  /** Ordered list of objectives */
  objectives: MissionObjective[];
  /** Mission ids that must be Complete before this one is Available */
  prerequisites: string[];
  /** Rewards granted on completion */
  rewards: MissionRewards;
  /** Path to ink JSON file (relative to public/) — optional for simple missions */
  inkFile?: string;
  /** Ink knot name to start from — defaults to mission id if omitted */
  inkKnot?: string;
}

/** Runtime state of an active or completed mission */
export interface MissionRuntime {
  /** The static definition this runtime is based on */
  def: MissionDef;
  /** Current lifecycle state */
  state: MissionState;
  /** Mutable copy of objectives (updated during gameplay) */
  objectives: MissionObjective[];
  /** Timestamp (game seconds) when the mission was activated */
  startedAt: number;
  /** Timestamp (game seconds) when the mission completed / failed */
  endedAt: number;
}

// ========== Quest Nodes ==========

/** Condition types that gate a quest node */
export type QuestConditionType = 'proximity' | 'kill_count' | 'flag' | 'dialogue' | 'always';

/** A single condition that must be satisfied */
export interface QuestCondition {
  /** Condition type — determines which checker runs */
  type: QuestConditionType;
  /** Arbitrary parameters (shape depends on type) */
  params: Record<string, number | string | boolean>;
}

/** Action types that fire when a quest node activates */
export type QuestActionType =
  | 'dialogue'
  | 'set_flag'
  | 'spawn_enemies'
  | 'give_reward'
  | 'update_wanted'
  | 'complete_mission';

/** A single action to execute */
export interface QuestAction {
  /** Action type — determines which executor runs */
  type: QuestActionType;
  /** Arbitrary parameters (shape depends on type) */
  params: Record<string, number | string | boolean>;
}

/** A node in a quest lane — has gate conditions and side effects */
export interface QuestNode {
  /** All conditions must be true for the node to activate */
  conditions: QuestCondition[];
  /** Actions executed when the node activates */
  actions: QuestAction[];
  /** True once this node has been activated */
  triggered: boolean;
}

/** A linear sequence of quest nodes (one lane = one mission's logic flow) */
export interface QuestLane {
  /** Unique lane id (usually matches mission id) */
  id: string;
  /** Ordered nodes — evaluated left to right */
  nodes: QuestNode[];
  /** Index of the next node to evaluate */
  currentNodeIndex: number;
}

// ========== Story Progress ==========

/** Serializable story progress — persisted to localStorage */
export interface StoryProgress {
  /** Current chapter number (1-based) */
  currentChapter: number;
  /** Ids of completed missions */
  completedMissions: string[];
  /** Arbitrary story flags (e.g. 'met_contact': true, 'betrayed_ally': false) */
  flags: Record<string, boolean>;
  /** Per-mission lifecycle states */
  missionStates: Record<string, MissionState>;
  /** Currently active mission id, or null */
  currentMissionId: string | null;
}

// ========== NPC Definitions ==========

/** Static NPC definition for story characters */
export interface NPCDef {
  /** Unique NPC id (e.g. 'contact_01', 'informant_maya') */
  id: string;
  /** Display name */
  name: string;
  /** Role / description (e.g. 'Underground contact') */
  role: string;
  /** Path to ink JSON dialogue file (relative to public/) */
  inkFile?: string;
  /** World spawn X coordinate */
  spawnX: number;
  /** World spawn Z coordinate */
  spawnZ: number;
}
