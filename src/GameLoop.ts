import * as THREE from 'three';
import { GameStateType, EnemyState, AmbientType } from '@game/index';
import { CFG } from '@config/constants';
import { KOWLOON_CENTRE_X, KOWLOON_CENTRE_Z, KOWLOON_RADIUS } from '@world/StoryLocations';
import type { GameRefs } from './GameFlowController';

/**
 * Game loop: owns the requestAnimationFrame loop and all per-frame updates.
 * Handles combo/wanted decay, system updates, threat scanning, HUD/minimap updates,
 * volume indicator fade, and death check.
 */
export class GameLoop {
  private running = false;
  private minimapTimer = 0;
  private threatTimer = 0;
  private volumeIndicatorTimer = 0;
  private _camDir = new THREE.Vector3();
  // Kowloon ambient sound state
  private kowloonAmbientActive = false;

  constructor(
    private refs: GameRefs,
    private volumeIndicator: HTMLElement,
    private onDeath: () => void,
  ) {}

  start(): void {
    this.running = true;
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
  }

  /** Show a brief volume indicator on the HUD */
  showVolumeIndicator(text: string): void {
    this.volumeIndicator.textContent = text;
    this.volumeIndicator.style.opacity = '1';
    this.volumeIndicatorTimer = 1.5;
  }

  /** Main game loop (arrow function for requestAnimationFrame binding) */
  private gameLoop = (): void => {
    if (!this.running) return;
    requestAnimationFrame(this.gameLoop);

    const r = this.refs;
    const dt = r.engine.getDelta();
    const s = r.stateManager.getMutableState();

    if (s.state === GameStateType.Playing && !r.weaponShop.openState) {
      s.time += dt;

      // Combo decay
      if (s.comboTimer > 0) {
        s.comboTimer -= dt;
        if (s.comboTimer <= 0) s.combo = 0;
      }

      // Wanted decay
      if (s.wanted > 0) {
        s.wantedTimer -= dt;
        if (s.wantedTimer <= 0) {
          s.wanted = Math.max(0, s.wanted - 1);
          s.wantedTimer = CFG.GAME.WANTED_DECAY_TIMER;
        }
      }

      // Wave management
      r.waveManager.update(dt, r.engine.camera.position.x, r.engine.camera.position.z);

      // Story mode: skip combat updates during dialogue
      const dialogueActive = r.dialogueManager?.active ?? false;

      // Story mode: NPC animations every frame for smooth idle sway
      if (r.npcManager) {
        r.npcManager.update(dt, r.engine.camera.position.x, r.engine.camera.position.z);
      }

      // Story update at 5 Hz (throttled)
      if (r.storyManager) {
        r.storyUpdateAccum += dt;
        const interval = 1 / CFG.STORY.UPDATE_HZ;
        if (r.storyUpdateAccum >= interval) {
          r.storyUpdateAccum -= interval;
          // updateStory is called directly from refs - find the flowController
          // We call it via a callback set by GameFlowController
          const fc = (this as unknown as { _flowController?: { updateStory: (dt: number) => void } })._flowController;
          if (fc) fc.updateStory(dt);
        }
      }

      // Skip player/enemy updates during dialogue
      if (!dialogueActive) {
        // Update all systems
        r.playerController.update(dt);
        r.enemyAI.update(
          dt,
          r.engine.camera.position.x,
          r.engine.camera.position.z,
          (dmg, type) => r.playerController.takeDamage(dmg, type),
        );
        r.pickupSystem.update(dt, r.engine.camera.position.x, r.engine.camera.position.z);
      }

      r.particleManager.update(dt);
      r.dayNightCycle.update(dt);
      // Update Kowloon details (rat animation etc.)
      r.worldGenerator?.update();
      r.dayNightCycle.update(dt);

      // Threat scan (every 2 seconds)
      this.threatTimer += dt;
      if (this.threatTimer >= CFG.GAME.THREAT_SCAN_INTERVAL) {
        this.threatTimer = 0;
        this.scanThreats();
      }

      // Update combat log fade
      r.combatLog.update();

      // Volume indicator fade
      if (this.volumeIndicatorTimer > 0) {
        this.volumeIndicatorTimer -= dt;
        if (this.volumeIndicatorTimer <= 0) {
          this.volumeIndicator.style.opacity = '0';
        }
      }

      // Kowloon ambient sound: start/stop based on player position
      const px = r.engine.camera.position.x;
      const pz = r.engine.camera.position.z;
      const dx = px - KOWLOON_CENTRE_X;
      const dz = pz - KOWLOON_CENTRE_Z;
      const inKowloon = Math.sqrt(dx * dx + dz * dz) < KOWLOON_RADIUS;

      if (inKowloon && !this.kowloonAmbientActive) {
        // Player entered Kowloon — start ambient sounds and background music
        this.kowloonAmbientActive = true;
        r.audio.startAmbient(AmbientType.Rain, 0.5);
        r.audio.startAmbient(AmbientType.Chatter, 0.4);
        r.audio.startAmbient(AmbientType.Machinery, 0.25);
        r.audio.startAmbient(AmbientType.Dripping, 0.3);
        r.audio.startAmbient(AmbientType.NeonBuzz, 0.2);
        r.audio.startAmbient(AmbientType.Sizzling, 0.3);
        r.audio.startAmbient(AmbientType.Chopping, 0.25);
        r.audio.startAmbient(AmbientType.VendorCalls, 0.15);
        r.audio.startAmbient(AmbientType.Mahjong, 0.2);
        r.audio.startAmbient(AmbientType.TvStatic, 0.15);
        r.audio.playMusic('/audio/kowloon_ambient.mp3', 0.5);
      } else if (!inKowloon && this.kowloonAmbientActive) {
        // Player left Kowloon — stop all ambient sounds and music
        this.kowloonAmbientActive = false;
        r.audio.stopAllAmbient();
        r.audio.stopMusic();
      }

      // Check death
      if (s.hp <= 0) {
        this.onDeath();
      }

      // Update HUD
      const vehicleSpeed = s.inVehicle !== null
        ? r.vehicleSystem.getVehicles()[s.inVehicle]?.speed ?? null
        : null;
      const nearVehicle = s.inVehicle === null
        ? r.vehicleSystem.isNearVehicle(r.engine.camera.position.x, r.engine.camera.position.z)
        : false;
      r.hud.update(r.stateManager, vehicleSpeed, nearVehicle);

      // Minimap (throttled)
      this.minimapTimer += dt;
      if (this.minimapTimer >= CFG.GAME.MINIMAP_INTERVAL) {
        this.minimapTimer = 0;
        r.minimap.render(
          r.buildingGrid,
          r.engine.camera.position.x,
          r.engine.camera.position.z,
          r.enemyAI.getEnemies(),
          r.vehicleSystem.getVehicles(),
          s.minimapZoom,
        );
      }
    } else if (s.state === GameStateType.Menu) {
      // Slow camera pan for menu background
      r.engine.camera.position.x += dt * CFG.GAME.MENU_CAM_PAN_SPEED;
      r.engine.camera.position.y = CFG.GAME.MENU_CAM_HEIGHT;
      r.engine.camera.position.z += dt * CFG.GAME.MENU_CAM_Z_SPEED;
      r.engine.camera.rotation.x = -0.3;
      r.dayNightCycle.update(dt);
    }

    r.engine.render();
  };

