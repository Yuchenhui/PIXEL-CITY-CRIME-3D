import { GameStateType, GameMode, EnemyTypeName, type BuildingData } from '@game/index';
import { CFG } from '@config/constants';
import { Engine } from '@core/Engine';
import { InputManager } from '@core/InputManager';
import { AudioManager } from '@core/AudioManager';
import { PhysicsManager } from '@core/PhysicsManager';
import { StateManager } from '@core/StateManager';
import { PlayerController } from '@systems/PlayerController';
import { VehicleSystem } from '@systems/VehicleSystem';
import { ShootingSystem } from '@systems/ShootingSystem';
import { EnemyAI } from '@systems/EnemyAI';
import { DayNightCycle } from '@systems/DayNightCycle';
import { PickupSystem } from '@systems/PickupSystem';
import { ParticleManager } from '@systems/ParticleManager';
import { WaveManager } from '@systems/WaveManager';
import { WorldGenerator } from '@world/WorldGenerator';
import { HUDController } from '@ui/HUDController';
import { MinimapRenderer } from '@ui/MinimapRenderer';
import { MenuController } from '@ui/MenuController';
import { CombatLog } from '@ui/CombatLog';
import { WeaponShop } from '@ui/WeaponShop';
import { eventBus } from '@core/EventBus';

/**
 * Shared mutable references to all game systems.
 * Populated by Game.ts, shared between GameFlowController and GameLoop.
 * System fields are set by Game.initSystems() and may be replaced on restart.
 */
export interface GameRefs {
  // Core (always initialized)
  engine: Engine;
  input: InputManager;
  audio: AudioManager;
  physics: PhysicsManager;
  stateManager: StateManager;

  // World (mutable — replaced on restart)
  worldGenerator: WorldGenerator;
  buildingGrid: BuildingData[];

  // Systems (mutable — replaced on restart via initSystems)
  particleManager: ParticleManager;
  pickupSystem: PickupSystem;
  enemyAI: EnemyAI;
  shootingSystem: ShootingSystem;
  vehicleSystem: VehicleSystem;
  playerController: PlayerController;
  dayNightCycle: DayNightCycle;
  waveManager: WaveManager;

  // UI (always initialized)
  hud: HUDController;
  minimap: MinimapRenderer;
  menu: MenuController;
  combatLog: CombatLog;
  weaponShop: WeaponShop;

  /** Callback to reinitialize all game systems (called on restart) */
  initSystems: () => void;
}

/**
 * Game flow controller: owns game state transitions.
 * Handles start, pause, resume, restart, menu, game over, save/load.
 */
export class GameFlowController {
  constructor(
    private refs: GameRefs,
    private volumeSlider: HTMLInputElement,
    private volumeLabel: HTMLElement,
  ) {}

  /** Start a new game with the given mode */
  startGame(mode: string): void {
    const r = this.refs;
    r.audio.init();

    const gameMode = mode === 'survival' ? GameMode.Survival : GameMode.FreeRoam;
    r.stateManager.resetForNewGame(gameMode);

    // Sync audio with state
    const ms = r.stateManager.getMutableState();
    r.audio.setVolume(ms.volume);
    r.audio.setMuted(ms.muted);

    // Clear existing world
    r.engine.clearGroups();
    r.enemyAI.clear();
    r.vehicleSystem.clear();
    r.particleManager.clear();
    r.pickupSystem.clear();
    r.worldGenerator.dispose();
    r.physics.clearBuildings();

    // Generate fresh world
    r.worldGenerator = new WorldGenerator();
    r.buildingGrid = r.worldGenerator.generate(r.engine.worldGroup);
    r.physics.buildFromBuildingGrid(r.buildingGrid);

    // Re-init systems with new world data
    r.initSystems();

    // Reset camera
    r.engine.camera.position.set(0, CFG.PLAYER_H, 5);
    r.engine.camera.rotation.set(0, 0, 0);
    r.engine.camera.fov = 75;
    r.engine.camera.updateProjectionMatrix();

    // Spawn initial entities
    r.vehicleSystem.spawnVehicles(CFG.VEHICLE_COUNT);
    if (gameMode === GameMode.Survival) {
      const s = r.stateManager.getMutableState();
      s.wave = 1;
      r.enemyAI.spawnEnemies(CFG.INITIAL_SURVIVAL_ENEMIES, [EnemyTypeName.Gang, EnemyTypeName.Civilian], 0, 5);
    } else {
      r.enemyAI.spawnEnemies(
        CFG.INITIAL_FREEROAM_ENEMIES,
        [EnemyTypeName.Civilian, EnemyTypeName.Civilian, EnemyTypeName.Gang, EnemyTypeName.Gang],
        0, 5,
      );
    }

    // Show HUD, hide menus
    r.menu.hideAll();
    r.hud.show();
    r.combatLog.show();
    document.body.classList.add('playing');

    // Request pointer lock
    r.input.requestPointerLock();
    eventBus.emit('game-state-change', { state: 'playing' });
  }

