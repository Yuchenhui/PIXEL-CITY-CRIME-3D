/**
 * Zone manager for story mode trigger zones.
 * Manages registration, update, and activation of all trigger zones.
 * Processes location, interact, event, and condition trigger types.
 */

import { CFG } from '@config/constants';
import { eventBus } from '@core/EventBus';
import {
  createTriggerZone,
  isInsideZone,
  TriggerType,
  type TriggerZoneDef,
  type TriggerZoneState,
} from './TriggerZone';

/** Callback fired when a zone is activated */
export type ZoneActivationCallback = (zone: TriggerZoneDef) => void;

/**
 * Manages all trigger zones and checks for activation during the game loop.
 * Supports four trigger types:
 * - Location: activated when player enters the zone
 * - Interact: activated when player presses E near the zone
 * - Event: activated by external game events
 * - Condition: activated when a specific condition is met
 */
export class ZoneManager {
  /** All registered trigger zones */
  private zones: TriggerZoneState[] = [];
  /** Callback invoked on zone activation */
  private onActivate: ZoneActivationCallback | null = null;
  /** Distance within which interact zones can be triggered */
  private readonly interactRange: number;
  /** Currently subscribed event listeners for event-based zones */
  private eventListeners = new Map<string, () => void>();

  constructor() {
    this.interactRange = CFG.STORY.NPC_INTERACT_DIST ?? 3;
  }

  // ========== Lifecycle ==========

  /**
   * Set the callback to invoke when any zone activates.
   * @param callback - Function called with the activated zone definition
   */
  setActivationCallback(callback: ZoneActivationCallback): void {
    this.onActivate = callback;
  }

  /**
   * Register a single trigger zone.
   * @param def - Trigger zone definition
   */
  addZone(def: TriggerZoneDef): void {
    this.zones.push(createTriggerZone(def));

    // Subscribe to external events for event-type zones
    if (def.type === TriggerType.Event && def.eventName) {
      this.subscribeToEvent(def);
    }
  }

  /**
   * Register multiple trigger zones at once.
   * @param defs - Array of trigger zone definitions
   */
  addZones(defs: TriggerZoneDef[]): void {
    for (const def of defs) {
      this.addZone(def);
    }
  }

  /**
   * Unregister a trigger zone by its ID.
   * @param id - Zone identifier to remove
   */
  removeZone(id: string): void {
    const idx = this.zones.findIndex(z => z.def.id === id);
    if (idx >= 0) {
      const zone = this.zones[idx];
      // Clean up event subscription if applicable
      if (zone.def.type === TriggerType.Event && zone.def.eventName) {
        this.unsubscribeFromEvent(zone.def.eventName);
      }
      this.zones.splice(idx, 1);
    }
  }

  /**
   * Remove all registered zones and clear subscriptions.
   */
  clear(): void {
    for (const zone of this.zones) {
      if (zone.def.type === TriggerType.Event && zone.def.eventName) {
        this.unsubscribeFromEvent(zone.def.eventName);
      }
    }
    this.zones = [];
  }

  // ========== Game Loop ==========

  /**
   * Update all zones. Call once per frame.
   * Handles location triggers (enter detection) and condition triggers.
   * @param _dt - Delta time in seconds (unused, kept for API compatibility)
   * @param playerX - Player world X position
   * @param playerZ - Player world Z position
   */
  update(_dt: number, playerX: number, playerZ: number): void {
    for (const zone of this.zones) {
      if (zone.triggered && zone.def.oneShot) continue;

      // --- Location triggers: activate on enter ---
      if (zone.def.type === TriggerType.Location) {
        const nowInside = isInsideZone(playerX, playerZ, zone.def);
        if (nowInside && !zone.wasInside) {
          this.activateZone(zone);
        }
        zone.wasInside = nowInside;
      }

      // --- Condition triggers: check condition each frame ---
      if (zone.def.type === TriggerType.Condition && zone.def.condition) {
        if (this.checkCondition(zone.def.condition)) {
          this.activateZone(zone);
        }
      }
    }
  }

  // ========== Interact Triggers ==========

  /**
   * Handle player interact key press (E key).
   * Finds the nearest interact zone within range and activates it.
   * @param playerX - Player world X position
   * @param playerZ - Player world Z position
   * @returns true if an interact zone was activated
   */
  handleInteract(playerX: number, playerZ: number): boolean {
    let closestZone: TriggerZoneState | null = null;
    let closestDist = this.interactRange;

    for (const zone of this.zones) {
      if (zone.def.type !== TriggerType.Interact) continue;
      if (zone.triggered && zone.def.oneShot) continue;
      if (zone.def.x === undefined || zone.def.z === undefined) continue;

      const dx = playerX - zone.def.x;
      const dz = playerZ - zone.def.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < closestDist) {
        closestDist = dist;
        closestZone = zone;
      }
    }

