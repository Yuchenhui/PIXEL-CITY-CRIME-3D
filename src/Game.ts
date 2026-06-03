import { GameStateType, EnemyTypeName } from '@game/index';
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
import { EnemyRenderer } from '@systems/EnemyRenderer';
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

// New modules
import { GameFlowController, type GameRefs } from './GameFlowController';
import { GameLoop } from './GameLoop';

/**
 * Main Game class: thin orchestrator that creates core systems,
 * wires UI, and delegates game flow and per-frame logic to dedicated modules.
 */
export class Game {
  private refs: GameRefs;
  private flowController: GameFlowController;
  private gameLoop: GameLoop;

  // DOM refs for volume controls
  private volumeIndicator: HTMLElement;
  private volumeSlider: HTMLInputElement;
  private volumeLabel: HTMLElement;

  constructor() {
    // Initialize core
    const engine = new Engine();
    const input = new InputManager();
    const audio = new AudioManager();
    const physics = new PhysicsManager();
    const stateManager = new StateManager();
    const worldGenerator = new WorldGenerator();

    // Initialize UI
    const hud = new HUDController();
    const minimap = new MinimapRenderer(document.getElementById('minimap') as HTMLCanvasElement);
    const combatLog = new CombatLog();
    const weaponShop = new WeaponShop(stateManager, combatLog);

    // Volume indicator DOM refs
    this.volumeIndicator = document.getElementById('volumeIndicator')!;
    this.volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    this.volumeLabel = document.getElementById('volumeLabel')!;

    // Create shared mutable refs container (systems populated by initSystems)
    this.refs = {
      engine, input, audio, physics, stateManager, worldGenerator,
      buildingGrid: [],
      particleManager: null!,
      pickupSystem: null!,
      enemyAI: null!,
      shootingSystem: null!,
      vehicleSystem: null!,
      playerController: null!,
      dayNightCycle: null!,
      waveManager: null!,
      hud, minimap, menu: null!, combatLog, weaponShop,
      initSystems: () => this.initSystems(),
      // Story mode systems (null until story mode is started)
      storyManager: null,
      dialogueManager: null,
      questManager: null,
      zoneManager: null,
      npcManager: null,
      triggerBridge: null,
      dialoguePanel: null,
      choicePanel: null,
      storyUpdateAccum: 0,
    };

    // Create controllers
    this.flowController = new GameFlowController(this.refs, this.volumeSlider, this.volumeLabel);
    this.gameLoop = new GameLoop(this.refs, this.volumeIndicator, () => this.flowController.triggerGameOver());
    this.gameLoop.setFlowController(this.flowController);


    // Menu with callbacks routed to flow controller
    const menu = new MenuController(
      (mode) => this.flowController.startGame(mode),
      () => this.flowController.resumeGame(),
      () => this.flowController.restartGame(),
      () => this.flowController.backToMenu(),
      () => this.flowController.saveGame(),
      () => this.flowController.loadGame(),
    );
    this.refs.menu = menu;

    // Enable input
    input.enable(engine.renderer.domElement);

    // Pause menu volume slider
    this.volumeSlider.addEventListener('input', () => {
      const vol = parseInt(this.volumeSlider.value) / 100;
      audio.setVolume(vol);
      const ms = stateManager.getMutableState();
      ms.volume = vol;
      ms.muted = false;
      audio.setMuted(false);
      this.volumeLabel.textContent = `${Math.round(vol * 100)}%`;
    });

    // Handle pointer lock change for click prompt
    document.addEventListener('pointerlockchange', () => {
      const s = stateManager.getState();
      if (s.state === GameStateType.Playing && !input.isPointerLocked) {
        menu.showClickPrompt();
      } else {
        menu.hideClickPrompt();
      }
    });

    // Handle Escape key for pause, B for weapon shop, volume/save/load shortcuts
    document.addEventListener('keydown', (e) => {
      const s = stateManager.getState().state;
      if (e.code === 'Escape') {
        if (weaponShop.openState) {
          weaponShop.close();
          input.requestPointerLock();
          document.body.classList.add('playing');
        } else if (s === GameStateType.Playing) {
          this.flowController.pauseGame();
        }
      }
      if (e.code === 'KeyB' && s === GameStateType.Playing) {
        if (weaponShop.openState) {
          weaponShop.close();
          input.requestPointerLock();
          document.body.classList.add('playing');
        } else {
          weaponShop.open();
          input.exitPointerLock();
          document.body.classList.remove('playing');
        }
      }
      // F5 = Quick Save, F9 = Quick Load (only while playing or paused)
      if (e.code === 'F5' && (s === GameStateType.Playing || s === GameStateType.Paused)) {
        e.preventDefault();
        this.flowController.saveGame();
      }
      if (e.code === 'F9' && (s === GameStateType.Playing || s === GameStateType.Paused)) {
        e.preventDefault();
        this.flowController.loadGame();
      }

      // M = Toggle mute (only while playing)
      if (e.code === 'KeyM' && s === GameStateType.Playing) {
        const ms = stateManager.getMutableState();
        ms.muted = !ms.muted;
        audio.setMuted(ms.muted);
        this.gameLoop.showVolumeIndicator(ms.muted ? 'MUTED' : `Volume: ${Math.round(ms.volume * 100)}%`);
      }

      // N = Cycle minimap zoom (only while playing)
      if (e.code === 'KeyN' && s === GameStateType.Playing) {
        const ms = stateManager.getMutableState();
        const zoomLevels = [0.5, 1, 2];
        const idx = zoomLevels.indexOf(ms.minimapZoom);
        ms.minimapZoom = zoomLevels[(idx + 1) % zoomLevels.length];
      }

      // +/= = Volume up, -/_ = Volume down (while playing or paused)
      if ((e.code === 'Equal' || e.code === 'NumpadAdd') && (s === GameStateType.Playing || s === GameStateType.Paused)) {
        const ms = stateManager.getMutableState();
        ms.muted = false;
        audio.setMuted(false);
        ms.volume = Math.min(1, ms.volume + 0.1);
        audio.setVolume(ms.volume);
        this.gameLoop.showVolumeIndicator(`Volume: ${Math.round(ms.volume * 100)}%`);
      }
      if ((e.code === 'Minus' || e.code === 'NumpadSubtract') && (s === GameStateType.Playing || s === GameStateType.Paused)) {
        const ms = stateManager.getMutableState();
        ms.muted = false;
        audio.setMuted(false);
        ms.volume = Math.max(0, ms.volume - 0.1);
        audio.setVolume(ms.volume);
        this.gameLoop.showVolumeIndicator(`Volume: ${Math.round(ms.volume * 100)}%`);
      }
    });
  }

