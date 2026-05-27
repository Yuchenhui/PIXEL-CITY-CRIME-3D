import * as THREE from 'three';
import { CFG } from '@config/constants';
import type { ParticleEntity } from '@game/index';

/**
 * 3D particle system with pool limit and GPU resource management.
 */
export class ParticleManager {
  private particles: ParticleEntity[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Spawn particles at a position with a given color and count */
  spawn(x: number, y: number, z: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= CFG.MAX_PARTICLES) {
        const old = this.particles.shift()!;
        old.mesh.geometry.dispose();
        (old.mesh.material as THREE.Material).dispose();
        this.scene.remove(old.mesh);
      }

      const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      this.scene.add(m);

      this.particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 5 + 2,
        vz: (Math.random() - 0.5) * 8,
        life: 0.5 + Math.random() * 0.5,
      });
    }
  }

  /** Update all particles: physics, fade, removal */
  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 15 * dt;
      p.life -= dt;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life);

      if (p.life <= 0) {
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  /** Remove all particles */
  clear(): void {
    for (const p of this.particles) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      this.scene.remove(p.mesh);
    }
    this.particles = [];
  }
}
