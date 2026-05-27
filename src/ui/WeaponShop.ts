import { WEAPONS, WEAPON_PRICES } from '@config/weapons';
import { StateManager } from '@core/StateManager';
import { CombatLog } from '@ui/CombatLog';

/**
 * Weapon shop overlay: buy weapons with earned money.
 * Opens with B key, closes with B or Escape.
 * Each purchase grants the weapon plus 3× magazine ammo.
 */
export class WeaponShop {
  private overlay: HTMLDivElement;
  private listEl: HTMLDivElement;
  private moneyEl: HTMLDivElement;
  private isOpen = false;

  constructor(
    private stateManager: StateManager,
    private combatLog: CombatLog,
  ) {
    this.overlay = document.getElementById('weaponShop') as HTMLDivElement;
    this.listEl = document.getElementById('shopList') as HTMLDivElement;
    this.moneyEl = document.getElementById('shopMoney') as HTMLDivElement;

    this.buildList();
  }

  /** Build the weapon list DOM from WEAPONS config */
  private buildList(): void {
    this.listEl.innerHTML = '';
    for (let i = 0; i < WEAPONS.length; i++) {
      const w = WEAPONS[i];
      const price = WEAPON_PRICES[i];
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.dataset.idx = String(i);
      row.innerHTML = `
        <span class="shop-name">${w.name}</span>
        <span class="shop-stats">DMG:${w.dmg} | ${w.auto ? 'AUTO' : 'SEMI'} | MAG:${w.mag}</span>
        <span class="shop-price">${price === 0 ? 'FREE' : '$' + price}</span>
        <button class="shop-btn" data-idx="${i}">BUY</button>
      `;
      this.listEl.appendChild(row);
    }

    // Buy button handler (delegated to list container)
    this.listEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.shop-btn') as HTMLButtonElement | null;
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      this.buyWeapon(idx);
    });
  }

  /** Attempt to purchase a weapon; deducts money and grants starting ammo on success */
  private buyWeapon(idx: number): void {
    const s = this.stateManager.getMutableState();
    if (idx <= 0 || idx >= WEAPONS.length) return;
    if (s.ownedWeapons[idx]) return; // Already owned

    const price = WEAPON_PRICES[idx];
    if (s.money < price) {
      this.combatLog.logCannotAfford(WEAPONS[idx].name);
      return;
    }

    s.money -= price;
    s.ownedWeapons[idx] = true;
    s.ammo[idx] = WEAPONS[idx].mag * 3; // Starting ammo: 3 full magazines
    this.combatLog.logPurchase(WEAPONS[idx].name, price);
    this.refreshRow(idx);
    this.updateMoney();
  }

  /** Update a single row's button to show OWNED state */
  private refreshRow(idx: number): void {
    const s = this.stateManager.getState();
    const rows = this.listEl.querySelectorAll('.shop-row');
    const row = rows[idx] as HTMLElement;
    if (!row) return;

    const btn = row.querySelector('.shop-btn') as HTMLButtonElement;
    if (s.ownedWeapons[idx]) {
      btn.textContent = 'OWNED';
      btn.disabled = true;
      row.classList.add('owned');
    }
  }

  /** Refresh all rows and money display */
  private refreshAll(): void {
    const s = this.stateManager.getState();
    this.updateMoney();
    for (let i = 0; i < WEAPONS.length; i++) {
      this.refreshRow(i);
    }
  }

  /** Update the money display */
  private updateMoney(): void {
    const s = this.stateManager.getState();
    this.moneyEl.textContent = `$${s.money}`;
  }

  /** Toggle shop open/closed */
  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Open the shop overlay and refresh state */
  open(): void {
    this.isOpen = true;
    this.refreshAll();
    this.overlay.style.display = 'flex';
  }

  /** Close the shop overlay */
  close(): void {
    this.isOpen = false;
    this.overlay.style.display = 'none';
  }

  /** Whether the shop is currently open */
  get openState(): boolean {
    return this.isOpen;
  }
}
