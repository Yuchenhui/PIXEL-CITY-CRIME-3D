/**
 * Inkjs wrapper for managing dialogue flow.
 *
 * Loads ink story JSON files, advances through dialogue text,
 * presents choices, and binds external functions that ink scripts
 * can call to interact with game state.
 *
 * Usage:
 *   const dm = new DialogueManager();
 *   dm.bindFunction('giveMoney', (amount) => { ... });
 *   await dm.loadStory('/stories/intro.json');
 *   const line = dm.continue();
 */

import { Story } from 'inkjs';

/** Callback signatures for game-bound external functions */
export interface DialogueGameCallbacks {
  giveMoney: (amount: number) => void;
  setFlag: (key: string, value: boolean) => void;
  spawnEnemies: (count: number, type: string) => void;
  updateWanted: (change: number) => void;
}

export class DialogueManager {
  private story: Story | null = null;
  private isActive = false;
  private currentText: string[] = [];
  private textIndex = 0;
  private externalFunctions: Map<string, (...args: any[]) => any> = new Map();

  /** Load an ink story from a JSON URL */
  async loadStory(url: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      const content = await response.json();
      this.story = new Story(content);
      this.bindExternalFunctions();
      this.isActive = true;
      this.currentText = [];
      this.textIndex = 0;
      return true;
    } catch {
      console.error('Failed to load ink story:', url);
      return false;
    }
  }

  /** Load ink story from an already-fetched JSON object */
  loadStoryFromObject(content: Record<string, any>): void {
    this.story = new Story(content);
    this.bindExternalFunctions();
    this.isActive = true;
    this.currentText = [];
    this.textIndex = 0;
  }

  /** Jump to a specific knot by name */
  goToKnot(knotName: string): boolean {
    if (!this.story || !this.isActive) return false;
    try {
      this.story.ChoosePathString(knotName);
      this.currentText = [];
      this.textIndex = 0;
      return true;
    } catch {
      console.error('Failed to jump to knot:', knotName);
      return false;
    }
  }

  /**
   * Advance to next content.
   * Returns text if available, null if at a choice point or end.
   */
  continue(): string | null {
    if (!this.story || !this.isActive) return null;

    // Return buffered text if available
    if (this.textIndex < this.currentText.length) {
      return this.currentText[this.textIndex++];
    }

    // Reset buffer
    this.currentText = [];
    this.textIndex = 0;

    if (this.story.canContinue) {
      const text = this.story.Continue();
      if (text !== null) {
        this.currentText = [text.trim()];
        this.textIndex = 0;
        return this.currentText[0];
      }
    }

    return null;
  }

  /**
   * Drain all available text lines until a choice point or end.
   * Returns the collected lines.
   */
  continueAll(): string[] {
    const lines: string[] = [];
    while (this.story?.canContinue) {
      const text = this.story.Continue();
      if (text !== null && text.trim().length > 0) {
        lines.push(text.trim());
      }
    }

    if (lines.length > 0) {
      this.currentText = lines;
      this.textIndex = 0;
    }

    return lines;
  }

  /** Get available choices at the current choice point */
  getChoices(): Array<{ text: string; index: number }> {
    if (!this.story || !this.isActive) return [];
    return this.story.currentChoices.map((c, i) => ({
      text: c.text,
      index: i,
    }));
  }

  /**
   * Make a choice by index.
   * Returns true if the choice was valid and applied.
   */
  chooseChoice(index: number): boolean {
    if (!this.story || !this.isActive) return false;
    if (index < 0 || index >= this.story.currentChoices.length) return false;

    this.story.ChooseChoiceIndex(index);
    this.currentText = [];
    this.textIndex = 0;
    return true;
  }

  /** Register an external function for ink scripts to call */
  bindFunction(name: string, func: (...args: any[]) => any): void {
    this.externalFunctions.set(name, func);
    // If a story is already loaded, bind immediately
    if (this.story) {
      try {
        this.story.BindExternalFunction(name, func);
      } catch {
        // Function may already be bound; ignore
      }
    }
  }

  /**
   * Register all game-specific external functions.
   * Call this before loading a story so functions are bound on load.
   */
  bindGameFunctions(callbacks: DialogueGameCallbacks): void {
    this.bindFunction('giveMoney', (amount: number) => {
      callbacks.giveMoney(amount);
    });

    this.bindFunction('setFlag', (key: string, value: boolean) => {
      callbacks.setFlag(key, value);
    });

    this.bindFunction('spawnEnemies', (count: number, type: string) => {
      callbacks.spawnEnemies(count, type);
    });

    this.bindFunction('updateWanted', (change: number) => {
      callbacks.updateWanted(change);
    });
  }

  /** Whether dialogue is currently active */
  get active(): boolean {
    return this.isActive;
  }

  /** Whether the story has more content (text or choices) */
  get hasMore(): boolean {
    if (!this.story) return false;
    return this.story.canContinue || this.story.currentChoices.length > 0;
  }

  /** Get tags for the current line */
  getCurrentTags(): string[] {
    return this.story?.currentTags ?? [];
  }

  /** Get the speaker name from the current tags (format: "# speaker: Name") */
  getCurrentSpeaker(): string | null {
    const tags = this.getCurrentTags();
    for (const tag of tags) {
      if (tag.startsWith('speaker:')) {
        return tag.substring('speaker:'.length).trim();
      }
    }
    return null;
  }

  /** End the current dialogue session */
  end(): void {
    this.isActive = false;
    this.story = null;
    this.currentText = [];
    this.textIndex = 0;
  }

  /** Bind all registered external functions to the ink story */
  private bindExternalFunctions(): void {
    if (!this.story) return;
    for (const [name, func] of this.externalFunctions) {
      try {
        this.story.BindExternalFunction(name, func);
      } catch {
        // Ignore duplicate binding errors
      }
    }
  }
}
