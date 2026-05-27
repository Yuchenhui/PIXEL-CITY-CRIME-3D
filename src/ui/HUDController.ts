import { WEAPONS, WEAPON_PRICES } from '@config/weapons';
import { StateManager } from '@core/StateManager';

/**
 * HUD controller: efficiently updates DOM elements to reflect game state.
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
  };

  private prevWeaponIdx = -1;
  private slotElements: HTMLElement[] = [];
  private _lastOwned: boolean[] = [];

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
  }
}
