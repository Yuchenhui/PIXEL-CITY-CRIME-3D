/**
 * Give reward action executor.
 * Grants money, score, and/or weapon unlocks to the player.
 *
 * Reward values are applied via StateManager. This executor dispatches to a
 * registered callback that applies the reward to the current game state.
 */

import type { QuestAction } from '../types';

/** Parameters needed to apply a reward */
export interface RewardParams {
  money?: number;
  score?: number;
  weapons?: number[];
}

type RewardCallback = (params: RewardParams) => void;

let rewardCallback: RewardCallback | null = null;

/**
 * Register a handler for give_reward actions.
 * The handler should apply the reward to the game state via StateManager.
 *
 * @param callback - Called with RewardParams when a give_reward action fires
 */
export function onGiveReward(callback: RewardCallback): void {
  rewardCallback = callback;
}

/**
 * Execute a give_reward action.
 *
 * @param action - QuestAction with type 'give_reward'
 *   Optional params:
 *     - money (number): Cash to add
 *     - score (number): Score to add
 *     - weapons (number[]): Weapon slot indices to unlock
 */
export function execute(action: QuestAction): void {
  if (!rewardCallback) return;

  const params: RewardParams = {};

  if (action.params.money !== undefined) {
    params.money = action.params.money as number;
  }
  if (action.params.score !== undefined) {
    params.score = action.params.score as number;
  }
  if (Array.isArray(action.params.weapons)) {
    params.weapons = action.params.weapons as number[];
  }

  rewardCallback(params);
}
