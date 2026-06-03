/**
 * Trigger zone definitions for story mode.
 * Zones define areas in the world that can activate story events,
 * dialogue, mission starts, or enemy spawns.
 */

/** Trigger zone types */
export enum TriggerType {
  /** Player enters/exits an area */
  Location = 'location',
  /** Player presses E to interact with a point/NPC */
  Interact = 'interact',
  /** A game event fires (kills, pickups, etc.) */
  Event = 'event',
  /** A state condition is met (wanted level, flag, etc.) */
  Condition = 'condition',
}

/** Actions that can be triggered when a zone activates */
export type TriggerAction = 'start_mission' | 'trigger_dialogue' | 'set_flag' | 'spawn_enemies';

/** A trigger zone that can activate story events */
export interface TriggerZoneDef {
  /** Unique zone identifier */
  id: string;
  /** Zone type determining activation behaviour */
  type: TriggerType;
  /** For location triggers: center X position */
  x?: number;
  /** For location triggers: center Z position */
  z?: number;
  /** For location triggers: circular activation radius (units) */
  range?: number;
  /** For location triggers: AABB half-width (units) */
  halfW?: number;
  /** For location triggers: AABB half-depth (units) */
  halfD?: number;
  /** For interact triggers: NPC or object ID to interact with */
  targetId?: string;
  /** For event triggers: name of the game event to listen for */
  eventName?: string;
  /** For condition triggers: name of the condition to check */
  condition?: string;
  /** Action to perform when zone activates */
  action: TriggerAction;
  /** Parameters passed to the action handler */
  actionParams: Record<string, unknown>;
  /** If true, zone can only be triggered once */
  oneShot: boolean;
  /** If true, only the player can trigger this zone */
  filterPlayerOnly: boolean;
}

/** Runtime state for a trigger zone */
export interface TriggerZoneState {
  /** Static definition */
  def: TriggerZoneDef;
  /** Whether the player was inside the zone last frame */
  wasInside: boolean;
  /** Whether this zone has already been triggered (for one-shot zones) */
  triggered: boolean;
}

/**
 * Create a runtime trigger zone state from a definition.
 * @param def - Static trigger zone definition
 * @returns New trigger zone state with default values
 */
export function createTriggerZone(def: TriggerZoneDef): TriggerZoneState {
  return { def, wasInside: false, triggered: false };
}

/**
 * Check if a world position is inside a trigger zone.
 * Supports both circular (range) and AABB (halfW/halfD) zone shapes.
 * @param x - World X position
 * @param z - World Z position
 * @param zone - Trigger zone definition to test
 * @returns true if the position is inside the zone
 */
export function isInsideZone(x: number, z: number, zone: TriggerZoneDef): boolean {
  if (zone.x === undefined || zone.z === undefined) return false;

  if (zone.range !== undefined) {
    // Circular check: compare squared distance to squared radius
    const dx = x - zone.x;
    const dz = z - zone.z;
    return dx * dx + dz * dz < zone.range * zone.range;
  }

  // AABB check: compare absolute offset to half-dimensions
  if (zone.halfW !== undefined && zone.halfD !== undefined) {
    return Math.abs(x - zone.x) < zone.halfW && Math.abs(z - zone.z) < zone.halfD;
  }

  return false;
}