  pauseGame(): void {
    const r = this.refs;
    r.stateManager.set('state', GameStateType.Paused);
    r.menu.showPause();
    r.input.exitPointerLock();
    document.body.classList.remove('playing');

    // Sync volume slider with current state
    const s = r.stateManager.getState();
    this.volumeSlider.value = `${Math.round(s.volume * 100)}`;
    this.volumeLabel.textContent = `${Math.round(s.volume * 100)}%`;
    eventBus.emit('game-state-change', { state: 'paused' });
  }

  resumeGame(): void {
    const r = this.refs;
    r.stateManager.set('state', GameStateType.Playing);
    r.menu.hidePause();
    r.input.requestPointerLock();
    document.body.classList.add('playing');
    eventBus.emit('game-state-change', { state: 'playing' });
  }

  restartGame(): void {
    this.refs.menu.hidePause();
    this.startGame(this.refs.stateManager.getState().mode);
  }

  backToMenu(): void {
    const r = this.refs;
    r.stateManager.set('state', GameStateType.Menu);
    r.menu.hideAll();
    r.hud.hide();
    r.combatLog.hide();
    r.menu.showMainMenu();
    r.input.exitPointerLock();
    document.body.classList.remove('playing');

    // Reset camera for menu
    r.engine.camera.position.set(0, 20, 30);
    r.engine.camera.rotation.set(-0.3, 0, 0);
    eventBus.emit('game-state-change', { state: 'menu' });
  }

  triggerGameOver(): void {
    const r = this.refs;
    r.stateManager.set('state', GameStateType.GameOver);
    r.input.exitPointerLock();
    document.body.classList.remove('playing');

    const s = r.stateManager.getState();
    const accuracy = s.totalShots > 0 ? Math.round(s.hits / s.totalShots * 100) : 0;
    r.menu.showGameOver({
      score: s.score,
      kills: s.kills,
      time: s.time,
      accuracy,
      maxWanted: s.maxWanted,
      wave: s.mode === GameMode.Survival ? s.wave : undefined,
    });
    eventBus.emit('game-state-change', { state: 'gameover' });
  }

  /** Save current game to localStorage */
  saveGame(): void {
    const r = this.refs;
    const s = r.stateManager.getState();
    if (s.state !== GameStateType.Playing && s.state !== GameStateType.Paused) return;

    const cam = r.engine.camera.position;
    const ok = r.stateManager.save({ x: cam.x, y: cam.y, z: cam.z });
    if (ok) {
      r.combatLog.push('游戏已保存', '#44ffaa');
    } else {
      r.combatLog.push('保存失败', '#ff5555');
    }
  }

  /** Load saved game from localStorage */
  loadGame(): void {
    const r = this.refs;
    const s = r.stateManager.getState();
    if (s.state !== GameStateType.Playing && s.state !== GameStateType.Paused) return;

    const cam = r.stateManager.load();
    if (!cam) {
      r.combatLog.push('没有找到存档', '#ff8888');
      return;
    }

    // Exit vehicle if currently in one
    if (s.inVehicle !== null) {
      r.vehicleSystem.clear();
      const ms = r.stateManager.getMutableState();
      ms.inVehicle = null;
    }

    // Clear enemies, pickups, particles — regenerate fresh
    r.enemyAI.clear();
    r.pickupSystem.clear();
    r.particleManager.clear();

    // Respawn vehicles
    r.vehicleSystem.spawnVehicles(CFG.VEHICLE_COUNT);

    // Respawn enemies based on mode
    const loadedState = r.stateManager.getState();
    if (loadedState.mode === GameMode.Survival) {
      if (loadedState.wave > 0) {
        r.enemyAI.spawnEnemies(
          Math.min(3 + loadedState.wave * 2, 40),
          [EnemyTypeName.Gang, EnemyTypeName.Civilian],
          cam.x, cam.z,
        );
      }
    } else {
      r.enemyAI.spawnEnemies(
        CFG.INITIAL_FREEROAM_ENEMIES,
        [EnemyTypeName.Civilian, EnemyTypeName.Civilian, EnemyTypeName.Gang, EnemyTypeName.Gang],
        cam.x, cam.z,
      );
    }

    // Reposition camera
    r.engine.camera.position.set(cam.x, cam.y, cam.z);
    r.engine.camera.rotation.set(0, 0, 0);
    r.engine.camera.fov = 75;
    r.engine.camera.updateProjectionMatrix();

    // Restore to playing state
    r.stateManager.set('state', GameStateType.Playing);
    r.menu.hidePause();
    r.hud.show();
    r.combatLog.show();
    document.body.classList.add('playing');
    r.input.requestPointerLock();

    r.combatLog.push('游戏已加载', '#44ffaa');
  }
}
