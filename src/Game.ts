import * as THREE from 'three';
import { GameStateType, GameMode, EnemyTypeName, EnemyState, SoundType, type BuildingData } from '@game/index';
import { CFG } from '@config/constants';

// Core
import { Engine } from '@core/Engine';
import { InputManager } from '@core/InputManager';
import { AudioManager } from '@core/AudioManager';
import { PhysicsManager } from '@core/PhysicsManager';
import { StateManager } from '@core/StateManager';

// Systems
import { PlayerController } from '@systems/PlayerController';
import { VehicleSystem } from '@systems/VehicleSystem';
import { ShootingSystem } from '@systems/ShootingSystem';
import { EnemyAI } from '@systems/EnemyAI';
import { DayNightCycle } from '@systems/DayNightCycle';
import { PickupSystem } from '@systems/PickupSystem';
import { ParticleManager } from '@systems/ParticleManager';
import { WaveManager } from '@systems/WaveManager';

// World
import { WorldGenerator } from '@world/WorldGenerator';

// UI
import { HUDController } from '@ui/HUDController';
import { MinimapRenderer } from '@ui/MinimapRenderer';
import { MenuController } from '@ui/MenuController';
import { CombatLog } from '@ui/CombatLog';
import { WeaponShop } from '@ui/WeaponShop';

/**
 * Main Game class: holds all subsystem references, manages game lifecycle.
 */
export class Game {
  // Core
  private engine: Engine;
  private input: InputManager;
  private audio: AudioManager;
  private physics: PhysicsManager;
  private stateManager: StateManager;

  // Systems
  private playerController!: PlayerController;
  private vehicleSystem!: VehicleSystem;
  private shootingSystem!: ShootingSystem;
  private enemyAI!: EnemyAI;
  private dayNightCycle!: DayNightCycle;
  private pickupSystem!: PickupSystem;
  private particleManager!: ParticleManager;
  private waveManager!: WaveManager;

  // World
  private worldGenerator: WorldGenerator;
  private buildingGrid: BuildingData[] = [];

  // UI
  private hud: HUDController;
  private minimap: MinimapRenderer;
  private menu: MenuController;
  private combatLog: CombatLog;
  private weaponShop: WeaponShop;

  // Internal state
  private minimapTimer = 0;
  private threatTimer = 0;
  private _camDir = new THREE.Vector3();
  private running = false;

  constructor() {
    // Initialize core
    this.engine = new Engine();
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.physics = new PhysicsManager();
    this.stateManager = new StateManager();
    this.worldGenerator = new WorldGenerator();

    // Initialize UI
    this.hud = new HUDController();
    this.minimap = new MinimapRenderer(document.getElementById('minimap') as HTMLCanvasElement);
    this.combatLog = new CombatLog();
    this.weaponShop = new WeaponShop(this.stateManager, this.combatLog);
    this.menu = new MenuController(
      (mode) => this.startGame(mode),
      () => this.resumeGame(),
      () => this.restartGame(),
      () => this.backToMenu(),
    );

    // Enable input
    this.input.enable(this.engine.renderer.domElement);

    // Handle pointer lock change for click prompt
    document.addEventListener('pointerlockchange', () => {
      const s = this.stateManager.getState();
      if (s.state === GameStateType.Playing && !this.input.isPointerLocked) {
        this.menu.showClickPrompt();
      } else {
        this.menu.hideClickPrompt();
      }
    });

    // Handle Escape key for pause, B for weapon shop
    document.addEventListener('keydown', (e) => {
      const s = this.stateManager.getState().state;
      if (e.code === 'Escape') {
        if (this.weaponShop.openState) {
          this.weaponShop.close();
          this.input.requestPointerLock();
          document.body.classList.add('playing');
        } else if (s === GameStateType.Playing) {
          this.pauseGame();
        }
      }
      if (e.code === 'KeyB' && s === GameStateType.Playing) {
        if (this.weaponShop.openState) {
          this.weaponShop.close();
          this.input.requestPointerLock();
          document.body.classList.add('playing');
        } else {
          this.weaponShop.open();
          this.input.exitPointerLock();
          document.body.classList.remove('playing');
        }
      }
    });
  }

