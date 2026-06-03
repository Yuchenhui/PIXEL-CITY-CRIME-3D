/**
 * Core story / mission manager.
 *
 * Owns mission definitions, runtime state, story flags, and ink integration.
 * Updates at a fixed rate (CFG.STORY.UPDATE_HZ) rather than every frame
 * to minimise per-frame overhead.
 *
 * Usage:
 *   const story = new StoryManager();
 *   story.init(missionDefs);
 *   // in game loop:
 *   story.update(dt, playerX, playerZ);
 */

import { Story } from 'inkjs';
import { MissionState } from '@story/types';
import type {
  MissionDef,
  MissionObjective,
  MissionRuntime,
  MissionRewards,
  StoryProgress,
  QuestLane,
  QuestNode,
} from '@story/types';
import { CFG } from '@config/constants';

/** Serializable save payload for localStorage */
interface StorySaveData {
  progress: StoryProgress;
  /** Mission runtimes keyed by id (only Active / Available) */
  runtimes: Record<string, { state: MissionState; objectives: MissionObjective[] }>;
}

export class StoryManager {
  // --- Static definitions ---
  /** All mission definitions keyed by id */
  private defs: Map<string, MissionDef> = new Map();

  // --- Runtime state ---
  /** Active / completed mission runtimes keyed by id */
  private runtimes: Map<string, MissionRuntime> = new Map();

  /** Story flags — arbitrary key/value pairs */
  private flags: Map<string, boolean> = new Map();

  /** Currently active mission id, or null */
  private currentMissionId: string | null = null;

  /** Current chapter (1-based) */
  private currentChapter: number = 1;

  /** Ids of completed missions */
  private completedMissions: Set<string> = new Set();

  // --- Ink integration ---
  /** Loaded ink Story instance (null if no ink file loaded) */
  private inkStory: Story | null = null;

  // --- Update throttle ---
  /** Accumulated time since last update (seconds) */
  private updateAccum: number = 0;
  /** Update interval in seconds (derived from CFG.STORY.UPDATE_HZ) */
  private readonly updateInterval: number = 1 / CFG.STORY.UPDATE_HZ;

  // --- Save key ---
  private static readonly SAVE_KEY = 'pixel_city_crime_3d_story_save';

  // ========== Initialisation ==========

  /**
   * Initialise the story manager with mission definitions.
   * Resets all runtime state.
   */
  init(missionDefs: MissionDef[]): void {
    this.clear();

    for (const def of missionDefs) {
      this.defs.set(def.id, def);
    }

    // Mark missions as Available or Locked based on prerequisites
    for (const def of missionDefs) {
      const hasPrereqs = def.prerequisites.length === 0;
      const state = hasPrereqs ? MissionState.Available : MissionState.Locked;
      this.runtimes.set(def.id, {
        def,
        state,
        objectives: def.objectives.map(o => ({ ...o })),
        startedAt: 0,
        endedAt: 0,
      });
    }
  }

  // ========== Game Loop Update ==========

  /**
   * Called every frame; internally throttles to CFG.STORY.UPDATE_HZ.
   * Checks proximity-based conditions and unlocks missions whose
   * prerequisites are met.
   */
  update(dt: number, playerX: number, playerZ: number): void {
    this.updateAccum += dt;
    if (this.updateAccum < this.updateInterval) return;
    this.updateAccum -= this.updateInterval;

    // Unlock missions whose prerequisites are now all complete
    for (const [id, rt] of this.runtimes) {
      if (rt.state !== MissionState.Locked) continue;
      const allMet = rt.def.prerequisites.every(pid => this.completedMissions.has(pid));
      if (allMet) {
        rt.state = MissionState.Available;
        this.updateChapter(rt.def.chapter);
      }
    }

    // Check proximity-based quest nodes for the active mission
    if (this.currentMissionId) {
      this.checkQuestNodes(this.currentMissionId, playerX, playerZ);
    }
  }

