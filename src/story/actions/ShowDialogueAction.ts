/**
 * Show dialogue action executor.
 * Triggers an ink story dialogue to be displayed in the HUD.
 *
 * The actual dialogue rendering is handled by the UI layer (e.g. HUDController).
 * This executor fires a callback that the UI subscribes to in order to display
 * the dialogue panel with the ink story content.
 */

import type { QuestAction } from '../types';

type DialogueCallback = (inkFile: string, knot?: string) => void;

let dialogueCallback: DialogueCallback | null = null;

/**
 * Register a handler for dialogue actions.
 * The handler is responsible for loading the ink file and displaying the dialogue UI.
 *
 * @param callback - Called with (inkFile, optionalKnot) when a dialogue action fires
 */
export function onDialogue(callback: DialogueCallback): void {
  dialogueCallback = callback;
}

/**
 * Execute a show_dialogue action.
 *
 * @param action - QuestAction with type 'dialogue'
 *   Required params:
 *     - inkFile (string): Path to the ink JSON file (relative to public/)
 *   Optional params:
 *     - knot (string): Ink knot name to start from
 */
export function execute(action: QuestAction): void {
  if (!dialogueCallback) return;

  const inkFile = action.params.inkFile as string;
  const knot = action.params.knot as string | undefined;

  dialogueCallback(inkFile, knot);
}