  /** Inject flow controller reference for story updates */
  setFlowController(fc: { updateStory: (dt: number) => void }): void {
    (this as unknown as { _flowController: { updateStory: (dt: number) => void } })._flowController = fc;
  }

  /** Scan for nearby threats and report to combat log */
  private scanThreats(): void {
    const r = this.refs;
    const px = r.engine.camera.position.x;
    const pz = r.engine.camera.position.z;
    const enemies = r.enemyAI.getEnemies();

    // Get camera forward direction
    r.engine.camera.getWorldDirection(this._camDir);
    const forwardAngle = Math.atan2(this._camDir.x, this._camDir.z);

    let front = 0, back = 0, left = 0, right = 0;
    const scanRange = CFG.GAME.THREAT_SCAN_RANGE;

    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - px;
      const dz = e.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > scanRange) continue;

      // Check if enemy is attacking or chasing
      if (e.state !== EnemyState.Attack && e.state !== EnemyState.Chase) continue;

      const enemyAngle = Math.atan2(dx, dz);
      let rel = enemyAngle - forwardAngle;
      // Normalize to [-PI, PI]
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;

      if (Math.abs(rel) < Math.PI / 4) front++;
      else if (Math.abs(rel) > Math.PI * 3 / 4) back++;
      else if (rel > 0) right++;
      else left++;
    }

    const dirs: [string, number][] = [
      ['前方', front], ['后方', back], ['左侧', left], ['右侧', right],
    ];
    for (const [dir, count] of dirs) {
      if (count > 0) r.combatLog.logThreat(dir, count);
    }
  }
}
