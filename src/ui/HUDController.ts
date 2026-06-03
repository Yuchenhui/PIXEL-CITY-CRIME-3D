import { WEAPONS, WEAPON_PRICES } from '@config/weapons';
import { StateManager } from '@core/StateManager';

/** Entry for a temporary story notification */
interface StoryNotificationEntry {
  el: HTMLDivElement;
  expireAt: number;
  fadeDuration: number;
}

/**
 * HUD controller: efficiently updates DOM elements to reflect game state.
 * Includes story-mode HUD (chapter indicator, mission objective, notifications).
 */
export class HUDController {
  private elements: {
    hud: HTMLElement;
    hpFill: HTMLElement;
    armorBar: HTMLElement;
    armorFill: HTMLElement;
    weaponName: HTMLElement;
    ammoCount: HTMLElement;
    scoreArea: HTMLElement;
    wantedArea: HTMLElement;
    comboArea: HTMLElement;
    speedArea: HTMLElement;
    interactHint: HTMLElement;
    weaponSlots: HTMLElement;
    storyHUD: HTMLElement;
    chapterIndicator: HTMLElement;
    missionObjective: HTMLElement;
    storyNotifications: HTMLElement;
  };

  private prevWeaponIdx = -1;
  private slotElements: HTMLElement[] = [];
  private _lastOwned: boolean[] = [];

  /** Active story notification entries (for fade-out logic) */
  private storyNotifs: StoryNotificationEntry[] = [];
  private storyNotifMaxVisible = 3;

  private _ownedDirty(owned: boolean[]): boolean {
    if (owned.length !== this._lastOwned.length) return true;
    for (let i = 0; i < owned.length; i++) {
      if (owned[i] !== this._lastOwned[i]) return true;
    }
    return false;
  }

  constructor() {
    this.elements = {
      hud: document.getElementById('hud')!,
      hpFill: document.getElementById('hpFill')!,
      armorBar: document.getElementById('armorBar')!,
      armorFill: document.getElementById('armorFill')!,
      weaponName: document.getElementById('weaponName')!,
      ammoCount: document.getElementById('ammoCount')!,
      scoreArea: document.getElementById('scoreArea')!,
      wantedArea: document.getElementById('wantedArea')!,
      comboArea: document.getElementById('comboArea')!,
      speedArea: document.getElementById('speedArea')!,
      interactHint: document.getElementById('interactHint')!,
      weaponSlots: document.getElementById('weaponSlots')!,
      storyHUD: document.getElementById('storyHUD')!,
      chapterIndicator: document.getElementById('chapterIndicator')!,
      missionObjective: document.getElementById('missionObjective')!,
      storyNotifications: document.getElementById('storyNotifications')!,
    };
    this.buildWeaponSlots();
  }

  private buildWeaponSlots(): void {
    this.elements.weaponSlots.innerHTML = '';
    this.slotElements = [];
    for (let i = 0; i < WEAPONS.length; i++) {
      const s = document.createElement('div');
      s.className = 'wslot';
      s.textContent = `${i + 1}`;
      this.elements.weaponSlots.appendChild(s);
      this.slotElements.push(s);
    }
  }

  show(): void {
    this.elements.hud.style.display = 'block';
  }

  hide(): void {
    this.elements.hud.style.display = 'none';
  }