  /** Initialize the game world and start the loop */
  init(): void {
    // Generate initial world for menu background
    this.buildingGrid = this.worldGenerator.generate(this.engine.worldGroup);
    this.physics.addGroundPlane();
    this.physics.buildFromBuildingGrid(this.buildingGrid);

    // Init systems that depend on the world
    this.initSystems();

    // Spawn initial enemies for menu
    this.enemyAI.spawnEnemies(10, [EnemyTypeName.Civilian, EnemyTypeName.Gang], 0, 0);

    // Position camera for menu
    this.engine.camera.position.set(0, 20, 30);
    this.engine.camera.rotation.x = -0.3;

    // Show menu
    this.menu.showMainMenu();
    this.hud.hide();

    // Start game loop
    this.running = true;
    this.gameLoop();
  }

  private initSystems(): void {
    this.particleManager = new ParticleManager(this.engine.scene);
    this.pickupSystem = new PickupSystem(this.engine.scene, this.audio, this.stateManager, this.combatLog);

    this.enemyAI = new EnemyAI(
      this.engine.enemyGroup,
      this.engine.scene,
      this.audio,
      this.stateManager,
      this.particleManager,
      this.pickupSystem,
      this.physics,
      this.combatLog,
    );

    this.shootingSystem = new ShootingSystem(
      this.engine.camera,
      this.engine.scene,
      this.audio,
      this.stateManager,
      this.particleManager,
      this.enemyAI,
    );

    this.vehicleSystem = new VehicleSystem(
      this.engine.vehicleGroup,
      this.engine.camera,
      this.audio,
      this.stateManager,
      this.physics,
      this.particleManager,
      this.enemyAI,
      this.combatLog,
      this.input,
    );

    this.playerController = new PlayerController(
      this.engine.camera,
      this.input,
      this.stateManager,
      this.physics,
      this.audio,
      this.vehicleSystem,
      this.shootingSystem,
      this.combatLog,
    );

    this.dayNightCycle = new DayNightCycle(this.engine, this.stateManager);
    this.waveManager = new WaveManager(this.stateManager, this.enemyAI);
  }

  /** Start a new game */
  private startGame(mode: string): void {
    this.audio.init();

    const gameMode = mode === 'survival' ? GameMode.Survival : GameMode.FreeRoam;
    this.stateManager.resetForNewGame(gameMode);

    // Clear existing world
    this.engine.clearGroups();
    this.enemyAI.clear();
    this.vehicleSystem.clear();
    this.particleManager.clear();
    this.pickupSystem.clear();
    this.worldGenerator.dispose();
    this.physics.clearBuildings();

    // Generate fresh world
    this.worldGenerator = new WorldGenerator();
    this.buildingGrid = this.worldGenerator.generate(this.engine.worldGroup);
    this.physics.buildFromBuildingGrid(this.buildingGrid);

    // Re-init systems with new world data
    this.initSystems();

    // Reset camera
    this.engine.camera.position.set(0, CFG.PLAYER_H, 5);
    this.engine.camera.rotation.set(0, 0, 0);
    this.engine.camera.fov = 75;
    this.engine.camera.updateProjectionMatrix();

    // Spawn initial entities
    this.vehicleSystem.spawnVehicles(CFG.VEHICLE_COUNT);
    if (gameMode === GameMode.Survival) {
      const s = this.stateManager.getMutableState();
      s.wave = 1;
      this.enemyAI.spawnEnemies(CFG.INITIAL_SURVIVAL_ENEMIES, [EnemyTypeName.Gang, EnemyTypeName.Civilian], 0, 5);
    } else {
      this.enemyAI.spawnEnemies(
        CFG.INITIAL_FREEROAM_ENEMIES,
        [EnemyTypeName.Civilian, EnemyTypeName.Civilian, EnemyTypeName.Gang, EnemyTypeName.Gang],
        0, 5,
      );
    }

    // Show HUD, hide menus
    this.menu.hideAll();
    this.hud.show();
    this.combatLog.show();
    document.body.classList.add('playing');

    // Request pointer lock
    this.input.requestPointerLock();
  }

  private pauseGame(): void {
    this.stateManager.set('state', GameStateType.Paused);
    this.menu.showPause();
    this.input.exitPointerLock();
    document.body.classList.remove('playing');
  }