  // ========== Mission Lifecycle ==========

  /**
   * Activate a mission by id.
   * Returns true if the mission was successfully started.
   */
  startMission(missionId: string): boolean {
    const rt = this.runtimes.get(missionId);
    if (!rt || rt.state !== MissionState.Available) return false;

    rt.state = MissionState.Active;
    rt.startedAt = 0; // Will be set by caller with game time
    this.currentMissionId = missionId;

    // Reset objectives to fresh state
    rt.objectives = rt.def.objectives.map(o => ({
      ...o,
      currentCount: 0,
      complete: false,
    }));

    return true;
  }

  /**
   * Complete a mission and grant its rewards.
   * Returns true if the mission was successfully completed.
   */
  completeMission(missionId: string): MissionRewards | null {
    const rt = this.runtimes.get(missionId);
    if (!rt || rt.state !== MissionState.Active) return null;

    // Verify all objectives are complete
    const allDone = rt.objectives.every(o => o.complete);
    if (!allDone) return null;

    rt.state = MissionState.Complete;
    rt.endedAt = 0; // Will be set by caller with game time
    this.completedMissions.add(missionId);

    if (this.currentMissionId === missionId) {
      this.currentMissionId = null;
    }

    // Apply rewards
    const rewards = rt.def.rewards;
    if (rewards.flags) {
      for (const [key, val] of Object.entries(rewards.flags)) {
        this.flags.set(key, val);
      }
    }

    this.updateChapter(rt.def.chapter);

    return rewards;
  }

  /**
   * Increment an objective's progress for a mission.
   * Returns true if the objective exists and was updated.
   */
  updateObjective(missionId: string, objectiveId: string, increment: number = 1): boolean {
    const rt = this.runtimes.get(missionId);
    if (!rt || rt.state !== MissionState.Active) return false;

    const obj = rt.objectives.find(o => o.id === objectiveId);
    if (!obj || obj.complete) return false;

    obj.currentCount = Math.min(obj.currentCount + increment, obj.targetCount);
    if (obj.currentCount >= obj.targetCount) {
      obj.complete = true;
    }

    return true;
  }

  /**
   * Mark a mission as failed.
   */
  failMission(missionId: string): boolean {
    const rt = this.runtimes.get(missionId);
    if (!rt || rt.state !== MissionState.Active) return false;

    rt.state = MissionState.Failed;
    rt.endedAt = 0;

    if (this.currentMissionId === missionId) {
      this.currentMissionId = null;
    }

    return true;
  }

  // ========== Flags ==========

  /** Set a story flag */
  setFlag(key: string, value: boolean): void {
    this.flags.set(key, value);
  }

  /** Get a story flag (defaults to false) */
  getFlag(key: string): boolean {
    return this.flags.get(key) ?? false;
  }

  // ========== Getters ==========

  /** Get the currently active mission runtime, or null */
  getCurrentMission(): MissionRuntime | null {
    if (!this.currentMissionId) return null;
    return this.runtimes.get(this.currentMissionId) ?? null;
  }

  /** Get all mission runtimes */
  getMissions(): Map<string, MissionRuntime> {
    return this.runtimes;
  }

  /** Get the current chapter number */
  getCurrentChapter(): number {
    return this.currentChapter;
  }

  /** Get the current mission id */
  getCurrentMissionId(): string | null {
    return this.currentMissionId;
  }

  /** Get a specific mission runtime by id */
  getMission(missionId: string): MissionRuntime | null {
    return this.runtimes.get(missionId) ?? null;
  }

  /** Get all completed mission ids */
  getCompletedMissions(): Set<string> {
    return this.completedMissions;
  }

  // ========== Ink Integration ==========

