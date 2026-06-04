/**
 * 城寨氛围效果
 * 
 * 包含：
 * - 墙上乱贴乱画（海报、涂鸦、小广告）
 * - 潮湿滴水效果（水管滴水、墙角渗水）
 * - 街巷杂物（垃圾桶、破家具、积水）
 */
import * as THREE from 'three';
import { randomRange, randomInt, randomPick } from '@utils/math';
import type { BuildingData } from '@game/index';
import { KOWLOON_CENTRE_X, KOWLOON_CENTRE_Z, KOWLOON_RADIUS } from './StoryLocations';
import { getWoodMaterial, getCardboardMaterial } from './TextureManager';
import { KowloonOptimizer } from './KowloonOptimizer';

/**
 * 城寨氛围效果管理器
 */
export class KowloonAtmosphere {
  private meshes: THREE.Mesh[] = [];
  private optimizer: KowloonOptimizer = new KowloonOptimizer();

  /**
   * 生成所有氛围效果
   * @param skipInstancedItems - 跳过海报、涂鸦、杂物（改由 KowloonOptimizer 用 InstancedMesh 处理）
   */
  generate(group: THREE.Group, buildings: BuildingData[], skipInstancedItems: boolean = false): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    if (!skipInstancedItems) {
      this.generateWallPosters(group, buildings);
      this.generateStreetClutter(group, buildings);
    }

