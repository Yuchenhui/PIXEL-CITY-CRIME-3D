/**
 * 九龙城寨细节生成器
 * 
 * 生成杂乱的电线、垃圾袋、霓虹灯、荧光灯、老鼠等细节元素，
 * 还原城寨"脏乱差"的真实氛围。
 */
import * as THREE from 'three';
import { CFG } from '@config/constants';
import { randomRange, randomInt, randomPick } from '@utils/math';
import type { BuildingData } from '@game/index';
import { KOWLOON_CENTRE_X, KOWLOON_CENTRE_Z, KOWLOON_RADIUS } from './StoryLocations';
import { createKowloonMaterial } from './TextureManager';

// ========== 细节常量 ==========

/** 电线颜色（老旧、肮脏） */
const WIRE_COLORS = [0x222222, 0x333333, 0x1a1a1a, 0x2a2a2a];

/** 垃圾袋颜色 */
const GARBAGE_COLORS = [0x1a1a1a, 0x2a2a2a, 0x333333, 0x0f0f0f];

/** 霓虹灯颜色 */
const NEON_COLORS = [0xff0066, 0x00ff66, 0x6600ff, 0xff6600, 0x0066ff, 0xff3399];

/** 荧光灯颜色 */
const FLUORESCENT_COLOR = 0xccddff;

/**
 * 九龙城寨细节生成器
 */
export class KowloonDetails {
  private meshes: THREE.Mesh[] = [];
  private lines: THREE.Line[] = [];
  private lights: THREE.Light[] = [];

  /**
   * 生成所有细节元素
   */
  generate(group: THREE.Group, buildings: BuildingData[]): void {
    this.generateWires(group, buildings);
    this.generateGarbage(group, buildings);
    this.generateNeonSigns(group, buildings);
    this.generateFluorescentLights(group, buildings);
    this.generateRats(group, buildings);
    this.generatePipes(group, buildings);
    this.generateLaundry(group, buildings);
  }

  /**
   * 生成杂乱电线（私拉乱接）
   */
  private generateWires(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    // 在建筑之间拉电线
    for (let i = 0; i < buildings.length; i++) {
      const b1 = buildings[i];
      const dx1 = b1.x - cx;
      const dz1 = b1.z - cz;
      if (Math.sqrt(dx1 * dx1 + dz1 * dz1) > r) continue;

      // 找附近的建筑连接电线
      for (let j = i + 1; j < buildings.length; j++) {
        const b2 = buildings[j];
        const dx = b2.x - b1.x;
        const dz = b2.z - b1.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // 只连接 15 单位内的建筑
        if (dist > 15 || dist < 3) continue;

        // 随机决定是否拉电线（50% 概率）
        if (Math.random() > 0.5) continue;

        // 电线数量（1-3 根）
        const wireCount = randomInt(1, 3);
        for (let w = 0; w < wireCount; w++) {
          this.createWire(group, b1, b2, dist);
        }
      }
    }
  }

  /**
   * 创建一根电线
   */
  private createWire(group: THREE.Group, b1: BuildingData, b2: BuildingData, dist: number): void {
    // 电线高度（在建筑中间偏下）
    const h1 = randomRange(5, b1.h * 0.6);
    const h2 = randomRange(5, b2.h * 0.6);

    // 电线颜色
    const color = randomPick(WIRE_COLORS);
    const material = new THREE.LineBasicMaterial({ color });

    // 创建曲线点（电线会下垂）
    const points: THREE.Vector3[] = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = b1.x + (b2.x - b1.x) * t;
      const z = b1.z + (b2.z - b1.z) * t;
      // 下垂效果
      const sag = Math.sin(t * Math.PI) * randomRange(0.5, 2);
      const y = h1 + (h2 - h1) * t - sag;
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    group.add(line);
    this.lines.push(line);
  }

