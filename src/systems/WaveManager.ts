import { GameMode, EnemyTypeName } from '@game/index';
import { CFG } from '@config/constants';
import { StateManager } from '@core/StateManager';
import { EnemyAI } from './EnemyAI';

/**
 * Wave management: survival mode wave progression and freeroam enemy respawn.
 *
 * Survival mode design:
 *   - Each wave spawns 3 + wave×2 enemies (wave 1 = 5, wave 5 = 13, wave 10 = 23)
 *   - Enemy types unlock progressively: gang always, police at wave 3, heavy at wave 5
 *   - 5-second break between waves for the player to reposition / buy weapons
 *   - Score bonus of wave×100 per wave cleared
 *
 * Freeroam design:
 *   - Maintains a minimum alive count (FREEROAM_MIN_ENEMIES) by trickling in spawns
 *   - Respawn probability is dt×0.5 per frame ≈ one spawn attempt every ~2 seconds
 *   - Police/heavy types only appear when the player has a matching wanted level
 */
export class WaveManager {
  constructor(
    private stateManager: StateManager,
    private enemyAI: EnemyAI,
  ) {}

  /** Dispatch to survival or freeroam wave logic */
  update(dt: number, playerX: number, playerZ: number): void {
    const s = this.stateManager.getMutableState();

    if (s.mode === GameMode.Survival) {
      this.updateSurvival(dt, playerX, playerZ);
    } else if (s.mode === GameMode.FreeRoam) {
      this.updateFreeroam(dt, playerX, playerZ);
    }
    // Story mode: no automatic wave spawning (enemies spawned by story events)
  }

  /**
   * Survival wave logic.
   * Enemy count formula: 3 + wave × 2 (linear growth for steadily rising difficulty).
   * Between waves: 5-second pause so the player can recover.
   */
  private updateSurvival(dt: number, playerX: number, playerZ: number): void {
    const s = this.stateManager.getMutableState();

    if (s.waveBreak) {
      // Inter-wave break countdown
      s.waveBreakTimer -= dt;
      if (s.waveBreakTimer <= 0) {
        s.waveBreak = false;
        s.wave++;

        // Type unlock: gang always, police from wave 3, heavy from wave 5
        const types: EnemyTypeName[] = [EnemyTypeName.Gang];
        if (s.wave >= 3) types.push(EnemyTypeName.Police);
        if (s.wave >= 5) types.push(EnemyTypeName.Heavy);

        // Linear enemy count scaling
        this.enemyAI.spawnEnemies(CFG.WAVE.BASE_COUNT + s.wave * CFG.WAVE.COUNT_PER_WAVE, types, playerX, playerZ);
        s.score += s.wave * CFG.WAVE.CLEAR_BONUS; // Wave clear bonus
      }
    } else {
      // Wave in progress — advance when all enemies are dead
      const alive = this.enemyAI.getAliveCount();
      if (alive === 0) {
        s.waveBreak = true;
        s.waveBreakTimer = CFG.WAVE.BREAK_DURATION; // 5-second break between waves
      }
    }
  }

  /**
   * Freeroam respawn: trickle enemies when alive count drops below threshold.
   * dt×0.5 probability ≈ one spawn check every ~2 seconds on average,
   * keeping the world populated without overwhelming the player.
   */
  private updateFreeroam(dt: number, playerX: number, playerZ: number): void {
    const s = this.stateManager.getMutableState();
    const aliveCount = this.enemyAI.getAliveCount();

    if (aliveCount < CFG.FREEROAM_MIN_ENEMIES && Math.random() < dt * CFG.WAVE.FREEROAM_RESPAWN_RATE) {
      // Civilian and gang are common; duplicates weight the random pick
      const types: EnemyTypeName[] = [EnemyTypeName.Civilian, EnemyTypeName.Gang, EnemyTypeName.Gang];
      if (s.wanted >= 1) types.push(EnemyTypeName.Police);   // Police only at wanted 1+
      if (s.wanted >= 3) types.push(EnemyTypeName.Heavy);    // Heavy only at wanted 3+
      this.enemyAI.spawnEnemies(1, types, playerX, playerZ);
    }
  }
}
