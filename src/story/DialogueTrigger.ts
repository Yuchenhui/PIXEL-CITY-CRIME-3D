/**
 * Dialogue trigger system.
 *
 * Manages proximity, interact, mission, and condition-based triggers
 * that start dialogue when the player meets certain criteria.
 *
 * Usage:
 *   const triggers = new DialogueTriggerManager();
 *   triggers.addTrigger({
 *     id: 'intro_npc',
 *     type: TriggerType.Proximity,
 *     inkFile: '/stories/intro.json',
 *     position: { x: 10, z: 20 },
 *     range: 15,
 *   });
 *   // In game loop:
 *   const fired = triggers.update(playerX, playerZ);
 *   if (fired) { /* start dialogue *​/ }
 */

import { CFG } from '@config/constants';

/** How a dialogue trigger is activated */
export enum TriggerType {
  /** Fires when player enters a radius around a point */
  Proximity = 'proximity',
  /** Fires when player is in range and presses E */
  Interact = 'interact',
  /** Fires immediately (called programmatically for missions) */
  Mission = 'mission',
  /** Fires when a custom condition function returns true */
  Condition = 'condition',
}

/** A single dialogue trigger definition */
export interface DialogueTrigger {
  /** Unique trigger id (used for one-shot tracking) */
  id: string;
  /** Activation type */
  type: TriggerType;
  /** Path to ink JSON file (relative to public/) */
  inkFile: string;
  /** Ink knot name to start from (defaults to start of story) */
  inkKnot?: string;
  /** World position for proximity / interact triggers */
  position?: { x: number; z: number };
  /** Activation range in world units (defaults to CFG.STORY.TRIGGER_RANGE) */
  range?: number;
  /** NPC id for display / tracking */
  npcId?: string;
  /** Custom condition check (for Condition type) */
  condition?: () => boolean;
  /** If true, trigger fires only once then is removed */
  oneShot?: boolean;
}

/** Result returned when a trigger fires */
export interface TriggerResult {
  /** The trigger that fired */
  trigger: DialogueTrigger;
  /** The ink file to load */
  inkFile: string;
  /** Optional knot to jump to */
  inkKnot?: string;
}

export class DialogueTriggerManager {
  private triggers: DialogueTrigger[] = [];
  private usedOneShots: Set<string> = new Set();

  /** Register a new dialogue trigger */
  addTrigger(trigger: DialogueTrigger): void {
    // Avoid duplicate ids
    const existing = this.triggers.findIndex(t => t.id === trigger.id);
    if (existing >= 0) {
      this.triggers[existing] = trigger;
    } else {
      this.triggers.push(trigger);
    }
  }

  /**
   * Evaluate all triggers against the player position.
   * Returns the first matching trigger result, or null.
   */
  update(playerX: number, playerZ: number): TriggerResult | null {
    for (const trigger of this.triggers) {
      // Skip already-used one-shot triggers
      if (trigger.oneShot && this.usedOneShots.has(trigger.id)) continue;

      const fired = this.evaluateTrigger(trigger, playerX, playerZ);
      if (fired) {
        if (trigger.oneShot) {
          this.usedOneShots.add(trigger.id);
        }
        return {
          trigger,
          inkFile: trigger.inkFile,
          inkKnot: trigger.inkKnot,
        };
      }
    }
    return null;
  }

  /**
   * Check if any Interact-type triggers are in range.
   * Returns the closest one, or null.
   * Used to show "Press E" hints.
   */
  getNearbyInteractTrigger(playerX: number, playerZ: number): DialogueTrigger | null {
    let closest: DialogueTrigger | null = null;
    let closestDist = Infinity;

    for (const trigger of this.triggers) {
      if (trigger.type !== TriggerType.Interact) continue;
      if (trigger.oneShot && this.usedOneShots.has(trigger.id)) continue;
      if (!trigger.position) continue;

      const range = trigger.range ?? CFG.STORY.NPC_INTERACT_DIST;
      const dx = playerX - trigger.position.x;
      const dz = playerZ - trigger.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= range * range && distSq < closestDist) {
        closestDist = distSq;
        closest = trigger;
      }
    }

    return closest;
  }

  /**
   * Fire a specific interact trigger by id (called when player presses E).
   * Returns the trigger result if valid, or null.
   */
  fireInteractTrigger(triggerId: string): TriggerResult | null {
    const trigger = this.triggers.find(
      t => t.id === triggerId && t.type === TriggerType.Interact,
    );
    if (!trigger) return null;
    if (trigger.oneShot && this.usedOneShots.has(trigger.id)) return null;

    if (trigger.oneShot) {
      this.usedOneShots.add(trigger.id);
    }

    return {
      trigger,
      inkFile: trigger.inkFile,
      inkKnot: trigger.inkKnot,
    };
  }

  /**
   * Fire a mission trigger programmatically.
   * Returns the trigger result if found, or null.
   */
  fireMissionTrigger(triggerId: string): TriggerResult | null {
    const trigger = this.triggers.find(
      t => t.id === triggerId && t.type === TriggerType.Mission,
    );
    if (!trigger) return null;

    if (trigger.oneShot) {
      this.usedOneShots.add(trigger.id);
    }

    return {
      trigger,
      inkFile: trigger.inkFile,
      inkKnot: trigger.inkKnot,
    };
  }

  /** Remove a trigger by id */
  removeTrigger(id: string): void {
    const idx = this.triggers.findIndex(t => t.id === id);
    if (idx >= 0) {
      this.triggers.splice(idx, 1);
    }
  }

  /** Remove all triggers and reset one-shot state */
  clear(): void {
    this.triggers = [];
    this.usedOneShots.clear();
  }

  /** Get all registered triggers (read-only view) */
  getTriggers(): readonly DialogueTrigger[] {
    return this.triggers;
  }

  // ========== Private ==========

  /** Evaluate a single trigger against the player position */
  private evaluateTrigger(
    trigger: DialogueTrigger,
    playerX: number,
    playerZ: number,
  ): boolean {
    switch (trigger.type) {
      case TriggerType.Proximity:
        return this.checkProximity(trigger, playerX, playerZ);

      case TriggerType.Interact:
        // Interact triggers are not auto-fired; they require explicit E press
        return false;

      case TriggerType.Mission:
        // Mission triggers are not auto-fired; they require explicit call
        return false;

      case TriggerType.Condition:
        return trigger.condition?.() ?? false;

      default:
        return false;
    }
  }

  /** Check proximity-based trigger */
  private checkProximity(
    trigger: DialogueTrigger,
    playerX: number,
    playerZ: number,
  ): boolean {
    if (!trigger.position) return false;

    const range = trigger.range ?? CFG.STORY.TRIGGER_RANGE;
    const dx = playerX - trigger.position.x;
    const dz = playerZ - trigger.position.z;
    const distSq = dx * dx + dz * dz;

    return distSq <= range * range;
  }
}