    // 使用 InstancedMesh 优化滴水和水渍
    this.optimizer.addWaterDripInstances(group, buildings, cx, cz, r);
    this.optimizer.addPuddleInstances(group, buildings, cx, cz, r);
    this.optimizer.addToScene(group);
  }

  /**
   * 生成墙上乱贴乱画（海报、涂鸦、小广告）
   * 城寨特色：墙面贴满各种海报和涂鸦
   */
  private generateWallPosters(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    // 海报颜色（褪色、脏旧）
    const posterColors = [
      0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff,
      0xff8844, 0x44ffff, 0x8844ff, 0xff8888, 0x88ff88,
    ];

    // 涂鸦颜色
    const graffitiColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];

    for (const b of buildings) {
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      // 每栋建筑 3-8 张海报
      const posterCount = randomInt(3, 8);
      for (let i = 0; i < posterCount; i++) {
        const posterGeo = new THREE.PlaneGeometry(
          randomRange(0.3, 0.8),
          randomRange(0.4, 1.0)
        );
        const posterColor = randomPick(posterColors);
        const posterMat = new THREE.MeshBasicMaterial({
          color: posterColor,
          transparent: true,
          opacity: randomRange(0.6, 0.9),
        });
        const poster = new THREE.Mesh(posterGeo, posterMat);

        // 随机位置（墙上）
        const side = randomInt(0, 3);
        let px = b.x;
        let pz = b.z;
        let py = randomRange(1, b.h * 0.7);
        let rotY = 0;

        if (side === 0) { pz = b.z + b.hd + 0.05; rotY = 0; }
        else if (side === 1) { pz = b.z - b.hd - 0.05; rotY = Math.PI; }
        else if (side === 2) { px = b.x + b.hw + 0.05; rotY = Math.PI / 2; }
        else { px = b.x - b.hw - 0.05; rotY = -Math.PI / 2; }

        poster.position.set(px, py, pz);
        poster.rotation.y = rotY;
        poster.rotation.z = randomRange(-0.1, 0.1); // 轻微歪斜
        group.add(poster);
        this.meshes.push(poster);
      }

      // 涂鸦（1-3处）
      const graffitiCount = randomInt(1, 3);
      for (let i = 0; i < graffitiCount; i++) {
        const graffitiGeo = new THREE.PlaneGeometry(
          randomRange(0.5, 1.5),
          randomRange(0.3, 0.8)
        );
        const graffitiColor = randomPick(graffitiColors);
        const graffitiMat = new THREE.MeshBasicMaterial({
          color: graffitiColor,
          transparent: true,
          opacity: randomRange(0.4, 0.7),
        });
        const graffiti = new THREE.Mesh(graffitiGeo, graffitiMat);

        const side = randomInt(0, 3);
        let gx = b.x;
        let gz = b.z;
        let gy = randomRange(0.5, b.h * 0.5);
        let gRotY = 0;

        if (side === 0) { gz = b.z + b.hd + 0.06; gRotY = 0; }
        else if (side === 1) { gz = b.z - b.hd - 0.06; gRotY = Math.PI; }
        else if (side === 2) { gx = b.x + b.hw + 0.06; gRotY = Math.PI / 2; }
        else { gx = b.x - b.hw - 0.06; gRotY = -Math.PI / 2; }

        graffiti.position.set(gx, gy, gz);
        graffiti.rotation.y = gRotY;
        group.add(graffiti);
        this.meshes.push(graffiti);
      }
    }
  }

  /**
   * 生成潮湿滴水效果（水管滴水、墙角渗水）
   * 水滴和水渍已移至 KowloonOptimizer 使用 InstancedMesh
   */
  private generateDrippingWater(_group: THREE.Group, _buildings: BuildingData[]): void {
    // 水滴和水渍已移至 KowloonOptimizer.addWaterDripInstances() 和 addPuddleInstances()
  }

  /**
   * 生成街巷杂物（垃圾桶、破家具、积水等）
   * 城寨特色：巷子里堆满各种杂物
   */
  private generateStreetClutter(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    // 垃圾桶
    const binGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.6, 8);
    const binMat = new THREE.MeshLambertMaterial({ color: 0x444444 });

    // 破椅子
    const chairGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
    const chairMat = getWoodMaterial();

    // 破桌子
    const tableGeo = new THREE.BoxGeometry(0.8, 0.4, 0.6);
    const tableMat = getWoodMaterial();

    // 旧轮胎
    const tireGeo = new THREE.TorusGeometry(0.3, 0.1, 8, 12);
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    // 积水坑
    const puddleGeo = new THREE.CircleGeometry(0.5, 8);
    const puddleMat = new THREE.MeshBasicMaterial({
      color: 0x333344,
      transparent: true,
      opacity: 0.6,
    });

    // 在建筑之间放置杂物
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * r * 0.9;
      const x = cx + Math.cos(angle) * dist;
      const z = cz + Math.sin(angle) * dist;

      // 随机选择杂物类型
      const clutterType = randomInt(0, 5);
      let clutter: THREE.Mesh;

      switch (clutterType) {
        case 0: // 垃圾桶
          clutter = new THREE.Mesh(binGeo, binMat);
          clutter.position.set(x, 0.3, z);
          clutter.rotation.y = Math.random() * Math.PI;
          break;
        case 1: // 破椅子
          clutter = new THREE.Mesh(chairGeo, chairMat);
          clutter.position.set(x, 0.25, z);
          clutter.rotation.y = Math.random() * Math.PI;
          clutter.rotation.z = randomRange(-0.2, 0.2);
          break;
        case 2: // 破桌子
          clutter = new THREE.Mesh(tableGeo, tableMat);
          clutter.position.set(x, 0.2, z);
          clutter.rotation.y = Math.random() * Math.PI;
          break;
        case 3: // 旧轮胎
          clutter = new THREE.Mesh(tireGeo, tireMat);
          clutter.position.set(x, 0.3, z);
          clutter.rotation.x = Math.PI / 2;
          clutter.rotation.y = Math.random() * Math.PI;
          break;
        case 4: // 积水坑
          clutter = new THREE.Mesh(puddleGeo, puddleMat);
          clutter.position.set(x, 0.01, z);
          clutter.rotation.x = -Math.PI / 2;
          break;
        default: // 纸箱堆
          const boxGeo = new THREE.BoxGeometry(
            randomRange(0.3, 0.6),
            randomRange(0.2, 0.4),
            randomRange(0.3, 0.6)
          );
          const boxMat = getCardboardMaterial();
          clutter = new THREE.Mesh(boxGeo, boxMat);
          clutter.position.set(x, 0.2, z);
          clutter.rotation.y = Math.random() * Math.PI;
          break;
      }

      clutter.castShadow = true;
      group.add(clutter);
      this.meshes.push(clutter);
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
    this.meshes = [];
    this.optimizer.dispose();
  }
}
