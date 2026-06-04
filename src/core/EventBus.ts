/**
 * Type-safe event bus for decoupling game systems.
 * Systems emit events; UI subscribes to them.
 * Reduces constructor parameter coupling (e.g. CombatLog no longer passed to every system).
 */

type Handler<T> = (data: T) => void;

export type EventMap = {
  'enemy-killed': { type: string; x: number; z: number; money: number };
  'enemy-miss': { type: string };
  'player-damaged': { amount: number; source: string; blocked: number };
  'pickup-collected': { type: string };
  'wave-complete': { wave: number };
  'vehicle-enter': { index: number };
  'vehicle-exit': {};
  'game-state-change': { state: string };
  'vehicle-runover': { type: string };
  // Player interact key pressed (for NPC dialogue in story mode)
  'player:interact': {};
  // Boss kill — picked up by quest system for story progression
  'boss-killed': { type: string; x: number; z: number };
  // Story mode trigger events
  'story:trigger-dialogue': { inkFile: string; knot?: string };
  'story:spawn-enemies': { count: number; type: string; x?: number; z?: number };
};

class TypedEventBus<Events extends Record<string, any>> {
  private handlers = new Map<keyof Events, Set<Handler<any>>>();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.handlers.get(event)?.forEach(h => h(data));
  }
}

/** Global event bus instance */
export const eventBus = new TypedEventBus<EventMap>();