  private resumeGame(): void {
    this.stateManager.set('state', GameStateType.Playing);
    this.menu.hidePause();
    this.input.requestPointerLock();
    document.body.classList.add('playing');
  }

  private restartGame(): void {
    this.menu.hidePause();
    this.startGame(this.stateManager.getState().mode);
  }

  private backToMenu(): void {
    this.stateManager.set('state', GameStateType.Menu);
    this.menu.hideAll();
    this.hud.hide();
    this.combatLog.hide();
    this.menu.showMainMenu();
    this.input.exitPointerLock();
    document.body.classList.remove('playing');

    // Reset camera for menu
    this.engine.camera.position.set(0, 20, 30);
    this.engine.camera.rotation.set(-0.3, 0, 0);
  }

  /** Scan for nearby threats and report to combat log */
  private scanThreats(): void {
    const px = this.engine.camera.position.x;
    const pz = this.engine.camera.position.z;
    const enemies = this.enemyAI.getEnemies();

    // Get camera forward direction
    this.engine.camera.getWorldDirection(this._camDir);
    const forwardAngle = Math.atan2(this._camDir.x, this._camDir.z);

    let front = 0, back = 0, left = 0, right = 0;
    const scanRange = 40;

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
      if (count > 0) this.combatLog.logThreat(dir, count);
    }
  }

  private triggerGameOver(): void {
    this.stateManager.set('state', GameStateType.GameOver);
    this.input.exitPointerLock();
    document.body.classList.remove('playing');

    const s = this.stateManager.getState();
    const accuracy = s.totalShots > 0 ? Math.round(s.hits / s.totalShots * 100) : 0;
    this.menu.showGameOver({
      score: s.score,
      kills: s.kills,
      time: s.time,
      accuracy,
      maxWanted: s.maxWanted,
      wave: s.mode === GameMode.Survival ? s.wave : undefined,
    });
  }

  /** Main game loop */
  private gameLoop = (): void => {
    if (!this.running) return;
    requestAnimationFrame(this.gameLoop);

    const dt = this.engine.getDelta();
    const s = this.stateManager.getMutableState();

    if (s.state === GameStateType.Playing && !this.weaponShop.openState) {
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
          s.wantedTimer = 15;
        }
      }

      // Wave management
      this.waveManager.update(dt, this.engine.camera.position.x, this.engine.camera.position.z);

      // Update all systems
      this.playerController.update(dt);
      this.enemyAI.update(
        dt,
        this.engine.camera.position.x,
        this.engine.camera.position.z,
        (dmg, type) => this.playerController.takeDamage(dmg, type),
      );
      this.pickupSystem.update(dt, this.engine.camera.position.x, this.engine.camera.position.z);
      this.particleManager.update(dt);
      this.dayNightCycle.update(dt);

      // Threat scan (every 2 seconds)
      this.threatTimer += dt;
      if (this.threatTimer >= 2) {
        this.threatTimer = 0;
        this.scanThreats();
      }

      // Update combat log fade
      this.combatLog.update();

      // Check death
      if (s.hp <= 0) {
        this.triggerGameOver();
      }

      // Update HUD
      const vehicleSpeed = s.inVehicle !== null
        ? this.vehicleSystem.getVehicles()[s.inVehicle]?.speed ?? null
        : null;
      const nearVehicle = s.inVehicle === null
        ? this.vehicleSystem.isNearVehicle(this.engine.camera.position.x, this.engine.camera.position.z)
        : false;
      this.hud.update(this.stateManager, vehicleSpeed, nearVehicle);

      // Minimap (throttled)
      this.minimapTimer += dt;
      if (this.minimapTimer >= 0.5) {
        this.minimapTimer = 0;
        this.minimap.render(
          this.buildingGrid,
          this.engine.camera.position.x,
          this.engine.camera.position.z,
          this.enemyAI.getEnemies(),
          this.vehicleSystem.getVehicles(),
        );
      }
    } else if (s.state === GameStateType.Menu) {
      // Slow camera pan for menu background
      this.engine.camera.position.x += dt * 2;
      this.engine.camera.position.y = 20;
      this.engine.camera.position.z += dt;
      this.engine.camera.rotation.x = -0.3;
      this.dayNightCycle.update(dt);
    }

    this.engine.render();
  };
}
