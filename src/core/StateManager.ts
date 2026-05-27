import {
  GameStateType, GameMode,
  type GameState, type StateChangeEvent, type StateChangeCallback,
} from '@game/index';
import { WEAPONS } from '@config/weapons';

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
    this.state.money = 200; // Starting cash
    this.state.ammo[0] = 999; // Pistol unlimited
    this.emit({ type: 'stateChange', value: GameStateType.Playing });
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
