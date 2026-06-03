/**
 * Flag condition checker.
 * Returns true when a story flag matches the expected value.
 *
 * Flag values are provided via a context object at evaluation time,
 * as the QuestManager does not hold flags directly — those are owned
 * by the StoryManager.
 */

import type { QuestCondition } from '../types';

/**
 * Check if a story flag matches the expected value.
 *
 * @param condition - QuestCondition with type 'flag'
 *   Required params:
 *     - key (string): Flag name to check
 *     - value (boolean, optional): Expected value (default true)
 * @param flags - Record of flag key/value pairs (typically from StoryManager)
 * @returns true if the flag matches the expected value
 */
export function check(condition: QuestCondition, flags: Record<string, boolean>): boolean {
  const key = condition.params.key as string;
  const expected = (condition.params.value as boolean) ?? true;
  const actual = flags[key] ?? false;
  return actual === expected;
}
