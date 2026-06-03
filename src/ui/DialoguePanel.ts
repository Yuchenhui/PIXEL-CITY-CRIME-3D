/**
 * Dialogue panel: HUD overlay at the bottom center showing speaker name
 * and dialogue text. Supports advancing with Space / Enter / click.
 *
 * Usage:
 *   const panel = new DialoguePanel();
 *   panel.init(); // creates DOM elements
 *   panel.show();
 *   panel.displayText('Maya', 'We need to move. Now.');
 */

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export class DialoguePanel {
  private container: HTMLDivElement | null = null;
  private speakerEl: HTMLDivElement | null = null;
  private textEl: HTMLDivElement | null = null;
  private hintEl: HTMLDivElement | null = null;
  private visible = false;

  /** Callback invoked when the player presses Space/Enter/click to advance */
  onAdvance: (() => void) | null = null;

  /** Callback invoked when the player wants to skip/close the dialogue */
  onClose: (() => void) | null = null;

  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private clickHandler: (() => void) | null = null;

  /** Create DOM elements and attach to the HUD overlay */
  init(): void {
    if (this.container) return; // Already initialised

    this.container = document.createElement('div');
    this.container.id = 'dialoguePanel';
    this.container.style.display = 'none';

    this.speakerEl = document.createElement('div');
    this.speakerEl.id = 'dialogueSpeaker';

    this.textEl = document.createElement('div');
    this.textEl.id = 'dialogueText';

    this.hintEl = document.createElement('div');
    this.hintEl.id = 'dialogueHint';
    this.hintEl.textContent = '[Space / Enter] 继续';

    this.container.appendChild(this.speakerEl);
    this.container.appendChild(this.textEl);
    this.container.appendChild(this.hintEl);

    // Append to the HUD overlay (or body if HUD not found)
    const hud = document.getElementById('hud');
    if (hud) {
      hud.appendChild(this.container);
    } else {
      document.body.appendChild(this.container);
    }

    // Keyboard listener
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.visible) return;

      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        this.onAdvance?.();
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.onClose?.();
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    // Click to advance
    this.clickHandler = () => {
      if (!this.visible) return;
      this.onAdvance?.();
    };
    this.container.addEventListener('click', this.clickHandler);
  }

  /** Show the dialogue panel */
  show(): void {
    if (!this.container) return;
    this.container.style.display = 'flex';
    this.visible = true;
  }

  /** Hide the dialogue panel */
  hide(): void {
    if (!this.container) return;
    this.container.style.display = 'none';
    this.visible = false;
  }

  /** Update the displayed speaker and text */
  displayText(speaker: string | null, text: string): void {
    if (!this.container) return;

    if (this.speakerEl) {
      this.speakerEl.textContent = speaker ?? '';
      this.speakerEl.style.display = speaker ? 'block' : 'none';
    }

    if (this.textEl) {
      this.textEl.textContent = text;
    }
  }

  /** Whether the panel is currently visible */
  isVisible(): boolean {
    return this.visible;
  }

  /** Clean up event listeners */
  dispose(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.container && this.clickHandler) {
      this.container.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
