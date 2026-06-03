/**
 * Set flag action executor.
 * Sets a story flag to the specified value.
 *
 * Flag values are stored in StoryManager. This executor dispatches to a
 * registered callback that applies the flag to the StoryManager instance.
 */

import type { QuestAction } from '../types';

type FlagCallback = (key: string, value: boolean) => void;

let flagCallback: FlagCallback | null = null;

/**
 * Register a handler for set_flag actions.
 * The handler should apply the flag to the StoryManager.
 *
 * @param callback - Called with (flagKey, flagValue) when a set_flag action fires
 */
export function onSetFlag(callback: FlagCallback): void {
  flagCallback = callback;
}

/**
 * Execute a set_flag action.
 *
 * @param action - QuestAction with type 'set_flag'
 *   Required params:
 *     - key (string): Flag name to set
 *   Optional params:
 *     - value (boolean): Flag value to set (default true)
 */
export function execute(action: QuestAction): void {
  if (!flagCallback) return;

  const key = action.params.key as string;
  const value = (action.params.value as boolean) ?? true;

  flagCallback(key, value);
}
