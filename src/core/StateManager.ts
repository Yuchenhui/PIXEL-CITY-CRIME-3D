import {
  GameStateType, GameMode,
  type GameState, type StateChangeEvent, type StateChangeCallback,
} from '@game/index';
import { WEAPONS } from '@config/weapons';
import { CFG } from '@config/constants';

/**
 * Centralized game state manager with subscription-based change notifications.
 */
export class StateManager {
  private state: GameState;
  private listeners: StateChangeCallback[] = [];

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      state: GameStateType.Menu,
      mode: GameMode.FreeRoam,
      hp: 100,
      armor: 0,
      money: 0,
      weaponIdx: 0,
      ownedWeapons: [true, false, false, false, false, false, false, false],
      ammo: WEAPONS.map(w => w.mag * 3),
      kills: 0,
      score: 0,
      time: 0,
      wanted: 0,
      wantedTimer: 0,
      maxWanted: 0,
      combo: 0,
      comboTimer: 0,
      totalShots: 0,
      hits: 0,
      wave: 0,
      waveBreak: false,
      waveBreakTimer: 0,
      dayTime: 0.3,
      fireTimer: 0,
      reloading: false,
      reloadTimer: 0,
      inVehicle: null,
      velY: 0,
      onGround: true,
      bobPhase: 0,
      sprintMul: 1,
      gameOverTime: 0,
      volume: 1,
      muted: false,
      minimapZoom: 1,
      storyProgress: null,
    };
  }

  /** Get a readonly snapshot of the current state */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /** Direct mutable access for performance-critical game loop updates */
  getMutableState(): GameState {
    return this.state;
  }

  /** Set a specific state field and emit change event */
  set<K extends keyof GameState>(key: K, value: GameState[K]): void {
    const old = this.state[key];
    this.state[key] = value;

    // Emit targeted events for important fields
    if (old !== value) {
      let event: StateChangeEvent | null = null;
      switch (key) {
        case 'hp': event = { type: 'hpChange', value: this.state.hp }; break;
        case 'armor': event = { type: 'armorChange', value: this.state.armor }; break;
        case 'weaponIdx': event = { type: 'weaponChange', value: this.state.weaponIdx }; break;
        case 'score': event = { type: 'scoreChange', value: this.state.score }; break;
        case 'kills': event = { type: 'killsChange', value: this.state.kills }; break;
        case 'wanted': event = { type: 'wantedChange', value: this.state.wanted }; break;
        case 'combo': event = { type: 'comboChange', value: this.state.combo }; break;
        case 'state': event = { type: 'stateChange', value: this.state.state }; break;
      }
      if (event) this.emit(event);
    }
  }

  /** Subscribe to state change events */
  subscribe(callback: StateChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /** Reset state for a new game */
  resetForNewGame(mode: GameMode): void {
    this.state = this.createInitialState();
    this.state.mode = mode;
    this.state.state = GameStateType.Playing;
    this.state.money = CFG.PLAYER_EXTRA.STARTING_CASH; // Starting cash
    this.state.ammo[0] = CFG.PLAYER_EXTRA.PISTOL_AMMO; // Pistol unlimited
    this.emit({ type: 'stateChange', value: GameStateType.Playing });
  }

  private static readonly SAVE_KEY = 'pixel_city_crime_3d_save';

  /** Save game state + camera position to localStorage */
  save(cameraPos: { x: number; y: number; z: number }): boolean {
    try {
      const data = {
        state: this.state,
        cam: cameraPos,
      };
      localStorage.setItem(StateManager.SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load saved game state from localStorage.
   * Returns camera position if save exists, null otherwise.
   * On success, restores all GameState fields.
   */
  load(): { x: number; y: number; z: number } | null {
    try {
      const raw = localStorage.getItem(StateManager.SAVE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);
      const saved = data.state as GameState;
      const cam = data.cam as { x: number; y: number; z: number };

      if (!saved || !cam) return null;

      // Validate required fields exist
      if (typeof saved.hp !== 'number' || typeof saved.mode !== 'string') return null;

      // Restore state
      this.state = saved;
      this.emit({ type: 'stateChange', value: GameStateType.Playing });
      return cam;
    } catch {
      return null;
    }
  }

  /** Check if a save exists in localStorage */
  hasSave(): boolean {
    return localStorage.getItem(StateManager.SAVE_KEY) !== null;
  }

  /**
   * Update story progress in game state.
   * Called by GameFlowController before save / after load to sync
   * StoryManager state into the serializable GameState.
   */
  setStoryProgress(progress: import('@story/types').StoryProgress | null): void {
    this.state.storyProgress = progress;
  }

  /** Serialize state for save game (future use) */
  serialize(): string {
    return JSON.stringify(this.state);
  }

  /** Emit an event to all subscribers */
  private emit(event: StateChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
