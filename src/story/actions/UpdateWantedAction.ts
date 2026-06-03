/**
 * Update wanted level action executor.
 * Modifies the player's wanted level (adds, sets, or clears stars).
 *
 * Applied via StateManager. This executor dispatches to a registered callback
 * that updates the wanted level in the game state.
 */

import type { QuestAction } from '../types';

/** How to modify the wanted level */
export type WantedMode = 'add' | 'set' | 'clear';

type WantedCallback = (mode: WantedMode, amount: number) => void;

let wantedCallback: WantedCallback | null = null;

/**
 * Register a handler for update_wanted actions.
 * The handler should apply the wanted level change via StateManager.
 *
 * @param callback - Called with (mode, amount) when an update_wanted action fires
 */
export function onUpdateWanted(callback: WantedCallback): void {
  wantedCallback = callback;
}

/**
 * Execute an update_wanted action.
 *
 * @param action - QuestAction with type 'update_wanted'
 *   Required params:
 *     - mode (string): 'add', 'set', or 'clear'
 *   Optional params:
 *     - amount (number): Stars to add or set (for 'add' and 'set' modes; default 0)
 */
export function execute(action: QuestAction): void {
  if (!wantedCallback) return;

  const modeStr = (action.params.mode as string) ?? 'set';
  const mode = modeStr as WantedMode;
  const amount = (action.params.amount as number) ?? 0;

  wantedCallback(mode, amount);
}
