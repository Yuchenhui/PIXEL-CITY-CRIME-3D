/**
 * Quest manager — evaluates condition-action chains for mission progression.
 *
 * Each mission has one or more "lanes" of quest nodes. A lane advances when
 * all conditions on the current node are satisfied; the node's actions are
 * then executed and the lane moves to the next node.
 *
 * Usage:
 *   const qm = new QuestManager();
 *   qm.loadLanes(questLanes);
 *   // in game loop:
 *   qm.update(playerX, playerZ);
 *   // register action handlers:
 *   qm.onAction('dialogue', (action) => { showDialogue(action); });
 */

import type { QuestLane, QuestCondition, QuestAction } from './types';

export class QuestManager {
  /** Active quest lanes keyed by lane id */
  private lanes: Map<string, QuestLane> = new Map();

  /** Action handlers registered by game systems — receives the full action object */
  private actionHandlers: Map<string, (action: QuestAction) => void> = new Map();

  /** Current kill count used by kill_count conditions */
  private killCount: number = 0;

  /** Story flags used by flag conditions */
  private flags: Record<string, boolean> = {};

  /** Set of completed dialogue ids used by dialogue conditions */
  private completedDialogues: Set<string> = new Set();

  // ========== Lanes ==========

  /**
   * Load lanes for a mission. Clears any previously loaded lanes.
   * @param lanes - Array of QuestLane definitions
   */
  loadLanes(lanes: QuestLane[]): void {
    this.lanes.clear();
    for (const lane of lanes) {
      this.lanes.set(lane.id, lane);
    }
  }

  // ========== Update ==========

  /**
   * Update all active lanes — check conditions, execute actions, advance nodes.
   * Called every frame (or throttled by the caller).
   * @param playerX - Player world X coordinate
   * @param playerZ - Player world Z coordinate
   */
  update(playerX: number, playerZ: number): void {
    for (const lane of this.lanes.values()) {
      if (lane.currentNodeIndex >= lane.nodes.length) continue;

      const node = lane.nodes[lane.currentNodeIndex];
      if (this.evaluateConditions(node.conditions, playerX, playerZ)) {
        this.executeActions(node.actions);
        node.triggered = true;
        lane.currentNodeIndex++;
      }
    }
  }

  // ========== Condition Evaluation ==========

  /**
   * Evaluate a set of conditions — all must be true for the node to activate.
   */
  private evaluateConditions(
    conditions: QuestCondition[],
    playerX: number,
    playerZ: number,
  ): boolean {
    for (const cond of conditions) {
      if (!this.evaluateCondition(cond, playerX, playerZ)) {
        return false;
      }
    }
    return true;
  }

  /** Evaluate a single condition based on its type */
  private evaluateCondition(
    cond: QuestCondition,
    playerX: number,
    playerZ: number,
  ): boolean {
    switch (cond.type) {
      case 'always':
        return true;

      case 'proximity': {
        const targetX = cond.params.x as number;
        const targetZ = cond.params.z as number;
        const range = (cond.params.range as number) ?? 20;
        const dx = playerX - targetX;
        const dz = playerZ - targetZ;
        return Math.sqrt(dx * dx + dz * dz) < range;
      }

      case 'kill_count': {
        const target = (cond.params.target as number) ?? 1;
        return this.killCount >= target;
      }

      case 'flag': {
        const key = cond.params.key as string;
        const value = (cond.params.value as boolean) ?? true;
        return (this.flags[key] ?? false) === value;
      }

      case 'dialogue': {
        const dialogueId = cond.params.dialogueId as string;
        return this.completedDialogues.has(dialogueId);
      }

      default:
        return false;
    }
  }

  // ========== Action Execution ==========

  /** Execute a list of actions by dispatching to registered handlers */
  private executeActions(actions: QuestAction[]): void {
    for (const action of actions) {
      const handler = this.actionHandlers.get(action.type);
      if (handler) {
        handler(action);
      }
    }
  }

  /**
   * Register a handler for a specific action type.
   * The handler receives the full action object with its params.
   * @param type - Action type (e.g. 'dialogue', 'set_flag')
   * @param handler - Function called with the action when that type fires
   */
  onAction(type: string, handler: (action: QuestAction) => void): void {
    this.actionHandlers.set(type, handler);
  }

  // ========== External State Setters ==========

  /**
   * Set the current kill count for kill_count condition evaluation.
   * @param count - Current number of enemies killed
   */
  setKillCount(count: number): void {
    this.killCount = count;
  }

  /**
   * Set story flags for flag condition evaluation.
   * @param flags - Record of flag key/value pairs (typically from StoryManager)
   */
  setFlags(flags: Record<string, boolean>): void {
    this.flags = flags;
  }

  /**
   * Mark a dialogue as completed for dialogue condition evaluation.
   * @param dialogueId - Unique dialogue identifier
   */
  setDialogueComplete(dialogueId: string): void {
    this.completedDialogues.add(dialogueId);
  }

  // ========== Getters ==========

  /**
   * Get the current node index for a lane.
   * @param laneId - Lane identifier
   * @returns Current node index, or 0 if lane not found
   */
  getCurrentNode(laneId: string): number {
    return this.lanes.get(laneId)?.currentNodeIndex ?? 0;
  }

  /**
   * Check whether a specific lane has completed all its nodes.
   * @param laneId - Lane identifier
   */
  isLaneComplete(laneId: string): boolean {
    const lane = this.lanes.get(laneId);
    return lane !== undefined && lane.currentNodeIndex >= lane.nodes.length;
  }

  /** Check if all lanes have completed all their nodes */
  allComplete(): boolean {
    for (const lane of this.lanes.values()) {
      if (lane.currentNodeIndex < lane.nodes.length) return false;
    }
    return true;
  }

  // ========== Lifecycle ==========

  /** Reset all lanes to node index 0 */
  reset(): void {
    for (const lane of this.lanes.values()) {
      lane.currentNodeIndex = 0;
      for (const node of lane.nodes) {
        node.triggered = false;
      }
    }
    this.killCount = 0;
    this.flags = {};
    this.completedDialogues.clear();
  }

  /** Clear all lanes, handlers, and state */
  clear(): void {
    this.lanes.clear();
    this.actionHandlers.clear();
    this.killCount = 0;
    this.flags = {};
    this.completedDialogues.clear();
  }
}
