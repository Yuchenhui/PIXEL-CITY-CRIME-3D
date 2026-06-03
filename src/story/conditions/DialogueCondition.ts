/**
 * Dialogue condition checker.
 * Returns true when an ink dialogue has been completed.
 *
 * Dialogue completion is tracked externally — this condition returns true
 * when the dialogue has been marked as finished for the given dialogue id.
 */

import type { QuestCondition } from '../types';

/**
 * Check if a dialogue has been completed.
 *
 * @param condition - QuestCondition with type 'dialogue'
 *   Required params:
 *     - dialogueId (string): Unique dialogue identifier to check
 * @param completedDialogues - Set or record of completed dialogue ids
 * @returns true if the dialogue has been marked complete
 */
export function check(
  condition: QuestCondition,
  completedDialogues: Set<string> | Record<string, boolean>,
): boolean {
  const dialogueId = condition.params.dialogueId as string;

  if (completedDialogues instanceof Set) {
    return completedDialogues.has(dialogueId);
  }
  return completedDialogues[dialogueId] === true;
}
