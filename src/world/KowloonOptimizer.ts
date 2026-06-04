/**
 * 城寨性能优化器
 * 
 * 使用 InstancedMesh 和几何体合并来减少 draw call
 * 
 * 优化策略：
 * 1. 相同几何体+材质的对象使用 InstancedMesh
 * 2. 静态对象合并几何体
 * 3. 远处对象降低细节
 */
import * as THREE from 'three';
import { randomRange, randomInt, randomPick } from '@utils/math';
import type { BuildingData } from '@game/index';
import { KOWLOON_CENTRE_X, KOWLOON_CENTRE_Z, KOWLOON_RADIUS } from './StoryLocations';
import { getWoodMaterial, getMetalMaterial, getCardboardMaterial } from './TextureManager';

/**
 * 城寨性能优化器
 */
export class KowloonOptimizer {
  // InstancedMesh 缓存
  private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private instanceCounts: Map<string, number> = new Map();
  private maxInstances: Map<string, number> = new Map();

  /**
   * 创建或获取 InstancedMesh
   */
  private getOrCreateInstancedMesh(
    key: string,
    geometry: THREE.BufferGeometry,
    material?: THREE.Material,
    maxCount?: number
  ): THREE.InstancedMesh {
    if (!this.instancedMeshes.has(key)) {
      if (!material || !maxCount) {
        throw new Error(`Cannot create InstancedMesh ${key} without material and maxCount`);
      }
      const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
      instancedMesh.count = 0;
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      this.instancedMeshes.set(key, instancedMesh);
      this.instanceCounts.set(key, 0);
      this.maxInstances.set(key, maxCount);
    }
    return this.instancedMeshes.get(key)!;
  }

