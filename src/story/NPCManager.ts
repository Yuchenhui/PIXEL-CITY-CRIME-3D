/**
 * NPC manager for story mode.
 *
 * Spawns, updates, and cleans up story NPCs in the game world.
 * Each NPC is a simple humanoid mesh (same body plan as enemies) with
 * affiliation-based coloring and configurable behavior.
 *
 * Behavior types:
 *   friendly — stands still, small idle sway
 *   neutral  — stands still, small idle sway (ignores player unless provoked)
 *   hostile  — attacks player on sight (reuses EnemyAI chase/attack pattern)
 *
 * Dialogue integration:
 *   Each NPC with an inkFile gets a DialogueTriggerManager interact trigger.
 *   Game code calls checkInteraction(playerX, playerZ) to find the nearest
 *   NPC in range, and tryDialogue(npc) to load and start the ink story.
 *
 * Usage:
 *   const npcMgr = new NPCManager(scene, dialogueManager, triggerManager);
 *   npcMgr.spawnNPC(character, x, z);
 *   // In game loop:
 *   npcMgr.update(dt, playerX, playerZ);
 *   const interactable = npcMgr.checkInteraction(playerX, playerZ);
 */

import * as THREE from 'three';
import type { CharacterDef } from './CharacterData';
import { CFG } from '@config/constants';
import { DialogueManager } from './DialogueManager';
import { DialogueTriggerManager, TriggerType } from './DialogueTrigger';

// ========== Shared NPC rendering resources ==========

/** Per-affiliation body colour (hex) */
const AFFILIATION_COLORS: Record<CharacterDef['affiliation'], number> = {
  neutral: 0x887766,
  triad:   0x992222,
  police:  0x2244aa,
  rebel:   0x558844,
};

/** Shared geometries — created once, reused by all NPCs */
const NPC_SHARED = {
  torsoGeo: new THREE.BoxGeometry(0.6, 0.8, 0.4),
  headGeo:  new THREE.SphereGeometry(0.22, 6, 5),
  armGeo:   new THREE.BoxGeometry(0.18, 0.6, 0.18),
  legGeo:   new THREE.BoxGeometry(0.2, 0.7, 0.2),
  headMat:  new THREE.MeshLambertMaterial({ color: 0xddaa77 }),
  legMat:   new THREE.MeshLambertMaterial({ color: 0x444444 }),
  /** Lazily created per-affiliation body materials */
  bodyMats: new Map<number, THREE.MeshLambertMaterial>(),
};

/** Get or create a body material for a given colour */
function getNPCBodyMat(color: number): THREE.MeshLambertMaterial {
  let mat = NPC_SHARED.bodyMats.get(color);
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({ color });
    NPC_SHARED.bodyMats.set(color, mat);
  }
  return mat;
}

/** Base hostile NPC damage per attack */
const NPC_HOSTILE_DMG = 5;
/** Hostile NPC sight range (units) — slightly shorter than gang enemies */
const NPC_HOSTILE_SIGHT = 20;
/** Hostile NPC fire cooldown (seconds) */
const NPC_HOSTILE_FIRE_RATE = 1.2;
/** Idle sway amplitude (radians) */
const NPC_IDLE_SWAY_AMP = 0.05;
/** Idle sway speed (rad/s) */
const NPC_IDLE_SWAY_SPEED = 0.8;

// ========== Story NPC Runtime Interface ==========

/** Runtime state for a spawned story NPC */
export interface StoryNPC {
  /** Static character definition */
  character: CharacterDef;
  /** Three.js mesh group (same child order as enemies) */
  mesh: THREE.Group;
  /** Current world X position */
  x: number;
  /** Current world Z position */
  z: number;
  /** Whether the player can interact (E) with this NPC */
  interactable: boolean;
  /** Whether dialogue has been triggered at least once */
  dialogueTriggered: boolean;
  /** Behavior type (resolved from character definition) */
  behavior: 'friendly' | 'hostile' | 'neutral';
  /** Whether the NPC is currently dead */
  dead: boolean;
  /** Facing angle in radians */
  angle: number;
  /** Fire cooldown timer for hostile NPCs (seconds) */
  fireTimer: number;
}

// ========== NPC Manager ==========

export class NPCManager {
  private npcs: StoryNPC[] = [];
  private scene: THREE.Group;
  private dialogueManager: DialogueManager;
  private triggerManager: DialogueTriggerManager;

