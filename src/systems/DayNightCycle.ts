import { Engine } from '@core/Engine';
import { CFG } from '@config/constants';
import { StateManager } from '@core/StateManager';

/**
 * Day/night cycle: controls sun position, sky color, lighting intensity.
 */
export class DayNightCycle {
  constructor(
    private engine: Engine,
    private stateManager: StateManager,
  ) {}

  update(dt: number): void {
    const s = this.stateManager.getMutableState();
    s.dayTime = (s.dayTime + dt / CFG.DAY_LENGTH) % 1;

    const t = s.dayTime;
    const sunAngle = t * Math.PI * 2 - Math.PI / 2;
    const dayFactor = Math.max(0, Math.sin(t * Math.PI * 2 - Math.PI / 2));

    this.engine.setSkyFromDayFactor(dayFactor, sunAngle);
  }
}