    if (closestZone) {
      this.activateZone(closestZone);
      return true;
    }

    return false;
  }

  /**
   * Get the nearest interact zone within trigger range.
   * Used to show "Press E" prompts in the HUD.
   * @param playerX - Player world X position
   * @param playerZ - Player world Z position
   * @returns Nearest interact zone definition, or null if none in range
   */
  getNearbyInteraction(playerX: number, playerZ: number): TriggerZoneDef | null {
    let closestDist = this.interactRange;
    let closest: TriggerZoneDef | null = null;

    for (const zone of this.zones) {
      if (zone.def.type !== TriggerType.Interact) continue;
      if (zone.def.x === undefined || zone.def.z === undefined) continue;
      if (zone.triggered && zone.def.oneShot) continue;

      const dx = playerX - zone.def.x;
      const dz = playerZ - zone.def.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < closestDist) {
        closestDist = dist;
        closest = zone.def;
      }
    }

    return closest;
  }

  // ========== Event Triggers ==========

  /**
   * Manually trigger a zone by its ID.
   * Used by external systems (e.g. event bus) to activate event-based zones.
   * @param id - Zone identifier
   * @returns true if the zone was found and triggered
   */
  triggerById(id: string): boolean {
    const zone = this.zones.find(z => z.def.id === id);
    if (!zone || zone.triggered) return false;
    this.activateZone(zone);
    return true;
  }

  /**
   * Fire a named event, triggering all matching event-type zones.
   * Called by external systems via eventBus.
   * @param eventName - Name of the event to fire
   * @param _data - Event payload (ignored, zone decides how to respond)
   */
  fireEvent(eventName: string, _data?: unknown): void {
    for (const zone of this.zones) {
      if (zone.def.type !== TriggerType.Event) continue;
      if (zone.def.eventName !== eventName) continue;
      if (zone.triggered && zone.def.oneShot) continue;
      this.activateZone(zone);
    }
  }

  // ========== Accessors ==========

  /** Get a copy of all registered zones */
  getZones(): TriggerZoneState[] {
    return [...this.zones];
  }

  // ========== Private Helpers ==========

  /**
   * Subscribe to an external game event for event-type zones.
   * Stores a bound handler so it can be removed later.
   */
  private subscribeToEvent(def: TriggerZoneDef): void {
    if (!def.eventName) return;

    const handler = () => {
      this.fireEvent(def.eventName!);
    };

    this.eventListeners.set(def.eventName, handler);
    eventBus.on(def.eventName as never, handler as never);
  }

  /**
   * Remove subscription to an external game event.
   */
  private unsubscribeFromEvent(eventName: string): void {
    const handler = this.eventListeners.get(eventName);
    if (handler) {
      eventBus.off(eventName as never, handler as never);
      this.eventListeners.delete(eventName);
    }
  }

  /**
   * Check if a named condition is currently satisfied.
   * Conditions are evaluated against current game state.
   */
  private checkCondition(condition: string): boolean {
    // Condition format: "wanted>=3" | "flag:met_contact" | "mission:active_mission_1"
    if (condition.startsWith('wanted>=')) {
      const required = parseInt(condition.slice(8), 10);
      // wanted level is read from StateManager — imported lazily to avoid circular deps
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return this.checkWantedCondition(required);
    }

    if (condition.startsWith('flag:')) {
      const key = condition.slice(5);
      return this.checkFlagCondition(key);
    }

    if (condition.startsWith('mission:')) {
      const missionId = condition.slice(8);
      return this.checkMissionCondition(missionId);
    }

    return false;
  }

  private checkWantedCondition(required: number): boolean {
    // Deferred: read from StateManager
    // This is a placeholder that always returns false until integrated
    return false;
  }

  private checkFlagCondition(key: string): boolean {
    // Deferred: read from StoryManager flags
    return false;
  }

  private checkMissionCondition(missionId: string): boolean {
    // Deferred: read from StoryManager
    return false;
  }

  /**
   * Activate a zone and fire the registered callback.
   */
  private activateZone(zone: TriggerZoneState): void {
    zone.triggered = true;
    if (this.onActivate) {
      this.onActivate(zone.def);
    }
  }
}
