import type { GameOverStats } from '@game/index';

/**
 * Menu controller: show/hide main menu, pause menu, game over screen.
 * All overlays are DOM elements defined in index.html;
 * this class manages visibility and button event binding.
 */
export class MenuController {
  private menuOverlay: HTMLElement;
  private pauseOverlay: HTMLElement;
  private gameOverOverlay: HTMLElement;
  private goStats: HTMLElement;
  private clickPrompt: HTMLElement;

  constructor(
    private onStart: (mode: string) => void,
    private onResume: () => void,
    private onRestart: () => void,
    private onQuit: () => void,
    private onSave: () => void,
    private onLoad: () => void,
  ) {
    this.menuOverlay = document.getElementById('menuOverlay')!;
    this.pauseOverlay = document.getElementById('pauseOverlay')!;
    this.gameOverOverlay = document.getElementById('gameOverOverlay')!;
    this.goStats = document.getElementById('goStats')!;
    this.clickPrompt = document.getElementById('clickPrompt')!;

    // Bind button events
    this.bindButtons();
  }

  private bindButtons(): void {
    // Main menu buttons
    for (const btn of this.menuOverlay.querySelectorAll('.menu-btn')) {
      const text = btn.textContent?.trim();
      if (text === 'FREE ROAM') btn.addEventListener('click', () => this.onStart('freeroam'));
      else if (text === 'SURVIVAL MODE') btn.addEventListener('click', () => this.onStart('survival'));
      else if (text === 'STORY MODE') btn.addEventListener('click', () => this.onStart('story'));
      else if (text === 'CONTROLS') {
        btn.addEventListener('click', () => {
          const ci = document.getElementById('controlsInfo')!;
          ci.style.display = ci.style.display === 'none' ? 'block' : 'none';
        });
      }
    }

    // Pause menu buttons
    for (const btn of this.pauseOverlay.querySelectorAll('.menu-btn')) {
      const text = btn.textContent?.trim();
      if (text === 'SAVE GAME') btn.addEventListener('click', () => this.onSave());
      else if (text === 'LOAD GAME') btn.addEventListener('click', () => this.onLoad());
      else if (text === 'RESUME') btn.addEventListener('click', () => this.onResume());
      else if (text === 'RESTART') btn.addEventListener('click', () => this.onRestart());
      else if (text === 'QUIT') btn.addEventListener('click', () => this.onQuit());
    }

    // Game over continue button
    for (const btn of this.gameOverOverlay.querySelectorAll('.menu-btn')) {
      btn.addEventListener('click', () => this.onQuit());
    }
  }

  /** Show the main menu, hide all other overlays */
  showMainMenu(): void {
    this.menuOverlay.style.display = 'flex';
    this.pauseOverlay.style.display = 'none';
    this.gameOverOverlay.style.display = 'none';
    this.clickPrompt.style.display = 'none';
  }

  /** Hide every menu overlay (called when entering gameplay) */
  hideAll(): void {
    this.menuOverlay.style.display = 'none';
    this.pauseOverlay.style.display = 'none';
    this.gameOverOverlay.style.display = 'none';
  }

  /** Display the pause menu overlay */
  showPause(): void {
    this.pauseOverlay.style.display = 'flex';
  }

  /** Hide the pause menu overlay */
  hidePause(): void {
    this.pauseOverlay.style.display = 'none';
  }

  /** Show game over screen with final statistics */
  showGameOver(stats: GameOverStats): void {
    let html = `Score: ${stats.score}<br>Kills: ${stats.kills}<br>Time: ${Math.floor(stats.time)}s<br>Accuracy: ${stats.accuracy}%`;
    if (stats.maxWanted > 0) {
      let stars = '';
      for (let i = 0; i < stats.maxWanted; i++) stars += '\u2605';
      html += `<br>Max Wanted: ${stars}`;
    }
    if (stats.wave !== undefined) {
      html += `<br>Wave: ${stats.wave}`;
    }
    this.goStats.innerHTML = html;
    this.gameOverOverlay.style.display = 'flex';
  }

  /** Show the "Click to play" pointer-lock prompt */
  showClickPrompt(): void {
    this.clickPrompt.style.display = 'block';
  }

  /** Hide the "Click to play" prompt */
  hideClickPrompt(): void {
    this.clickPrompt.style.display = 'none';
  }
}
