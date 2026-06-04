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
// Story mode imports
import { StoryManager } from '@story/StoryManager';
import { DialogueManager } from '@story/DialogueManager';
import { QuestManager } from '@story/QuestManager';
import { ZoneManager } from '@story/ZoneManager';
import { TriggerQuestBridge } from '@story/TriggerQuestBridge';
import { NPCManager } from '@story/NPCManager';
import { CHARACTERS, NPC_SPAWN_POINTS } from '@story/CharacterData';
import { DialoguePanel } from '@ui/DialoguePanel';
import { ChoicePanel } from '@ui/ChoicePanel';
import { MissionState } from '@story/types';
import { DialogueTriggerManager } from '@story/DialogueTrigger';

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

  // ---- Story mode systems (null when not in story mode) ----
  storyManager: StoryManager | null;
  dialogueManager: DialogueManager | null;
  questManager: QuestManager | null;
  zoneManager: ZoneManager | null;
  npcManager: NPCManager | null;
  triggerBridge: TriggerQuestBridge | null;
  dialoguePanel: DialoguePanel | null;
  choicePanel: ChoicePanel | null;
  storyUpdateAccum: number;
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

  // ========== Story Mode ==========

  /** Initialize and start story mode */
  startStoryMode(): void {
    const r = this.refs;
    r.audio.init();

    r.stateManager.resetForNewGame(GameMode.Story);

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

    // Spawn vehicles
    r.vehicleSystem.spawnVehicles(CFG.VEHICLE_COUNT);

    // ---- Initialize story systems ----
    r.storyManager = new StoryManager();
    r.dialogueManager = new DialogueManager();
    r.questManager = new QuestManager();
    r.zoneManager = new ZoneManager();
    const dialogueTriggerMgr = new DialogueTriggerManager();
    r.npcManager = new NPCManager(r.engine.enemyGroup, r.dialogueManager!, dialogueTriggerMgr);
    r.triggerBridge = new TriggerQuestBridge(r.zoneManager!, r.storyManager!);
    r.dialoguePanel = new DialoguePanel();
    r.choicePanel = new ChoicePanel();
    r.storyUpdateAccum = 0;

    // Init UI panels
    r.dialoguePanel!.init();
    r.choicePanel!.init();

    // Bind dialogue game functions
    r.dialogueManager!.bindGameFunctions({
      giveMoney: (amount: number) => {
        r.stateManager.getMutableState().money += amount;
      },
      setFlag: (key: string, value: boolean) => {
        r.storyManager!.setFlag(key, value);
        // Auto-save checkpoint on flag change (key story moments)
        if (key.startsWith('checkpoint_')) {
          r.storyManager!.saveCheckpoint(key);
        }
      },
      spawnEnemies: (count: number, type: string) => {
        const enemyType = type === 'gang' ? EnemyTypeName.Gang
          : type === 'heavy' ? EnemyTypeName.Heavy : EnemyTypeName.Gang;
        r.enemyAI.spawnEnemies(count, [enemyType], r.engine.camera.position.x, r.engine.camera.position.z);
      },
      updateWanted: (change: number) => {
        const s = r.stateManager.getMutableState();
        s.wanted = Math.max(0, Math.min(CFG.GAME.MAX_WANTED, s.wanted + change));
      },
    });

    // Wire dialogue UI callbacks
    r.dialoguePanel!.onAdvance = () => this.advanceDialogue();
    r.dialoguePanel!.onClose = () => this.closeDialogue();
    r.choicePanel!.onSelect = (idx: number) => {
      r.dialogueManager!.chooseChoice(idx);
      this.advanceDialogue();
    };

    // Listen for player interact (E key) to trigger NPC dialogue
    const handleInteract = () => {
      if (!r.npcManager || !r.dialogueManager) return;
      const npc = r.npcManager.checkInteraction(r.engine.camera.position.x, r.engine.camera.position.z);
      if (npc) {
        r.npcManager.tryDialogue(npc);
      }
    };
    eventBus.on('player:interact', handleInteract);

    // Spawn story NPCs at their defined positions
    for (const spawn of NPC_SPAWN_POINTS) {
      const character = CHARACTERS.find(c => c.id === spawn.id);
      if (character) {
        r.npcManager!.spawnNPC(character, spawn.x, spawn.z);
      }
    }

    // Try to restore saved story progress
    if (r.storyManager!.hasSave()) {
      r.storyManager!.load();
    }

    // Load chapter 1 ink story
    r.storyManager!.loadInkStory('/story/chapter1.json');

    // Show story HUD
    r.hud.showStoryHUD();
    r.hud.setChapter(r.storyManager!.getCurrentChapter(), '九龙城寨');

    // Auto-play chapter 1 intro dialogue
    this.advanceDialogue();

    // Show HUD, hide menus
    r.menu.hideAll();
    r.hud.show();
    r.combatLog.show();
    document.body.classList.add('playing');

    // Request pointer lock
    r.input.requestPointerLock();
    eventBus.emit('game-state-change', { state: 'playing' });
  }

  /** Advance dialogue by one step — called when player presses Space/Enter */
  advanceDialogue(): void {
    const r = this.refs;
    if (!r.dialogueManager || !r.dialoguePanel) return;

    // Check for choices first
    const choices = r.dialogueManager.getChoices();
    if (choices.length > 0) {
      r.dialoguePanel.hide();
      r.choicePanel!.showChoices(choices, (idx: number) => {
        r.dialogueManager!.chooseChoice(idx);
        this.advanceDialogue();
      });
      return;
    }

    // Continue story text
    const line = r.dialogueManager.continue();
    if (line !== null) {
      const speaker = r.dialogueManager.getCurrentSpeaker();
      r.dialoguePanel.displayText(speaker, line);
    } else {
      // Dialogue complete
      r.dialogueManager.end();
      r.dialoguePanel.hide();
      r.choicePanel?.hide();
    }
  }

  /** Close dialogue early — called when player presses Escape */
  closeDialogue(): void {
    const r = this.refs;
    r.dialogueManager?.end();
    r.dialoguePanel?.hide();
    r.choicePanel?.hide();
  }

  /**
   * Story mode update — called from GameLoop at CFG.STORY.UPDATE_HZ (5 Hz).
   * Updates quest conditions, trigger zones, NPC behaviors, and HUD objectives.
   */
  updateStory(dt: number): void {
    const r = this.refs;
    if (!r.storyManager) return;

    const px = r.engine.camera.position.x;
    const pz = r.engine.camera.position.z;

    // Update StoryManager (mission unlocks, proximity checks)
    r.storyManager.update(dt, px, pz);

    // Update QuestManager (condition checks, lane advancement)
    r.questManager?.update(px, pz);

    // Update ZoneManager (trigger zone activation)
    r.zoneManager?.update(dt, px, pz);

    // Show first dialogue line if dialogue just became active
    if (r.dialogueManager?.active && r.dialoguePanel && !r.dialoguePanel.isVisible()) {
      const line = r.dialogueManager.continue();
      if (line !== null) {
        const speaker = r.dialogueManager.getCurrentSpeaker();
        r.dialoguePanel.displayText(speaker, line);
        r.dialoguePanel.show();
      }
    }

    // Update HUD chapter indicator
    const chapter = r.storyManager.getCurrentChapter();
    r.hud.setChapter(chapter, this.getChapterTitle(chapter));

    // Update HUD mission objective
    const mission = r.storyManager.getCurrentMission();
    if (mission) {
      const incomplete = mission.objectives.find(o => !o.complete);
      if (incomplete) {
        r.hud.updateObjective(incomplete.description);
      } else {
        r.hud.updateObjective('[任务完成] 返回任务点确认');
      }
    } else {
      const avail = [...r.storyManager.getMissions().values()].find(
        m => m.state === MissionState.Available,
      );
      if (avail) {
        r.hud.updateObjective(`[可用] ${avail.def.title}`);
      } else {
        r.hud.updateObjective('探索城市');
      }
    }
  }

  /** Get chapter title string for HUD display */
  private getChapterTitle(chapter: number): string {
    const titles: Record<number, string> = {
      1: '九龙城寨',
      2: '暗流涌动',
      3: '血色黄昏',
      4: '风暴前夕',
      5: '最终对决',
      6: '余波',
    };
    return titles[chapter] ?? `第 ${chapter} 章`;
  }

  // ========== Standard Game Modes ==========

  /** Start a new game with the given mode */
  startGame(mode: string): void {
    if (mode === 'story') {
      this.startStoryMode();
      return;
    }

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

    // Pause story dialogue if active
    if (r.dialoguePanel?.isVisible()) {
      r.dialoguePanel.hide();
    }
    if (r.choicePanel?.isVisible()) {
      r.choicePanel.hide();
    }

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

    // Clean up story mode systems
    if (r.storyManager) {
      r.storyManager.save();
      r.storyManager.clear();
      r.storyManager = null;
    }
    r.dialogueManager = null;
    r.questManager?.clear();
    r.questManager = null;
    r.zoneManager?.clear();
    r.zoneManager = null;
    r.npcManager?.clear();
    r.npcManager = null;
    r.triggerBridge = null;
    r.dialoguePanel?.dispose();
    r.dialoguePanel = null;
    r.choicePanel?.dispose();
    r.choicePanel = null;

    r.hud.hideStoryHUD();

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

    // Sync storyProgress into GameState before saving
    if (r.storyManager) {
      const progress = {
        currentChapter: r.storyManager.getCurrentChapter(),
        completedMissions: [...r.storyManager.getCompletedMissions()],
        flags: Object.fromEntries((r.storyManager as unknown as { flags: Map<string, boolean> }).flags),
        missionStates: {},
        currentMissionId: r.storyManager.getCurrentMissionId(),
      };
      r.stateManager.setStoryProgress(progress);
      r.storyManager.saveCheckpoint('game_save');
    }

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
