/**
 * Choice panel: HUD overlay showing dialogue choices as buttons.
 * Supports click selection and number-key shortcuts (1–9).
 *
 * Usage:
 *   const panel = new ChoicePanel();
 *   panel.init();
 *   panel.showChoices([{ text: 'Say hello', index: 0 }], (idx) => { ... });
 */

const MAX_KEYS = 9;

export interface ChoiceOption {
  text: string;
  index: number;
}

export class ChoicePanel {
  private container: HTMLDivElement | null = null;
  private choiceList: HTMLDivElement | null = null;
  private visible = false;

  /** Currently displayed choices for key mapping */
  private currentChoices: ChoiceOption[] = [];

  /** Callback when a choice is selected (receives ink choice index) */
  onSelect: ((index: number) => void) | null = null;

  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  /** Create DOM elements and attach to the HUD overlay */
  init(): void {
    if (this.container) return; // Already initialised

    this.container = document.createElement('div');
    this.container.id = 'choicePanel';
    this.container.style.display = 'none';

    this.choiceList = document.createElement('div');
    this.choiceList.id = 'choiceList';

    this.container.appendChild(this.choiceList);

    // Append to HUD overlay or body
    const hud = document.getElementById('hud');
    if (hud) {
      hud.appendChild(this.container);
    } else {
      document.body.appendChild(this.container);
    }

    // Keyboard handler for number keys
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.visible) return;

      // Number keys 1–9
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= MAX_KEYS && num <= this.currentChoices.length) {
        e.preventDefault();
        e.stopPropagation();
        this.selectChoice(num - 1);
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  /** Display a list of choices */
  showChoices(choices: ChoiceOption[], onSelect: (index: number) => void): void {
    if (!this.container || !this.choiceList) return;

    this.currentChoices = choices;
    this.onSelect = onSelect;
    this.choiceList.innerHTML = '';

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const btn = document.createElement('div');
      btn.className = 'choice-btn';

      // Number prefix for keyboard hint
      const numSpan = document.createElement('span');
      numSpan.className = 'choice-num';
      numSpan.textContent = `${i + 1}`;

      const textSpan = document.createElement('span');
      textSpan.className = 'choice-text';
      textSpan.textContent = choice.text;

      btn.appendChild(numSpan);
      btn.appendChild(textSpan);

      const choiceIndex = choice.index;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectChoice(i);
      });

      this.choiceList.appendChild(btn);
    }

    this.container.style.display = 'flex';
    this.visible = true;
  }

  /** Hide the choice panel */
  hide(): void {
    if (!this.container) return;
    this.container.style.display = 'none';
    this.visible = false;
    this.currentChoices = [];
    this.onSelect = null;
    if (this.choiceList) {
      this.choiceList.innerHTML = '';
    }
  }

  /** Whether the choice panel is currently visible */
  isVisible(): boolean {
    return this.visible;
  }

  /** Handle choice selection by local index (0-based in display order) */
  private selectChoice(displayIndex: number): void {
    if (displayIndex < 0 || displayIndex >= this.currentChoices.length) return;
    const choice = this.currentChoices[displayIndex];
    const callback = this.onSelect;
    this.hide();
    callback?.(choice.index);
  }

  /** Clean up event listeners */
  dispose(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
