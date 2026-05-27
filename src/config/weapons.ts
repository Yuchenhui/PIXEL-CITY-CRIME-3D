import type { WeaponConfig } from '@game/index';

export const WEAPONS: WeaponConfig[] = [
  { name: 'Pistol',  dmg: 18, rate: 0.28, mag: 12,  reload: 1.2, auto: false, range: 200, spread: 0.02, viewScale: 0.3,  color: 0x888888 },
  { name: 'SMG',     dmg: 10, rate: 0.07, mag: 30,  reload: 1.6, auto: true,  range: 150, spread: 0.06, viewScale: 0.4,  color: 0x6699bb },
  { name: 'Shotgun', dmg: 12, rate: 0.6,  mag: 6,   reload: 2.2, auto: false, range: 80,  spread: 0.12, viewScale: 0.45, color: 0xbb8844, pellets: 6 },
  { name: 'Rifle',   dmg: 30, rate: 0.13, mag: 30,  reload: 2.0, auto: true,  range: 300, spread: 0.01, viewScale: 0.5,  color: 0x44aa66 },
  { name: 'Sniper',  dmg: 90, rate: 1.2,  mag: 5,   reload: 2.8, auto: false, range: 500, spread: 0.002,viewScale: 0.55, color: 0xaaaaaa, zoom: 3 },
  { name: 'RPG',     dmg: 120,rate: 1.8,  mag: 1,   reload: 3.0, auto: false, range: 200, spread: 0.01, viewScale: 0.5,  color: 0xcc4444, explosive: true },
  { name: 'Grenade', dmg: 80, rate: 1.0,  mag: 3,   reload: 2.5, auto: false, range: 100, spread: 0.03, viewScale: 0.25, color: 0x669966, explosive: true, arc: true },
  { name: 'Flamer',  dmg: 5,  rate: 0.04, mag: 100, reload: 3.0, auto: true,  range: 30,  spread: 0.15, viewScale: 0.4,  color: 0xff8844, flame: true },
];

/** Weapon purchase prices (index 0 = Pistol = free/starting weapon) */
export const WEAPON_PRICES = [0, 500, 800, 1500, 2000, 3000, 1200, 2500];
