/**
 * Proximity condition checker.
 * Returns true when the player is within a given radius of a target position.
 */

import type { QuestCondition } from '../types';

/**
 * Check if the player is within range of the target position.
 *
 * @param condition - QuestCondition with type 'proximity'
 *   Required params:
 *     - x (number): Target world X coordinate
 *     - z (number): Target world Z coordinate
 *     - range (number, optional): Trigger radius (default 20 units)
 * @param playerX - Player world X coordinate
 * @param playerZ - Player world Z coordinate
 * @returns true if Euclidean distance < range
 */
export function check(condition: QuestCondition, playerX: number, playerZ: number): boolean {
  const targetX = condition.params.x as number;
  const targetZ = condition.params.z as number;
  const range = (condition.params.range as number) ?? 20;

  const dx = playerX - targetX;
  const dz = playerZ - targetZ;
  return Math.sqrt(dx * dx + dz * dz) < range;
}
