/**
 * Kill-count condition checker.
 * Returns true when the tracked kill count for an objective reaches the required threshold.
 *
 * The actual kill count is managed externally (via QuestManager.setKillCount) and
 * the QuestManager evaluates this condition during its update loop.
 */

import type { QuestCondition } from '../types';

/**
 * Check if the kill count for a specific objective meets the required threshold.
 * This is a passthrough checker — the QuestManager holds the kill counts and
 * the actual comparison happens via the kill_count condition in QuestManager.evaluateCondition.
 * This function is provided for standalone condition evaluation when a QuestManager
 * instance is not available.
 *
 * @param condition - QuestCondition with type 'kill_count'
 *   Required params:
 *     - missionId (string): Mission identifier
 *     - objectiveId (string): Objective within that mission
 *     - required (number): Required kill count (default 1)
 * @param currentCount - Current kill count from external tracker
 * @returns true if currentCount >= required
 */
export function check(condition: QuestCondition, currentCount: number): boolean {
  const required = (condition.params.required as number) ?? 1;
  return currentCount >= required;
}