  /** Initialize the game world and start the loop */
  init(): void {
    // Generate initial world for menu background
    this.refs.buildingGrid = this.refs.worldGenerator.generate(this.refs.engine.worldGroup);
    this.refs.physics.addGroundPlane();
    this.refs.physics.buildFromBuildingGrid(this.refs.buildingGrid);

    // Init systems that depend on the world
    this.initSystems();

    // Spawn initial enemies for menu
    this.refs.enemyAI.spawnEnemies(10, [EnemyTypeName.Civilian, EnemyTypeName.Gang], 0, 0);

    // Position camera for menu
    this.refs.engine.camera.position.set(0, 20, 30);
    this.refs.engine.camera.rotation.x = -0.3;

    // Show menu
    this.refs.menu.showMainMenu();
    this.refs.hud.hide();

    // Start game loop
    this.gameLoop.start();
  }

  /** Create all game systems and populate refs */
  private initSystems(): void {
    const r = this.refs;
    r.particleManager = new ParticleManager(r.engine.scene);
    r.pickupSystem = new PickupSystem(r.engine.scene, r.audio, r.stateManager, r.combatLog);
    const enemyRenderer = new EnemyRenderer(r.engine.scene);
    r.enemyAI = new EnemyAI(
      r.engine.enemyGroup, enemyRenderer, r.audio, r.stateManager,
      r.particleManager, r.pickupSystem, r.physics, r.combatLog,
    );
    r.shootingSystem = new ShootingSystem(
      r.engine.camera, r.engine.scene, r.audio, r.stateManager,
      r.particleManager, r.enemyAI,
    );
    r.vehicleSystem = new VehicleSystem(
      r.engine.vehicleGroup, r.engine.camera, r.audio, r.stateManager,
      r.physics, r.particleManager, r.enemyAI, r.combatLog, r.input,
    );
    r.playerController = new PlayerController(
      r.engine.camera, r.input, r.stateManager, r.physics,
      r.audio, r.vehicleSystem, r.shootingSystem, r.combatLog,
    );
    r.dayNightCycle = new DayNightCycle(r.engine, r.stateManager);
    r.waveManager = new WaveManager(r.stateManager, r.enemyAI);
  }
}