  /** Update all HUD elements from current game state */
  update(stateManager: StateManager, vehicleSpeed: number | null, nearVehicle: boolean): void {
    const s = stateManager.getState();

    // Health bar
    this.elements.hpFill.style.width = `${s.hp}%`;

    // Armor bar
    if (s.armor > 0) {
      this.elements.armorBar.style.display = 'block';
      this.elements.armorFill.style.width = `${s.armor}%`;
    } else {
      this.elements.armorBar.style.display = 'none';
    }

    // Weapon info
    const w = WEAPONS[s.weaponIdx];
    this.elements.weaponName.textContent = w.name + (s.reloading ? ' (RELOADING)' : '');
    this.elements.ammoCount.textContent = s.weaponIdx === 0
      ? '\u221E'
      : `${s.ammo[s.weaponIdx]}/${w.mag}`;

    // Score + Money
    this.elements.scoreArea.innerHTML = `SCORE: ${s.score}<br>KILLS: ${s.kills}<br><span style="color:#44ff88">$${s.money}</span>`;

    // Wanted stars
    let stars = '';
    for (let i = 0; i < s.wanted; i++) stars += '\u2605';
    this.elements.wantedArea.textContent = stars;

    // Combo
    if (s.combo > 1 && s.comboTimer > 0) {
      this.elements.comboArea.style.opacity = '1';
      this.elements.comboArea.textContent = `${s.combo}x COMBO!`;
    } else {
      this.elements.comboArea.style.opacity = '0';
    }

    // Weapon slots highlight (only show owned weapons)
    if (s.weaponIdx !== this.prevWeaponIdx || this._ownedDirty(s.ownedWeapons)) {
      for (let i = 0; i < this.slotElements.length; i++) {
        const owned = s.ownedWeapons[i];
        this.slotElements[i].className = 'wslot'
          + (i === s.weaponIdx ? ' active' : '')
          + (!owned ? ' locked' : '');
      }
      this.prevWeaponIdx = s.weaponIdx;
      this._lastOwned = [...s.ownedWeapons];
    }

    // Speed (vehicle)
    if (vehicleSpeed !== null) {
      this.elements.speedArea.style.display = 'block';
      this.elements.speedArea.textContent = `${Math.abs(Math.round(vehicleSpeed * 3.6))} km/h`;
    } else {
      this.elements.speedArea.style.display = 'none';
    }

    // Vehicle proximity hint
    this.elements.interactHint.style.display = nearVehicle ? 'block' : 'none';

    // Update story notifications (fade expired)
    this.updateStoryNotifications();
  }

  // ===== Story Mode HUD =====

  /** Show the story HUD overlay (chapter indicator, objective, notifications). */
  showStoryHUD(): void {
    this.elements.storyHUD.style.display = 'block';
  }

  /** Hide the story HUD overlay and clear all story elements. */
  hideStoryHUD(): void {
    this.elements.storyHUD.style.display = 'none';
    this.elements.chapterIndicator.textContent = '';
    this.elements.missionObjective.textContent = '';
    this.elements.storyNotifications.innerHTML = '';
    this.storyNotifs = [];
  }

  /**
   * Set the chapter indicator text.
   * @param chapter - chapter number
   * @param title - chapter title
   */
  setChapter(chapter: number, title: string): void {
    this.elements.chapterIndicator.textContent = `第 ${chapter} 章 - ${title}`;
  }

  /** Update the current mission objective text. */
  updateObjective(text: string): void {
    this.elements.missionObjective.textContent = text;
  }

  // ===== Story Notifications (center-screen popups with auto-fade) =====

  /**
   * Create and show a story notification.
   * @param text - notification text
   * @param color - text color
   * @param duration - ms to display before fading
   */
  private showStoryNotification(text: string, color: string, duration: number): void {
    const el = document.createElement('div');
    el.className = 'story-notification';
    el.style.color = color;
    el.textContent = text;
    this.elements.storyNotifications.appendChild(el);

    this.storyNotifs.push({
      el,
      expireAt: performance.now() + duration,
      fadeDuration: 800,
    });

    // Trim excess
    while (this.storyNotifs.length > this.storyNotifMaxVisible) {
      const old = this.storyNotifs.shift()!;
      old.el.remove();
    }

    // Force reflow so the transition triggers
    el.offsetHeight; // eslint-disable-line
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }

  /** Show '任务开始: XXX' notification (green, 3s auto-fade). */
  notifyMissionStart(title: string): void {
    this.showStoryNotification(`任务开始: ${title}`, '#44ff88', 3000);
  }

  /** Show '任务完成: XXX' notification (gold, 4s auto-fade). */
  notifyMissionComplete(title: string): void {
    this.showStoryNotification(`任务完成: ${title}`, '#ffcc44', 4000);
  }

  /** Update the current objective text (alias for updateObjective). */
  notifyObjectiveUpdate(text: string): void {
    this.updateObjective(text);
  }

  /** Fade expired story notifications each frame. */
  private updateStoryNotifications(): void {
    const now = performance.now();
    for (let i = this.storyNotifs.length - 1; i >= 0; i--) {
      const n = this.storyNotifs[i];
      const elapsed = now - n.expireAt;
      if (elapsed > n.fadeDuration) {
        n.el.remove();
        this.storyNotifs.splice(i, 1);
      } else if (elapsed > 0) {
        const t = 1 - elapsed / n.fadeDuration;
        n.el.style.opacity = String(t);
      }
    }
  }
}
