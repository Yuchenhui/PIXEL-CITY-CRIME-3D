/**
 * Spawn enemies action executor.
 * Triggers enemy spawning via the game EventBus.
 *
 * Does not spawn enemies directly — instead emits a 'quest-spawn-enemies' event
 * that WaveManager or the game loop listens to and handles spawning.
 */

import type { QuestAction } from '../types';

type SpawnCallback = (enemyType: string, count: number, x: number, z: number) => void;

let spawnCallback: SpawnCallback | null = null;

/**
 * Register a handler for spawn_enemies actions.
 * The handler should trigger the appropriate enemy spawning logic.
 *
 * @param callback - Called with (enemyType, count, x, z) when a spawn_enemies action fires
 */
export function onSpawnEnemies(callback: SpawnCallback): void {
  spawnCallback = callback;
}

/**
 * Execute a spawn_enemies action.
 *
 * @param action - QuestAction with type 'spawn_enemies'
 *   Required params:
 *     - type (string): Enemy type identifier (e.g. 'gang', 'police', 'heavy')
 *     - count (number): Number of enemies to spawn
 *   Optional params:
 *     - x (number): Spawn X coordinate (default 0 — use player position or nearby)
 *     - z (number): Spawn Z coordinate (default 0)
 */
export function execute(action: QuestAction): void {
  if (!spawnCallback) return;

  const enemyType = action.params.type as string;
  const count = (action.params.count as number) ?? 1;
  const x = (action.params.x as number) ?? 0;
  const z = (action.params.z as number) ?? 0;

  spawnCallback(enemyType, count, x, z);
}
