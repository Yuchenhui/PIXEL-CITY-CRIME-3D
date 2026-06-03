/**
 * Story mode location definitions for the 九龙城寨 (Kowloon Walled City) themed area.
 * All coordinates are fixed in world space; buildings are placed at init and
 * never overlap with procedural generation.
 */

// ========== Types ==========

/** Type of story location — controls building appearance and marker colour */
export type StoryLocationType =
  | 'entrance'
  | 'hq'
  | 'factory'
  | 'police'
  | 'warehouse'
  | 'nightclub';

/** A single story-mode landmark */
export interface StoryLocation {
  /** Unique identifier */
  id: string;
  /** Player-facing Chinese name */
  name: string;
  /** World X coordinate (centre) */
  x: number;
  /** World Z coordinate (centre) */
  z: number;
  /** Location type — drives visual style and minimap colour */
  type: StoryLocationType;
  /** Minimap marker hex colour (CSS string, e.g. '#ff3333') */
  markerColor: string;
  /** One-line flavour description */
  description: string;
}

// ========== Location Data ==========

/** All fixed story-mode landmarks */
export const STORY_LOCATIONS: StoryLocation[] = [
  {
    id: 'kowloon_entrance',
    name: '城寨入口',
    x: 0,
    z: 80,
    type: 'entrance',
    markerColor: '#ffaa00',
    description: '九龙城寨的主要入口',
  },
  {
    id: 'triad_hq',
    name: '三合会总部',
    x: -50,
    z: 30,
    type: 'hq',
    markerColor: '#ff3333',
    description: '陈文辉的大本营',
  },
  {
    id: 'drug_factory',
    name: '毒品工厂',
    x: 40,
    z: -60,
    type: 'factory',
    markerColor: '#ff8844',
    description: '地下制毒工场',
  },
  {
    id: 'police_station',
    name: '警察局',
    x: -80,
    z: -40,
    type: 'police',
    markerColor: '#4488ff',
    description: '腐败警察的控制区',
  },
  {
    id: 'dock_warehouse',
    name: '码头仓库',
    x: 100,
    z: 100,
    type: 'warehouse',
    markerColor: '#aa8844',
    description: '走私货物中转站',
  },
  {
    id: 'nightclub',
    name: '夜总会',
    x: 80,
    z: -80,
    type: 'nightclub',
    markerColor: '#ff44ff',
    description: '三合会控制的夜场',
  },
];

/** Kowloon Walled City district centre (near world origin) */
export const KOWLOON_CENTRE_X = 0;
export const KOWLOON_CENTRE_Z = 0;

/** Half-extent of the Kowloon district (units from centre) */
export const KOWLOON_RADIUS = 50;

/** Minimum clearance from Kowloon district to avoid normal buildings (units) */
export const KOWLOON_CLEARANCE = 55;

/** Minimum clearance around each story landmark to avoid normal buildings (units) */
export const STORY_LOCATION_CLEARANCE = 15;