  constructor(
    enemyGroup: THREE.Group,
    dialogueManager: DialogueManager,
    triggerManager: DialogueTriggerManager,
  ) {
    this.scene = enemyGroup;
    this.dialogueManager = dialogueManager;
    this.triggerManager = triggerManager;
  }

  /**
   * Spawn a story NPC at a world position.
   * Registers an interact trigger if the character has an ink file.
   */
  spawnNPC(character: CharacterDef, x: number, z: number): void {
    // Prevent duplicate spawns
    if (this.npcs.some(n => n.character.id === character.id)) return;

    const mesh = this.createNPCMesh(character);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);

    const behavior = character.behavior ?? this.resolveBehavior(character.affiliation);

    const npc: StoryNPC = {
      character,
      mesh,
      x,
      z,
      interactable: !!character.inkFile,
      dialogueTriggered: false,
      behavior,
      dead: false,
      angle: Math.random() * Math.PI * 2,
      fireTimer: 0,
    };

    this.npcs.push(npc);

    // Register interact trigger for dialogue-capable NPCs
    if (character.inkFile) {
      this.triggerManager.addTrigger({
        id: `npc_${character.id}`,
        type: TriggerType.Interact,
        inkFile: character.inkFile,
        position: { x, z },
        range: CFG.STORY.NPC_INTERACT_DIST,
        npcId: character.id,
      });
    }
  }

  /** Get all story NPCs (read-only) */
  getNPCs(): readonly StoryNPC[] {
    return this.npcs;
  }

  /**
   * Find the nearest NPC within interaction range.
   * Returns null if no NPC is close enough or no NPC is interactable.
   */
  getNearestNPC(playerX: number, playerZ: number, range: number): StoryNPC | null {
    let closest: StoryNPC | null = null;
    let closestDistSq = range * range;

    for (const npc of this.npcs) {
      if (npc.dead || !npc.interactable) continue;
      const dx = playerX - npc.x;
      const dz = playerZ - npc.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closest = npc;
      }
    }

    return closest;
  }

  /**
   * Check if the player can interact with any NPC right now.
   * Returns the nearest interactable NPC within CFG.STORY.NPC_INTERACT_DIST,
   * or null. Game code calls this to decide whether to show "Press E" hint.
   */
  checkInteraction(playerX: number, playerZ: number): StoryNPC | null {
    return this.getNearestNPC(playerX, playerZ, CFG.STORY.NPC_INTERACT_DIST);
  }

  /**
   * Attempt to start dialogue with an NPC.
   * Loads the NPC's ink file into the DialogueManager.
   * Returns true if dialogue was started.
   */
  tryDialogue(npc: StoryNPC): boolean {
    if (!npc.character.inkFile) return false;

    const triggerResult = this.triggerManager.fireInteractTrigger(`npc_${npc.character.id}`);
    if (!triggerResult) return false;

    // Load the ink story asynchronously — fire and forget;
    // the DialogueManager will be ready for .continue() on the next frame.
    this.dialogueManager.loadStory(triggerResult.inkFile).then(ok => {
      if (ok && triggerResult.inkKnot) {
        this.dialogueManager.goToKnot(triggerResult.inkKnot);
      }
    });

    npc.dialogueTriggered = true;
    return true;
  }

  /**
   * Get all hostile NPCs for external combat systems.
   * Returns only alive hostile NPCs that are in attack/chase state.
   */
  getHostileNPCs(): StoryNPC[] {
    return this.npcs.filter(n => !n.dead && n.behavior === 'hostile');
  }

  /** Clear all NPCs and remove meshes from the scene */
  clear(): void {
    for (const npc of this.npcs) {
      this.scene.remove(npc.mesh);
    }
    this.npcs = [];
  }

  /**
   * Update all NPC animations and hostile behavior.
   * Hostile NPCs chase and attack the player using simplified EnemyAI logic.
   */
  update(dt: number, playerX: number, playerZ: number): void {
    for (const npc of this.npcs) {
      if (npc.dead) continue;

      const dx = playerX - npc.x;
      const dz = playerZ - npc.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (npc.behavior === 'hostile') {
        this.updateHostile(npc, dt, dx, dz, dist);
      } else {
        this.updateIdle(npc, dt);
      }
    }
  }

  // ========== Private Helpers ==========

  /**
   * Resolve behavior type from affiliation when not explicitly set.
   *   triad   → hostile
   *   police  → neutral (police system manages wanted-based hostility separately)
   *   rebel   → friendly
   *   neutral → neutral
   */
  private resolveBehavior(affiliation: CharacterDef['affiliation']): 'friendly' | 'hostile' | 'neutral' {
    switch (affiliation) {
      case 'triad':   return 'hostile';
      case 'police':  return 'neutral';
      case 'rebel':   return 'friendly';
      case 'neutral': return 'neutral';
    }
  }

  /**
   * Idle animation for friendly/neutral NPCs.
   * Gentle body sway to indicate the NPC is alive and present.
   */
  private updateIdle(npc: StoryNPC, dt: number): void {
    const t = performance.now() / 1000;
    npc.mesh.rotation.y = npc.angle + Math.sin(t * NPC_IDLE_SWAY_SPEED) * NPC_IDLE_SWAY_AMP;
  }

  /**
   * Hostile NPC AI: chase → attack when player is in sight range.
   * Simplified version of EnemyAI logic without full state machine.
   */
  private updateHostile(npc: StoryNPC, dt: number, dx: number, dz: number, dist: number): void {
    npc.fireTimer = Math.max(0, npc.fireTimer - dt);

    if (dist < NPC_HOSTILE_SIGHT) {
      // Face the player
      npc.angle = Math.atan2(dx, dz);
      npc.mesh.rotation.y = npc.angle;

      if (dist > 4) {
        // Chase towards the player
        const speed = 3;
        const nx = npc.x + Math.sin(npc.angle) * speed * dt;
        const nz = npc.z + Math.cos(npc.angle) * speed * dt;
        npc.x = nx;
        npc.z = nz;
        npc.mesh.position.set(npc.x, 0, npc.z);

        // Walking leg animation
        this.animateLegs(npc, dt);
      }
      // Hostile NPCs do not fire directly — game code checks getHostileNPCs()
      // and applies damage through the standard EnemyAI combat pipeline.
    } else {
      // Out of sight range — idle
      this.updateIdle(npc, dt);
    }
  }

  /**
   * Walking leg animation (same pattern as EnemyAI).
   * Children[4] = lLeg, children[5] = rLeg.
   */
  private animateLegs(npc: StoryNPC, _dt: number): void {
    const t = performance.now() / CFG.ENEMY.WALK_ANIM_SPEED;
    if (npc.mesh.children[4]) {
      (npc.mesh.children[4] as THREE.Mesh).rotation.x = Math.sin(t) * CFG.ENEMY.LEG_SWING_AMP;
    }
    if (npc.mesh.children[5]) {
      (npc.mesh.children[5] as THREE.Mesh).rotation.x = -Math.sin(t) * CFG.ENEMY.LEG_SWING_AMP;
    }
  }

  /**
   * Create a simple humanoid mesh for a story NPC.
   * Same body plan as EnemyRenderer.createMesh but with affiliation-based colour.
   * Child order: [0]torso [1]head [2]lArm [3]rArm [4]lLeg [5]rLeg
   */
  private createNPCMesh(character: CharacterDef): THREE.Group {
    const g = new THREE.Group();
    const color = AFFILIATION_COLORS[character.affiliation];
    const bodyMat = getNPCBodyMat(color);

    // Torso
    const torso = new THREE.Mesh(NPC_SHARED.torsoGeo, bodyMat);
    torso.position.y = 1.2;
    torso.castShadow = true;
    g.add(torso);

    // Head
    const head = new THREE.Mesh(NPC_SHARED.headGeo, NPC_SHARED.headMat);
    head.position.y = 1.85;
    head.castShadow = false;
    g.add(head);

    // Arms
    const lArm = new THREE.Mesh(NPC_SHARED.armGeo, bodyMat);
    lArm.position.set(-0.45, 1.1, 0);
    lArm.castShadow = false;
    g.add(lArm);
    const rArm = new THREE.Mesh(NPC_SHARED.armGeo, bodyMat);
    rArm.position.set(0.45, 1.1, 0);
    rArm.castShadow = false;
    g.add(rArm);

    // Legs
    const lLeg = new THREE.Mesh(NPC_SHARED.legGeo, NPC_SHARED.legMat);
    lLeg.position.set(-0.15, 0.35, 0);
    lLeg.castShadow = false;
    g.add(lLeg);
    const rLeg = new THREE.Mesh(NPC_SHARED.legGeo, NPC_SHARED.legMat);
    rLeg.position.set(0.15, 0.35, 0);
    rLeg.castShadow = false;
    g.add(rLeg);

    return g;
  }
}
