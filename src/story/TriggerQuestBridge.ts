/**
 * Bridge connecting trigger zone activations to story and quest managers.
 * Translates zone actions into StoryManager calls and eventBus emissions.
 */

import { eventBus } from '@core/EventBus';
import type { StoryManager } from './StoryManager';
import type { TriggerZoneDef } from './TriggerZone';
import type { ZoneManager } from './ZoneManager';

/** Bridges trigger zone activations to story/quest managers */
export class TriggerQuestBridge {
  constructor(
    private zoneManager: ZoneManager,
    private storyManager: StoryManager,
  ) {
    this.init();
  }

  /** Initialise the bridge by wiring the zone activation callback */
  private init(): void {
    this.zoneManager.setActivationCallback((zone) => {
      this.handleActivation(zone);
    });
  }

  /**
   * Handle a zone activation and dispatch to the appropriate story action.
   * @param zone - The trigger zone that was activated
   */
  private handleActivation(zone: TriggerZoneDef): void {
    switch (zone.action) {
      case 'start_mission': {
        const missionId = zone.actionParams.missionId as string | undefined;
        if (missionId) {
          this.storyManager.startMission(missionId);
        }
        break;
      }

      case 'trigger_dialogue': {
        const inkFile = zone.actionParams.inkFile as string | undefined;
        const knot = zone.actionParams.knot as string | undefined;
        if (inkFile) {
          eventBus.emit('story:trigger-dialogue', { inkFile, knot });
        }
        break;
      }

      case 'set_flag': {
        const key = zone.actionParams.key as string | undefined;
        const value = zone.actionParams.value as boolean | undefined;
        if (key !== undefined) {
          this.storyManager.setFlag(key, value ?? true);
        }
        break;
      }

      case 'spawn_enemies': {
        const count = (zone.actionParams.count as number | undefined) ?? 3;
        const type = (zone.actionParams.type as string | undefined) ?? 'gang';
        eventBus.emit('story:spawn-enemies', {
          count,
          type,
          x: zone.x,
          z: zone.z,
        });
        break;
      }
    }
  }
}
