import type { VehicleConfig } from '@game/index';

/**
 * Vehicle type definitions.
 *
 * Balance philosophy (speed vs durability trade-off):
 *   Sedan  — balanced all-rounder, good for general use
 *   Sports — highest speed & acceleration but fragile (low HP)
 *   Truck  — slowest but most durable, wide body blocks traffic
 *   Bike   — fastest acceleration & tightest turning, very fragile
 *   Police — slightly faster sedan with extra HP, used by police chases
 *
 * Units: speed in m/s, acceleration in m/s², turn in rad/s, HP in hit points.
 * Dimensions (w/h/l) are in world units ≈ metres.
 */
export const VEHICLE_TYPES: VehicleConfig[] = [
  { name: 'Sedan',  w: 2.2, h: 1.4, l: 4.5, maxSpd: 30, acc: 12, turn: 2.0, hp: 120, color: 0x3366aa },
  { name: 'Sports', w: 2.0, h: 1.2, l: 4.2, maxSpd: 45, acc: 18, turn: 2.4, hp: 80,  color: 0xcc2222 },
  { name: 'Truck',  w: 2.6, h: 2.0, l: 6.0, maxSpd: 20, acc: 8,  turn: 1.2, hp: 250, color: 0x557733 },
  { name: 'Bike',   w: 0.8, h: 1.2, l: 2.2, maxSpd: 40, acc: 22, turn: 3.5, hp: 40,  color: 0x888888 },
  { name: 'Police', w: 2.2, h: 1.4, l: 4.8, maxSpd: 38, acc: 15, turn: 2.2, hp: 160, color: 0x1a1a3e },
];