  addInstance(
    key: string,
    geometry: THREE.BufferGeometry,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3,
    maxCount?: number
  ): void {
    const instancedMesh = this.getOrCreateInstancedMesh(key, geometry);
    const count = this.instanceCounts.get(key)!;
    const max = maxCount ?? this.maxInstances.get(key) ?? 100;

    if (count >= max) {
      console.warn(`InstancedMesh ${key} reached max count: ${max}`);
      return;
    }

    // 设置变换矩阵
    const matrix = new THREE.Matrix4();
    matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation ?? new THREE.Euler()), scale ?? new THREE.Vector3(1, 1, 1));
    instancedMesh.setMatrixAt(count, matrix);

    instancedMesh.count = count + 1;
    this.instanceCounts.set(key, count + 1);
  }

  /**
   * 批量添加海报实例
   */
  addPosterInstances(
    group: THREE.Group,
    buildings: BuildingData[],
    cx: number,
    cz: number,
    r: number
  ): void {
    // 海报几何体（共享）
    const posterGeo = new THREE.PlaneGeometry(0.5, 0.7);

    // 海报颜色
    const posterColors = [
      0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff,
      0xff8844, 0x44ffff, 0x8844ff, 0xff8888, 0x88ff88,
    ];

    // 为每种颜色创建一个 InstancedMesh
    for (const color of posterColors) {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
      });
      this.getOrCreateInstancedMesh(`poster_${color}`, posterGeo, material, 200);
    }

    // 添加海报实例
    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      const posterCount = randomInt(3, 6);
      for (let i = 0; i < posterCount; i++) {
        const color = randomPick(posterColors);
        const side = randomInt(0, 3);

        let px = b.x;
        let pz = b.z;
        let py = randomRange(1, b.h * 0.7);
        let rotY = 0;

        if (side === 0) { pz = b.z + b.hd + 0.05; rotY = 0; }
        else if (side === 1) { pz = b.z - b.hd - 0.05; rotY = Math.PI; }
        else if (side === 2) { px = b.x + b.hw + 0.05; rotY = Math.PI / 2; }
        else { px = b.x - b.hw - 0.05; rotY = -Math.PI / 2; }

        this.addInstance(
          `poster_${color}`,
          posterGeo,
          new THREE.Vector3(px, py, pz),
          new THREE.Euler(0, rotY, randomRange(-0.1, 0.1)),
          new THREE.Vector3(randomRange(0.8, 1.2), randomRange(0.8, 1.2), 1),
          200
        );
      }
    }
  }

  /**
   * 批量添加涂鸦实例
   */
  addGraffitiInstances(
    group: THREE.Group,
    buildings: BuildingData[],
    cx: number,
    cz: number,
    r: number
  ): void {
    // 涂鸦几何体（共享）
    const graffitiGeo = new THREE.PlaneGeometry(1, 0.6);

    // 涂鸦颜色
    const graffitiColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];

    // 为每种颜色创建一个 InstancedMesh
    for (const color of graffitiColors) {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
      });
      this.getOrCreateInstancedMesh(`graffiti_${color}`, graffitiGeo, material, 100);
    }

    // 添加涂鸦实例
    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      if (Math.random() < 0.3) { // 30% 概率有涂鸦
        const color = randomPick(graffitiColors);
        const side = randomInt(0, 3);

        let gx = b.x;
        let gz = b.z;
        let gy = randomRange(0.5, b.h * 0.5);
        let gRotY = 0;

        if (side === 0) { gz = b.z + b.hd + 0.06; gRotY = 0; }
        else if (side === 1) { gz = b.z - b.hd - 0.06; gRotY = Math.PI; }
        else if (side === 2) { gx = b.x + b.hw + 0.06; gRotY = Math.PI / 2; }
        else { gx = b.x - b.hw - 0.06; gRotY = -Math.PI / 2; }

        this.addInstance(
          `graffiti_${color}`,
          graffitiGeo,
          new THREE.Vector3(gx, gy, gz),
          new THREE.Euler(0, gRotY, 0),
          new THREE.Vector3(randomRange(0.8, 1.5), randomRange(0.8, 1.2), 1),
          100
        );
      }
    }
  }

  /**
   * 批量添加杂物实例（垃圾桶、破家具等）
   */
  addClutterInstances(
    group: THREE.Group,
    cx: number,
    cz: number,
    r: number
  ): void {
    // 杂物几何体（共享）
    const binGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.6, 8);
    const chairGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
    const tableGeo = new THREE.BoxGeometry(0.8, 0.4, 0.6);
    const tireGeo = new THREE.TorusGeometry(0.3, 0.1, 8, 12);
    const boxGeo = new THREE.BoxGeometry(0.4, 0.3, 0.4);

    // 材质（共享）
    const binMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const chairMat = getWoodMaterial();
    const tableMat = getWoodMaterial();
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const boxMat = getCardboardMaterial();

    // 创建 InstancedMesh
    this.getOrCreateInstancedMesh('bin', binGeo, binMat, 50);
    this.getOrCreateInstancedMesh('chair', chairGeo, chairMat, 50);
    this.getOrCreateInstancedMesh('table', tableGeo, tableMat, 30);
    this.getOrCreateInstancedMesh('tire', tireGeo, tireMat, 30);
    this.getOrCreateInstancedMesh('box', boxGeo, boxMat, 80);

    // 添加杂物实例
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * r * 0.9;
      const x = cx + Math.cos(angle) * dist;
      const z = cz + Math.sin(angle) * dist;

      // 随机选择杂物类型
      const clutterType = randomInt(0, 4);
      let key: string;
      let geo: THREE.BufferGeometry;
      let mat: THREE.Material;
      let y: number;
      let rotY: number;
      let scale: THREE.Vector3;

      switch (clutterType) {
        case 0: // 垃圾桶
          key = 'bin';
          geo = binGeo;
          mat = binMat;
          y = 0.3;
          rotY = Math.random() * Math.PI;
          scale = new THREE.Vector3(1, 1, 1);
          break;
        case 1: // 破椅子
          key = 'chair';
          geo = chairGeo;
          mat = chairMat;
          y = 0.25;
          rotY = Math.random() * Math.PI;
          scale = new THREE.Vector3(1, 1, 1);
          break;
        case 2: // 破桌子
          key = 'table';
          geo = tableGeo;
          mat = tableMat;
          y = 0.2;
          rotY = Math.random() * Math.PI;
          scale = new THREE.Vector3(1, 1, 1);
          break;
        case 3: // 旧轮胎
          key = 'tire';
          geo = tireGeo;
          mat = tireMat;
          y = 0.3;
          rotY = Math.random() * Math.PI;
          scale = new THREE.Vector3(1, 1, 1);
          break;
        default: // 纸箱
          key = 'box';
          geo = boxGeo;
          mat = boxMat;
          y = 0.15;
          rotY = Math.random() * Math.PI;
          scale = new THREE.Vector3(randomRange(0.8, 1.2), randomRange(0.8, 1.2), randomRange(0.8, 1.2));
          break;
      }

      this.addInstance(
        key,
        geo,
        new THREE.Vector3(x, y, z),
        new THREE.Euler(0, rotY, 0),
        scale,
        150
      );
    }
  }

  /**
   * 批量添加垃圾袋实例
   */
  addGarbageInstances(
    group: THREE.Group,
    buildings: BuildingData[],
    cx: number,
    cz: number,
    r: number
  ): void {
    // 垃圾袋几何体（共享）
    const garbageGeo = new THREE.BoxGeometry(1, 1, 1);
    const GARBAGE_COLORS = [0x1a1a1a, 0x2a2a2a, 0x333333, 0x0f0f0f, 0x252525, 0x1f1f1f];

    // 为每种颜色创建 InstancedMesh
    for (const color of GARBAGE_COLORS) {
      const material = new THREE.MeshLambertMaterial({ color });
      this.getOrCreateInstancedMesh(`garbage_${color}`, garbageGeo, material, 2000);
    }

    // 添加垃圾袋实例
    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      const count = randomInt(3, 6);
      for (let i = 0; i < count; i++) {
        const color = GARBAGE_COLORS[randomInt(0, GARBAGE_COLORS.length - 1)];
        const x = b.x + randomRange(-b.hw * 1.2, b.hw * 1.2);
        const z = b.z + randomRange(-b.hd * 1.2, b.hd * 1.2);
        const y = randomRange(0.1, 0.6);
        const scale = randomRange(0.3, 0.9);

        this.addInstance(
          `garbage_${color}`,
          garbageGeo,
          new THREE.Vector3(x, y, z),
          new THREE.Euler(randomRange(-0.2, 0.2), Math.random() * Math.PI * 2, randomRange(-0.2, 0.2)),
          new THREE.Vector3(scale, scale * 0.6, scale),
          2000
        );
      }
    }
  }

  /**
   * 批量添加杂物实例（破箱子、砖块）
   */
  addDebrisInstances(
    group: THREE.Group,
    buildings: BuildingData[],
    cx: number,
    cz: number,
    r: number
  ): void {
    // 杂物几何体（共享）
    const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
    const DEBRIS_COLORS = [0x3a3a3a, 0x4a4a4a, 0x2a2a2a, 0x555555, 0x333333];

    // 为每种颜色创建 InstancedMesh
    for (const color of DEBRIS_COLORS) {
      const material = new THREE.MeshLambertMaterial({ color });
      this.getOrCreateInstancedMesh(`debris_${color}`, debrisGeo, material, 1500);
    }

    // 添加杂物实例
    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      const debrisCount = randomInt(2, 5);
      for (let i = 0; i < debrisCount; i++) {
        const color = DEBRIS_COLORS[randomInt(0, DEBRIS_COLORS.length - 1)];
        const x = b.x + randomRange(-b.hw * 1.1, b.hw * 1.1);
        const z = b.z + randomRange(-b.hd * 1.1, b.hd * 1.1);
        const y = randomRange(0.1, 0.4);
        const scale = randomRange(0.2, 0.5);

        this.addInstance(
          `debris_${color}`,
          debrisGeo,
          new THREE.Vector3(x, y, z),
          new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
          new THREE.Vector3(scale, scale * randomRange(0.5, 1.2), scale),
          1500
        );
      }
    }
  }

  /**
   * 批量添加塑料桶实例
   */
  addBucketInstances(
    group: THREE.Group,
    buildings: BuildingData[],
    cx: number,
    cz: number,
    r: number
  ): void {
    // 塑料桶几何体（共享）
    const bucketGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.6, 8);
    const bucketMat = new THREE.MeshLambertMaterial({ color: 0x2244aa });
    this.getOrCreateInstancedMesh('bucket', bucketGeo, bucketMat, 200);

    // 添加塑料桶实例
    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      // 20% 概率有塑料桶
      if (Math.random() > 0.8) {
        const x = b.x + randomRange(-b.hw * 1.1, b.hw * 1.1);
        const z = b.z + randomRange(-b.hd * 1.1, b.hd * 1.1);

        this.addInstance(
          'bucket',
          bucketGeo,
          new THREE.Vector3(x, 0.3, z),
          new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
          new THREE.Vector3(1, 1, 1),
          200
        );
      }
    }
  }

  /**
   * 批量添加水滴实例
   */
  addWaterDripInstances(
    group: THREE.Group,
    buildings: BuildingData[],
    cx: number,
    cz: number,
    r: number
  ): void {
    const dropGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const dropMat = new THREE.MeshBasicMaterial({ color: 0x4488aa, transparent: true, opacity: 0.6 });
    this.getOrCreateInstancedMesh('waterDrop', dropGeo, dropMat, 3000);

    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      const dripCount = randomInt(1, 3);
      for (let i = 0; i < dripCount; i++) {
        const side = randomInt(0, 3);
        let dropX = b.x;
        let dropZ = b.z;
        if (side === 0) dropZ = b.z + b.hd;
        else if (side === 1) dropZ = b.z - b.hd;
        else if (side === 2) dropX = b.x + b.hw;
        else dropX = b.x - b.hw;

        for (let j = 0; j < 3; j++) {
          this.addInstance(
            'waterDrop',
            dropGeo,
            new THREE.Vector3(
              dropX + randomRange(-0.2, 0.2),
              randomRange(0.5, 3),
              dropZ + randomRange(-0.2, 0.2)
            ),
            undefined,
            undefined,
            3000
          );
        }
      }
    }
  }

  /**
   * 批量添加水渍实例
   */
  addPuddleInstances(
    group: THREE.Group,
    buildings: BuildingData[],
    cx: number,
    cz: number,
    r: number
  ): void {
    const puddleGeo = new THREE.CircleGeometry(0.3, 8);
    const puddleMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.5 });
    this.getOrCreateInstancedMesh('puddle', puddleGeo, puddleMat, 1000);

    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      const dripCount = randomInt(1, 3);
      for (let i = 0; i < dripCount; i++) {
        const side = randomInt(0, 3);
        let dropX = b.x;
        let dropZ = b.z;
        if (side === 0) dropZ = b.z + b.hd;
        else if (side === 1) dropZ = b.z - b.hd;
        else if (side === 2) dropX = b.x + b.hw;
        else dropX = b.x - b.hw;

        this.addInstance(
          'puddle',
          puddleGeo,
          new THREE.Vector3(
            dropX + randomRange(-0.5, 0.5),
            0.02,
            dropZ + randomRange(-0.5, 0.5)
          ),
          new THREE.Euler(-Math.PI / 2, Math.random() * Math.PI, 0),
          undefined,
          1000
        );
      }
    }
  }

  /**
   * 批量添加霓虹灯实例
   */
  addNeonSignInstances(
    group: THREE.Group,
    buildings: BuildingData[],
    cx: number,
    cz: number,
    r: number
  ): void {
    const neonGeo = new THREE.BoxGeometry(1, 1, 1);
    const NEON_COLORS = [0xff0066, 0x00ff66, 0x6600ff, 0xff6600, 0x0066ff, 0xff3399, 0xff0000, 0x00ff00, 0x0066ff];

    // 为每种颜色创建 InstancedMesh
    for (const color of NEON_COLORS) {
      const material = new THREE.MeshBasicMaterial({ color });
      this.getOrCreateInstancedMesh(`neon_${color}`, neonGeo, material, 500);
    }

    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      const signCount = randomInt(1, 3);
      for (let s = 0; s < signCount; s++) {
        const color = NEON_COLORS[randomInt(0, NEON_COLORS.length - 1)];
        const side = randomInt(0, 3);
        let x = b.x;
        let z = b.z;
        if (side === 0) z = b.z + b.hd + 0.1;
        else if (side === 1) z = b.z - b.hd - 0.1;
        else if (side === 2) x = b.x + b.hw + 0.1;
        else x = b.x - b.hw - 0.1;
        const y = randomRange(2, b.h * 0.8);
        const w = randomRange(0.8, 2.5);
        const h = randomRange(0.2, 0.6);

        const rotY = side >= 2 ? Math.PI / 2 : 0;
        this.addInstance(
          `neon_${color}`,
          neonGeo,
          new THREE.Vector3(x, y, z),
          new THREE.Euler(0, rotY, 0),
          new THREE.Vector3(w, h, 0.1),
          500
        );
      }
    }
  }

  /**
   * 批量添加荧光灯实例
   */
  addFluorescentLightInstances(
    group: THREE.Group,
    buildings: BuildingData[],
    cx: number,
    cz: number,
    r: number
  ): void {
    const lightGeo = new THREE.BoxGeometry(1, 1, 1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xccddff });
    this.getOrCreateInstancedMesh('fluorescent', lightGeo, lightMat, 1000);

    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      const lightCount = randomInt(3, 5);
      for (let i = 0; i < lightCount; i++) {
        const side = randomInt(0, 3);
        let x = b.x;
        let z = b.z;
        if (side === 0) z = b.z + b.hd + 0.05;
        else if (side === 1) z = b.z - b.hd - 0.05;
        else if (side === 2) x = b.x + b.hw + 0.05;
        else x = b.x - b.hw - 0.05;
        const y = randomRange(2, 4);

        this.addInstance(
          'fluorescent',
          lightGeo,
          new THREE.Vector3(x, y, z),
          undefined,
          new THREE.Vector3(0.8, 0.1, 0.3),
          1000
        );
      }
    }
  }

  /**
   * 将所有 InstancedMesh 添加到场景
   */
  addToScene(group: THREE.Group): void {
    for (const [key, instancedMesh] of this.instancedMeshes) {
      if (instancedMesh.count > 0) {
        group.add(instancedMesh);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalInstances: number; meshCount: number } {
    let totalInstances = 0;
    for (const count of this.instanceCounts.values()) {
      totalInstances += count;
    }
    return {
      totalInstances,
      meshCount: this.instancedMeshes.size,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    for (const instancedMesh of this.instancedMeshes.values()) {
      instancedMesh.geometry.dispose();
      if (instancedMesh.material instanceof THREE.Material) {
        instancedMesh.material.dispose();
      }
    }
    this.instancedMeshes.clear();
    this.instanceCounts.clear();
    this.maxInstances.clear();
  }
}
