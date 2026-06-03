/**
 * Character definitions for the 九龙城寨 (Kowloon Walled City) story mode.
 *
 * Defines the main cast, NPC affiliations, and spawn positions
 * scattered around the city. Affiliation determines default AI behavior:
 *   neutral — ignores player unless provoked
 *   triad   — hostile to player by default
 *   police  — hostile when wanted level >= 1
 *   rebel   — friendly, may assist player
 */

// ========== Character Definition Interface ==========

/** Static character definition used by NPCManager to spawn story NPCs */
export interface CharacterDef {
  /** Unique character identifier */
  id: string;
  /** Display name (Chinese) */
  name: string;
  /** Narrative role (e.g. '三合会头目') */
  role: string;
  /** Short character description for UI tooltips / codex */
  description: string;
  /** Faction affiliation — determines default AI behavior */
  affiliation: 'neutral' | 'triad' | 'police' | 'rebel';
  /** Optional path to ink JSON dialogue file (relative to public/) */
  inkFile?: string;
  /** NPC behavior type — defaults based on affiliation if omitted */
  behavior?: 'friendly' | 'hostile' | 'neutral';
}

// ========== Protagonist ==========

/** The player character — not spawned as an NPC but referenced in dialogue */
export const MAIN_CHARACTER: CharacterDef = {
  id: 'player',
  name: '阿城',
  role: 'protagonist',
  description: '从大陆偷渡来港的年轻人，为了生存误入城寨',
  affiliation: 'neutral',
};

// ========== Story Characters ==========

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'vinny',
    name: '陈文辉',
    role: '三合会头目',
    description: '九龙城寨的实际控制者，表面上经营赌档，实际上控制着整个港岛的毒品网络',
    affiliation: 'triad',
    inkFile: 'chapter1.json',
    behavior: 'hostile',
  },
  {
    id: 'inspector_wong',
    name: '黄志诚',
    role: '黑警探长',
    description: '收了三合会好处的腐败警察，暗中为陈文辉提供情报和保护伞',
    affiliation: 'police',
    inkFile: 'chapter1.json',
    behavior: 'neutral',
  },
  {
    id: 'boss_tang',
    name: '邓威',
    role: '毒品大亨',
    description: '从金三角来的毒枭，觊觎陈文辉的地盘，是城寨最大的外部威胁',
    affiliation: 'triad',
    inkFile: 'chapter2.json',
    behavior: 'hostile',
  },
  {
    id: 'shadow',
    name: '影子',
    role: '神秘线人',
    description: '没人知道他的真实身份，总在关键时刻出现提供情报，但代价不菲',
    affiliation: 'neutral',
    inkFile: 'chapter1.json',
    behavior: 'friendly',
  },
  {
    id: 'iron_fist',
    name: '铁手',
    role: '三合会打手',
    description: '陈文辉最信任的手下，负责城寨的日常"执法"，拳头比脑子好使',
    affiliation: 'triad',
    behavior: 'hostile',
  },
  {
    id: 'little_fish',
    name: '小鱼',
    role: '街头流浪儿',
    description: '在城寨长大的孤儿，对每条巷子都了如指掌，愿意为了一顿饭带路',
    affiliation: 'rebel',
    inkFile: 'chapter1.json',
    behavior: 'friendly',
  },
  {
    id: 'detective_chen',
    name: '陈雪儿',
    role: '复仇刑警',
    description: '父亲在城寨执行任务时失踪，为了追查真相自愿调入重案组',
    affiliation: 'police',
    inkFile: 'chapter3.json',
    behavior: 'neutral',
  },
  {
    id: 'brother_hua',
    name: '华哥',
    role: '退隐江湖',
    description: '曾经的三合会二把手，金盆洗手后在城寨开了一间茶餐厅',
    affiliation: 'neutral',
    inkFile: 'chapter2.json',
    behavior: 'friendly',
  },
  {
    id: 'junkie_ah_fai',
    name: '阿辉',
    role: '瘾君子',
    description: '被毒品毁掉的城寨居民，曾经是华哥的徒弟，如今沦落到街头',
    affiliation: 'neutral',
    behavior: 'neutral',
  },
  {
    id: 'old_li',
    name: '老李',
    role: '城寨元老',
    description: '在城寨住了四十年的老人，知道所有不为人知的秘密通道',
    affiliation: 'rebel',
    inkFile: 'chapter1.json',
    behavior: 'friendly',
  },
  {
    id: 'blade',
    name: '刀疤',
    role: '雇佣杀手',
    description: '脸上有一道刀疤的冷面杀手，只认钱不认人',
    affiliation: 'triad',
    behavior: 'hostile',
  },
];

// ========== NPC Spawn Points ==========
// Positions are scattered around the central city area.
// The map is 640×640 units centred at (0,0).

export const NPC_SPAWN_POINTS: Array<{ id: string; x: number; z: number }> = [
  { id: 'vinny',            x: -20,  z: -15  },
  { id: 'inspector_wong',   x:  80,  z:  40  },
  { id: 'boss_tang',        x: -60,  z:  50  },
  { id: 'shadow',           x:  10,  z: -60  },
  { id: 'iron_fist',        x: -30,  z:  10  },
  { id: 'little_fish',      x:  25,  z: -25  },
  { id: 'detective_chen',   x:  50,  z: -80  },
  { id: 'brother_hua',      x: -10,  z:  40  },
  { id: 'junkie_ah_fai',    x:  15,  z:  55  },
  { id: 'old_li',           x: -40,  z: -40  },
  { id: 'blade',            x:  60,  z: -10  },
];

// ========== Lookup Helpers ==========

/** Find a character definition by id, or undefined */
export function getCharacterById(id: string): CharacterDef | undefined {
  return CHARACTERS.find(c => c.id === id);
}

/** Get the spawn position for a character id, or undefined */
export function getSpawnPoint(id: string): { x: number; z: number } | undefined {
  return NPC_SPAWN_POINTS.find(p => p.id === id);
}
