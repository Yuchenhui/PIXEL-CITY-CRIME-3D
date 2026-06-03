import * as THREE from 'three';
import { PickupType, SoundType, type PickupEntity } from '@game/index';
import { WEAPONS } from '@config/weapons';
import { AudioManager } from '@core/AudioManager';
import { StateManager } from '@core/StateManager';
import { distance2D } from '@utils/math';
import { CombatLog } from '@ui/CombatLog';
import { CFG } from '@config/constants';

const PICKUP_COLORS: Record<PickupType, number> = {
  [PickupType.Health]: 0x44ff44,
  [PickupType.Ammo]: 0xffaa44,
  [PickupType.Armor]: 0x4488ff,
};

// Shared pickup geometry (created once)
const SHARED_PICKER_GEO = new THREE.BoxGeometry(0.5, 0.5, 0.5);

/**
 * Pickup management: spawn, animate, collect, and apply effects.
 */
export class PickupSystem {
  private pickups: PickupEntity[] = [];
  private scene: THREE.Scene;

  // Pre-create materials for each pickup type
  private static pickupMats: Record<string, THREE.MeshLambertMaterial> | null = null;

  private static getPickupMat(type: PickupType): THREE.MeshLambertMaterial {
    if (!PickupSystem.pickupMats) {
      PickupSystem.pickupMats = {};
      for (const [t, c] of Object.entries(PICKUP_COLORS)) {
        PickupSystem.pickupMats[t] = new THREE.MeshLambertMaterial({
          color: c, emissive: c, emissiveIntensity: 0.3,
        });
      }
    }
    return PickupSystem.pickupMats[type];
  }

  constructor(
    scene: THREE.Scene,
    private audio: AudioManager,
    private stateManager: StateManager,
    private combatLog: CombatLog,
  ) {
    this.scene = scene;
  }

  /** Spawn a random pickup at position */
  spawnPickup(x: number, z: number): void {
    const types = [PickupType.Health, PickupType.Ammo, PickupType.Armor];
    const type = types[Math.floor(Math.random() * types.length)];
    const mat = PickupSystem.getPickupMat(type);

    const m = new THREE.Mesh(SHARED_PICKER_GEO, mat);
    m.position.set(x, 0.5, z);
    m.castShadow = false;
    this.scene.add(m);

    this.pickups.push({ mesh: m, type, x, z, life: CFG.PICKUP.LIFETIME });
  }

  /** Update pickups: rotation, bobbing, lifetime, collection */
  update(dt: number, playerX: number, playerZ: number): void {
    const s = this.stateManager.getMutableState();

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.mesh.rotation.y += dt * 2;
      p.mesh.position.y = 0.5 + Math.sin(performance.now() / 300) * 0.15;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
        continue;
      }

      const d = distance2D(playerX, playerZ, p.x, p.z);
      if (d < CFG.PICKUP.COLLECT_DIST) {
        // Apply effect
        switch (p.type) {
          case PickupType.Health:
            s.hp = Math.min(100, s.hp + CFG.PICKUP.HEALTH_AMOUNT);
            break;
          case PickupType.Ammo:
            for (let w = 1; w < WEAPONS.length; w++) {
              s.ammo[w] = WEAPONS[w].mag * CFG.PICKUP.AMMO_MAG_MUL;
            }
            break;
          case PickupType.Armor:
            s.armor = Math.min(100, s.armor + CFG.PICKUP.ARMOR_AMOUNT);
            break;
        }

        this.audio.playSound(SoundType.Pickup, 0.3);
        this.combatLog.logPickup(p.type);
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }

  /** Clear all pickups */
  clear(): void {
    for (const p of this.pickups) {
      this.scene.remove(p.mesh);
    }
    this.pickups = [];
  }
}