  /**
   * Load an ink JSON story file and return a Story instance.
   * Stores it as the active ink story.
   */
  async loadInkStory(url: string): Promise<Story | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const json = await response.json();
      this.inkStory = new Story(json);
      return this.inkStory;
    } catch {
      return null;
    }
  }

  /** Get the currently loaded ink story, or null */
  getInkStory(): Story | null {
    return this.inkStory;
  }

  /** Continue the ink story and return the next line, or null if done */
  continueInkStory(): string | null {
    if (!this.inkStory) return null;
    if (!this.inkStory.canContinue) return null;
    return this.inkStory.Continue();
  }

  /** Make an ink choice by index */
  chooseInkChoice(index: number): void {
    if (!this.inkStory) return;
    const choices = this.inkStory.currentChoices;
    if (index >= 0 && index < choices.length) {
      this.inkStory.ChooseChoiceIndex(index);
    }
  }

  /** Get current ink choices */
  getInkChoices(): Array<{ text: string; index: number }> {
    if (!this.inkStory) return [];
    return this.inkStory.currentChoices.map((c, i) => ({ text: c.text, index: i }));
  }

  // ========== Persistence ==========

  /** Save story progress to localStorage */
  save(): boolean {
    try {
      const progress: StoryProgress = {
        currentChapter: this.currentChapter,
        completedMissions: [...this.completedMissions],
        flags: Object.fromEntries(this.flags),
        missionStates: {},
        currentMissionId: this.currentMissionId,
      };

      const runtimes: Record<string, { state: MissionState; objectives: MissionObjective[] }> = {};
      for (const [id, rt] of this.runtimes) {
        progress.missionStates[id] = rt.state;
        if (rt.state === MissionState.Active || rt.state === MissionState.Available) {
          runtimes[id] = {
            state: rt.state,
            objectives: rt.objectives.map(o => ({ ...o })),
          };
        }
      }

      const data: StorySaveData = { progress, runtimes };
      localStorage.setItem(StoryManager.SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  /** Load story progress from localStorage. Returns true if save was restored. */
  load(): boolean {
    try {
      const raw = localStorage.getItem(StoryManager.SAVE_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw) as StorySaveData;
      const { progress, runtimes } = data;

      if (!progress) return false;

      this.currentChapter = progress.currentChapter;
      this.completedMissions = new Set(progress.completedMissions);
      this.flags = new Map(Object.entries(progress.flags));
      this.currentMissionId = progress.currentMissionId;

      // Restore mission states
      for (const [id, state] of Object.entries(progress.missionStates)) {
        const rt = this.runtimes.get(id);
        if (rt) {
          rt.state = state;
          const saved = runtimes[id];
          if (saved) {
            rt.objectives = saved.objectives;
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /** Check if a story save exists in localStorage */
  hasSave(): boolean {
    return localStorage.getItem(StoryManager.SAVE_KEY) !== null;
  }

  // ========== Checkpoints ==========

  /**
   * Save a checkpoint at key story moments (mission start, chapter transition).
   * Persists current story state to localStorage.
   * @param label - Human-readable checkpoint label for debugging
   */
  saveCheckpoint(label: string): boolean {
    console.log(`[Story] Checkpoint: ${label}`);
    return this.save();
  }

  // ========== Cleanup ==========

  /** Reset all story state */
  clear(): void {
    this.defs.clear();
    this.runtimes.clear();
    this.flags.clear();
    this.completedMissions.clear();
    this.currentMissionId = null;
    this.currentChapter = 1;
    this.inkStory = null;
    this.updateAccum = 0;
  }

  // ========== Private Helpers ==========

  /** Update current chapter if the new chapter is higher */
  private updateChapter(chapter: number): void {
    if (chapter > this.currentChapter) {
      this.currentChapter = chapter;
    }
  }

  /** Check quest nodes for the active mission */
  private checkQuestNodes(missionId: string, playerX: number, playerZ: number): void {
    const rt = this.runtimes.get(missionId);
    if (!rt || rt.state !== MissionState.Active) return;

    // For now, basic proximity and flag checks.
    // Full quest lane evaluation will be wired when quest data is authored.
    // This method is the integration point for QuestLane conditions.
  }
}
