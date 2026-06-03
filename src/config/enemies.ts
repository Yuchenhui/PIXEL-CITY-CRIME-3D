import { EnemyTypeName, type EnemyConfig } from '@game/index';

/**
 * Enemy archetype configurations.
 *
 * Balance philosophy:
 *   Civilian — harmless, flees on sight, killing raises wanted level heavily
 *   Gang     — common threat, low accuracy spray-and-pray, moderate HP
 *   Police   — trained accuracy, only hostile when player has wanted stars
 *   Heavy    — slow but tanky, powerful RPG-style weapon with long cooldown
 *
 * Sight ranges are tuned with LOS check in mind (buildings block vision):
 *   Gang 25, Police 30, Heavy 22, Civilian 20 (flee range)
 *
 * Accuracy values represent base hit probability at point-blank range;
 * effective accuracy halves at maximum sight distance.
 */
export const ENEMY_TYPES: Record<EnemyTypeName, EnemyConfig> = {
  [EnemyTypeName.Civilian]:      { hp: 30,  spd: 4,   dmg: 0,  color: 0x6a9a5a, sight: 20, weapon: -1, accuracy: 0 },
  [EnemyTypeName.Gang]:          { hp: 50,  spd: 5,   dmg: 7,  color: 0xaa3333, sight: 25, weapon: 0,  accuracy: 0.4 },
  [EnemyTypeName.Police]:        { hp: 80,  spd: 6,   dmg: 10, color: 0x3333aa, sight: 30, weapon: 3,  accuracy: 0.55 },
  [EnemyTypeName.Heavy]:         { hp: 150, spd: 3,   dmg: 15, color: 0x552222, sight: 22, weapon: 5,  accuracy: 0.45 },
  // Story mode — 九龙城寨 enemies
  [EnemyTypeName.TriadEnforcer]: { hp: 80,  spd: 4.5, dmg: 12, color: 0x882222, sight: 20, weapon: -1, accuracy: 0.5 },
  [EnemyTypeName.CorruptCop]:    { hp: 70,  spd: 5.5, dmg: 10, color: 0x222266, sight: 28, weapon: 3,  accuracy: 0.5 },
  [EnemyTypeName.DrugDealer]:    { hp: 40,  spd: 6,   dmg: 8,  color: 0x884422, sight: 18, weapon: 0,  accuracy: 0.3 },
  [EnemyTypeName.Boss]:          { hp: 300, spd: 3,   dmg: 25, color: 0x440000, sight: 30, weapon: 5,  accuracy: 0.6 },
};

/** Score values for killing each enemy type (before combo multiplier) */
export const ENEMY_SCORE: Record<EnemyTypeName, number> = {
  [EnemyTypeName.Civilian]:      5,
  [EnemyTypeName.Gang]:          20,
  [EnemyTypeName.Police]:        30,
  [EnemyTypeName.Heavy]:         50,
  [EnemyTypeName.TriadEnforcer]: 30,
  [EnemyTypeName.CorruptCop]:    35,
  [EnemyTypeName.DrugDealer]:    15,
  [EnemyTypeName.Boss]:          200,
};

/** Money rewards for killing each enemy type */
export const ENEMY_MONEY: Record<EnemyTypeName, number> = {
  [EnemyTypeName.Civilian]:      20,
  [EnemyTypeName.Gang]:          60,
  [EnemyTypeName.Police]:        100,
  [EnemyTypeName.Heavy]:         150,
  [EnemyTypeName.TriadEnforcer]: 80,
  [EnemyTypeName.CorruptCop]:    100,
  [EnemyTypeName.DrugDealer]:    50,
  [EnemyTypeName.Boss]:          500,
};
