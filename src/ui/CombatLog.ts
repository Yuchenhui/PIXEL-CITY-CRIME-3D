/**
 * Combat log: shows real-time event messages in the bottom-right corner.
 * Messages auto-fade after a few seconds.
 */

const ENEMY_NAMES: Record<string, string> = {
  civilian: '平民',
  gang: '帮派',
  police: '警察',
  heavy: '重甲兵',
};

interface LogEntry {
  el: HTMLDivElement;
  expireAt: number;
}

export class CombatLog {
  private container: HTMLDivElement;
  private entries: LogEntry[] = [];
  private maxVisible = 6;
  private fadeAfter = 3500;  // ms before fade starts
  private fadeDuration = 800; // ms for fade animation

  constructor() {
    this.container = document.getElementById('combatLog') as HTMLDivElement;
  }

  /** Add a message to the combat log */
  push(text: string, color = '#fff'): void {
    const el = document.createElement('div');
    el.className = 'log-msg';
    el.style.color = color;
    el.textContent = text;
    this.container.appendChild(el);

    this.entries.push({ el, expireAt: performance.now() + this.fadeAfter });

    // Trim excess
    while (this.entries.length > this.maxVisible) {
      const old = this.entries.shift()!;
      old.el.remove();
    }

    // Force reflow so the transition triggers
    el.offsetHeight; // eslint-disable-line
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  }

  /** Update every frame to fade expired messages */
  update(): void {
    const now = performance.now();
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      const elapsed = now - e.expireAt;
      if (elapsed > this.fadeDuration) {
        e.el.remove();
        this.entries.splice(i, 1);
      } else if (elapsed > 0) {
        const t = 1 - elapsed / this.fadeDuration;
        e.el.style.opacity = String(t);
      }
    }
  }

  // ---- Convenience event methods ----

  logDamage(enemyType: string, dmg: number, actualDmg: number): void {
    const name = ENEMY_NAMES[enemyType] || enemyType;
    const blocked = dmg - actualDmg;
    let text = `${name} 攻击了你  -${actualDmg} HP`;
    if (blocked > 0.5) text += ` (护甲挡了 ${Math.round(blocked)})`;
    this.push(text, '#ff5555');
  }

  logEnemyMiss(enemyType: string): void {
    const name = ENEMY_NAMES[enemyType] || enemyType;
    this.push(`${name} 射击偏了`, '#aaaaaa');
  }

  logKill(enemyType: string): void {
    const name = ENEMY_NAMES[enemyType] || enemyType;
    this.push(`击杀 ${name}`, '#44ff44');
  }

  logPickup(type: string): void {
    const names: Record<string, string> = { health: '医疗包', ammo: '弹药', armor: '护甲' };
    this.push(`拾取 ${names[type] || type}`, '#44aaff');
  }

  logThreat(direction: string, count: number): void {
    this.push(`${direction}有 ${count} 个敌人`, '#ffaa44');
  }

  logVehicleRunOver(): void {
    this.push('碾压了敌人!', '#ff8844');
  }

  logMoney(amount: number): void {
    this.push(`+$${amount}`, '#44ff88');
  }

  logPurchase(weaponName: string, price: number): void {
    this.push(`购入 ${weaponName}  -$${price}`, '#88ccff');
  }

  logCannotAfford(weaponName: string): void {
    this.push(`钱不够买 ${weaponName}`, '#ff8888');
  }

  show(): void {
    this.container.style.display = 'block';
  }

  hide(): void {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
    this.entries = [];
  }
}