  /**
   * 生成垃圾袋和杂物
   */
  private generateGarbage(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    const garbageGeo = new THREE.BoxGeometry(1, 1, 1);

    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      // 每栋建筑附近放 1-3 个垃圾袋
      const count = randomInt(1, 3);
      for (let i = 0; i < count; i++) {
        const color = randomPick(GARBAGE_COLORS);
        const material = new THREE.MeshLambertMaterial({ color });

        const mesh = new THREE.Mesh(garbageGeo, material);
        const x = b.x + randomRange(-b.hw, b.hw);
        const z = b.z + randomRange(-b.hd, b.hd);
        const y = randomRange(0.2, 0.8);
        const scale = randomRange(0.3, 0.8);

        mesh.position.set(x, y, z);
        mesh.scale.set(scale, scale * 0.6, scale);
        mesh.rotation.y = Math.random() * Math.PI * 2;
        mesh.castShadow = true;

        group.add(mesh);
        this.meshes.push(mesh);
      }
    }
  }

  /**
   * 生成霓虹灯招牌
   */
  private generateNeonSigns(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    const neonGeo = new THREE.BoxGeometry(1, 1, 1);

    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      // 30% 的建筑有霓虹灯
      if (Math.random() > 0.3) continue;

      const color = randomPick(NEON_COLORS);
      const material = new THREE.MeshBasicMaterial({ color });

      const mesh = new THREE.Mesh(neonGeo, material);
      const x = b.x;
      const z = b.z + b.hd + 0.1;
      const y = randomRange(3, b.h * 0.7);
      const w = randomRange(1, 3);
      const h = randomRange(0.3, 0.8);

      mesh.position.set(x, y, z);
      mesh.scale.set(w, h, 0.1);
      mesh.castShadow = false;

      group.add(mesh);
      this.meshes.push(mesh);

      // 添加点光源
      const light = new THREE.PointLight(color, 0.5, 8);
      light.position.set(x, y, z + 1);
      group.add(light);
      this.lights.push(light);
    }
  }

  /**
   * 生成荧光灯（地面层照明）
   */
  private generateFluorescentLights(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    const lightGeo = new THREE.BoxGeometry(1, 1, 1);
    const lightMat = new THREE.MeshBasicMaterial({ color: FLUORESCENT_COLOR });

    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      // 每栋建筑 1-2 盏荧光灯
      const count = randomInt(1, 2);
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(lightGeo, lightMat);
        const x = b.x + randomRange(-b.hw * 0.5, b.hw * 0.5);
        const z = b.z + b.hd + 0.05;
        const y = randomRange(2.5, 4);

        mesh.position.set(x, y, z);
        mesh.scale.set(randomRange(0.8, 1.5), 0.1, 0.05);

        group.add(mesh);
        this.meshes.push(mesh);

        // 添加点光源
        const light = new THREE.PointLight(FLUORESCENT_COLOR, 0.3, 6);
        light.position.set(x, y, z + 0.5);
        group.add(light);
        this.lights.push(light);
      }
    }
  }

  /**
   * 生成老鼠（动画物体）
   */
  private generateRats(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    const ratGeo = new THREE.BoxGeometry(1, 1, 1);
    const ratMat = new THREE.MeshLambertMaterial({ color: 0x444433 });

    // 生成 10-20 只老鼠
    const ratCount = randomInt(10, 20);
    for (let i = 0; i < ratCount; i++) {
      const b = randomPick(buildings);
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      const mesh = new THREE.Mesh(ratGeo, ratMat);
      const x = b.x + randomRange(-b.hw, b.hw);
      const z = b.z + randomRange(-b.hd, b.hd);
      const y = 0.15;

      mesh.position.set(x, y, z);
      mesh.scale.set(0.3, 0.15, 0.5);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.castShadow = false;

      group.add(mesh);
      this.meshes.push(mesh);
    }
  }

  /**
   * 生成暴露管道
   */
  private generatePipes(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    const pipeGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 6);
    const pipeMat = new THREE.MeshLambertMaterial({ color: 0x666666 });

    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      // 每栋建筑 1-2 根垂直管道
      const count = randomInt(1, 2);
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(pipeGeo, pipeMat);
        const x = b.x + randomRange(-b.hw * 0.8, b.hw * 0.8);
        const z = b.z + b.hd + 0.15;
        const y = b.h / 2;

        mesh.position.set(x, y, z);
        mesh.scale.set(1, b.h, 1);
        mesh.castShadow = true;

        group.add(mesh);
        this.meshes.push(mesh);
      }
    }
  }

  /**
   * 生成晾衣绳
   */
  private generateLaundry(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    const laundryColors = [0xffffff, 0xdddddd, 0xcccccc, 0xeeeeee, 0xf5f5f5];

    for (let i = 0; i < buildings.length; i++) {
      const b1 = buildings[i];
      const dx1 = b1.x - cx;
      const dz1 = b1.z - cz;
      if (Math.sqrt(dx1 * dx1 + dz1 * dz1) > r) continue;

      // 找附近的建筑挂晾衣绳
      for (let j = i + 1; j < buildings.length; j++) {
        const b2 = buildings[j];
        const dx = b2.x - b1.x;
        const dz = b2.z - b1.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 10 || dist < 2) continue;
        if (Math.random() > 0.3) continue;

        // 晾衣绳高度
        const h = randomRange(8, Math.min(b1.h, b2.h) * 0.7);

        // 创建晾衣绳（线条）
        const points = [
          new THREE.Vector3(b1.x, h, b1.z),
          new THREE.Vector3(b2.x, h, b2.z),
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x888888 });
        const line = new THREE.Line(lineGeo, lineMat);
        group.add(line);
        this.lines.push(line);

        // 挂几件衣服
        const clothCount = randomInt(2, 5);
        const clothGeo = new THREE.PlaneGeometry(0.5, 0.8);
        for (let c = 0; c < clothCount; c++) {
          const t = (c + 1) / (clothCount + 1);
          const clothColor = randomPick(laundryColors);
          const clothMat = new THREE.MeshLambertMaterial({
            color: clothColor,
            side: THREE.DoubleSide,
          });

          const cloth = new THREE.Mesh(clothGeo, clothMat);
          const x = b1.x + (b2.x - b1.x) * t;
          const z = b1.z + (b2.z - b1.z) * t;
          const y = h - randomRange(0.3, 0.6);

          cloth.position.set(x, y, z);
          cloth.rotation.y = Math.random() * Math.PI;
          cloth.rotation.z = randomRange(-0.2, 0.2);

          group.add(cloth);
          this.meshes.push(cloth);
        }
      }
    }
  }

  /**
   * 清理所有细节元素
   */
  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
    for (const l of this.lines) {
      l.geometry.dispose();
      if (l.material instanceof THREE.Material) l.material.dispose();
    }
    this.meshes = [];
    this.lines = [];
    this.lights = [];
  }
}
