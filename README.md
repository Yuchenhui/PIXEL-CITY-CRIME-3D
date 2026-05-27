# Pixel City Crime 3D

First-person open-world crime game running entirely in the browser. Built with Three.js, Cannon-es, and TypeScript + Vite — no game engine, no asset files, everything is procedurally generated at runtime.

## Features

**Procedural City** — A 640×640 unit city with 20×20 blocks of buildings (8–40m tall), road networks with lane markings and sidewalks, trees, water boundaries, and a day/night cycle. Spatial chunking enables frustum culling so only visible geometry is rendered.

**Enemy AI** — Four enemy archetypes (Civilian, Gang, Police, Heavy) with a full state machine: patrol, chase, attack, flee. Enemies use line-of-sight detection via spatial hash grid — they cannot see or shoot through buildings. When they lose sight of you, they chase to your last known position before giving up.

**Weapons & Economy** — 8 weapons from pistol to RPG, each with distinct fire rate, spread, damage, and magazine. Kill enemies to earn money, spend it at the weapon shop (press B). Combo multiplier rewards kill streaks with bonus score.

**Vehicles** — 5 vehicle types (Sedan, Sports, Truck, Bike, Police) with first-person interior view including dashboard, steering wheel, A-pillars, and rearview mirror. Drive around the city, run over enemies.

**Two Game Modes** — Free Roam with random encounters and dynamic police response, or Survival with escalating waves that unlock harder enemy types.

**Performance** — InstancedMesh for buildings and trees, shared geometries/materials across all enemies, spatial hash grid for O(1) collision queries, fog to hide distant chunk transitions.

## Quick Start

```bash
# Clone
git clone git@github.com:Yuchenhui/PIXEL-CITY-CRIME-3D.git
cd PIXEL-CITY-CRIME-3D

# Install dependencies
npm install

# Start dev server (http://127.0.0.1:8765)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type check only
npm run typecheck
```

Requires Node.js 18+.

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look around |
| Left Click | Shoot |
| Right Click | ADS / Zoom (Sniper) |
| 1–8 | Switch weapon |
| R | Reload |
| E | Enter / Exit vehicle |
| Shift | Sprint |
| Space | Jump |
| B | Open / Close weapon shop |
| ESC | Pause |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Rendering | [Three.js](https://threejs.org/) 0.160 |
| Physics | [Cannon-es](https://pmndrs.github.io/cannon-es/) |
| Language | TypeScript 5.4 (strict mode) |
| Bundler | Vite 5.4 |
| Audio | Web Audio API (procedural synthesis, no audio files) |

## Project Structure

```
src/
├── main.ts              # Entry point
├── Game.ts              # Game orchestrator & main loop
├── config/              # Constants, weapon/enemy/vehicle configs
│   ├── constants.ts
│   ├── weapons.ts
│   ├── enemies.ts
│   └── vehicles.ts
├── core/                # Engine-level infrastructure
│   ├── Engine.ts        # Three.js scene, camera, renderer, lighting
│   ├── InputManager.ts  # Mouse/keyboard with PointerLock fallback
│   ├── PhysicsManager.ts# Cannon-es world + spatial hash grid
│   ├── StateManager.ts  # Central game state with event subscriptions
│   └── AudioManager.ts  # Procedural sound effects
├── systems/             # Game logic systems
│   ├── PlayerController.ts
│   ├── EnemyAI.ts       # AI state machine, LOS, accuracy, tracers
│   ├── ShootingSystem.ts# Raycasting, viewmodel, explosions
│   ├── VehicleSystem.ts # Driving physics, interior view
│   ├── PickupSystem.ts
│   ├── ParticleManager.ts
│   ├── DayNightCycle.ts
│   └── WaveManager.ts   # Survival waves & freeroam respawn
├── world/               # Procedural world generation
│   ├── WorldGenerator.ts
│   ├── BuildingSystem.ts# Spatial-chunked InstancedMesh
│   ├── RoadSystem.ts    # Chunked merged geometries
│   ├── VegetationSystem.ts
│   └── WaterSystem.ts
├── ui/                  # HUD and menus
│   ├── HUDController.ts
│   ├── MenuController.ts
│   ├── MinimapRenderer.ts
│   ├── CombatLog.ts
│   └── WeaponShop.ts
├── types/               # All TypeScript types and enums
│   └── index.ts
├── utils/               # Math helpers
│   └── math.ts
└── styles/              # CSS
    ├── hud.css
    └── menu.css
```

## Weapons

| # | Name | DMG | Fire Mode | Magazine | Price |
|---|------|-----|-----------|----------|-------|
| 1 | Pistol | 18 | Semi | 12 | Free |
| 2 | SMG | 10 | Auto | 30 | $500 |
| 3 | Shotgun | 12×6 | Semi | 6 | $800 |
| 4 | Rifle | 30 | Auto | 30 | $1,500 |
| 5 | Sniper | 90 | Semi | 5 | $2,000 |
| 6 | RPG | 120 | Semi | 1 | $3,000 |
| 7 | Grenade | 80 | Semi | 3 | $1,200 |
| 8 | Flamer | 5 | Auto | 100 | $2,500 |

## Enemy Types

| Type | HP | Damage | Sight | Accuracy | Behaviour |
|------|----|--------|-------|----------|-----------|
| Civilian | 30 | — | 20 | — | Flees on sight |
| Gang | 50 | 7 | 25 | 40% | Hostile, pistol |
| Police | 80 | 10 | 30 | 55% | Hostile only when wanted ≥ 1 |
| Heavy | 150 | 15 | 22 | 45% | RPG, slow but tanky |

## License

MIT
