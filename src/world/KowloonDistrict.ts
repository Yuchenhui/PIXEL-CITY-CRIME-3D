/**
 * 九龙城寨 (Kowloon Walled City) district generator.
 *
 * Creates a dense cluster of tightly-packed buildings with narrow alleys,
 * overhanging structures, and interconnected pathways. The district is
 * positioned near the world centre and excluded from normal generation.
 *
 * Unlike the regular BuildingSystem (which uses InstancedMesh chunks),
 * Kowloon buildings are individual meshes because they need varied
 * materials and overhanging geometry that InstancedMesh cannot express.
 */
import * as THREE from 'three';
import { CFG } from '@config/constants';
import { randomRange, randomInt, randomPick } from '@utils/math';
import type { BuildingData } from '@game/index';
import { KOWLOON_CENTRE_X, KOWLOON_CENTRE_Z, KOWLOON_RADIUS } from './StoryLocations';
import { getRandomBuildingMaterial, createKowloonMaterial } from './TextureManager';
import { createShopPrefab, getRandomShopType, type ShopType } from './KowloonShops';
import { KowloonAtmosphere } from './KowloonAtmosphere';
import { KowloonOptimizer } from './KowloonOptimizer';

// ========== 城寨常量 ==========

/** 建筑颜色（深灰、脏旧） */
const KOWLOON_COLORS = [
  0x3a3530, 0x4a4540, 0x353030, 0x454035,
  0x3a3a3a, 0x504a40, 0x3d3835, 0x484340,
];

/** 建筑尺寸范围 */
const MIN_SIZE = 2;
const MAX_SIZE = 6;

/** 建筑高度范围（城寨建筑高度差异大） */
const MIN_H = 12;
const MAX_H = 55;

/** 连接桥/通道概率 */
const BRIDGE_CHANCE = 0.3;

/** 悬挑结构概率 */
const OVERHANG_CHANCE = 0.5;

/**
 * 九龙城寨生成器
 * 核心特征：错综复杂、高低落差、无规则连接
 */
export class KowloonDistrict {
  private meshes: THREE.Mesh[] = [];
  private lights: THREE.Light[] = [];
  private atmosphere: KowloonAtmosphere = new KowloonAtmosphere();
  private optimizer: KowloonOptimizer = new KowloonOptimizer();

  /**
   * 生成城寨建筑群
   */
  generate(group: THREE.Group): BuildingData[] {
    const buildingGrid: BuildingData[] = [];
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    // 第一步：生成核心建筑群（随机分布，不规则）
    const buildings = this.generateCoreBuildings(group, cx, cz, r);
    buildingGrid.push(...buildings);

    // 第二步：在建筑之间添加连接通道（木板、铁皮）
    this.optimizer.addPassageInstances(group, buildings, cx, cz, r);

    // 第三步：添加悬挑结构（向外延伸的房间）
    this.optimizer.addOverhangInstances(group, buildings, cx, cz, r);

    // 第四步：添加屋顶结构（天线、水箱、违章建筑）
    this.optimizer.addRooftopStructureInstances(group, buildings, cx, cz, r);

    // 第五步：添加地面层的混乱结构（摊位、棚架）
    this.optimizer.addStallInstances(group, cx, cz, r);
    this.optimizer.addTarpInstances(group, cx, cz, r);
    this.optimizer.addPoleInstances(group, cx, cz, r);
    // 第六步：放置店铺预制件（城寨特色服务）
    this.placeShops(group, buildings);

    // 第七步：氛围效果（仅滴水、积水、污渍 - 海报涂鸦杂物由 KowloonOptimizer 用 InstancedMesh 处理）
    this.atmosphere.generate(group, buildings, true);
    this.optimizer.addPosterInstances(group, buildings, cx, cz, r);
    this.optimizer.addGraffitiInstances(group, buildings, cx, cz, r);
    this.optimizer.addClutterInstances(group, cx, cz, r);
    this.optimizer.addToScene(group);

    // 第九步：入口拱门
    this.createEntranceArch(group);

    return buildingGrid;
  }

  /**
   * 第一步：生成核心建筑群
   * 使用随机分布，不使用网格，让布局更有机
   */
  private generateCoreBuildings(
    group: THREE.Group,
    cx: number,
    cz: number,
    r: number
  ): BuildingData[] {
    const buildings: BuildingData[] = [];
    const buildGeo = new THREE.BoxGeometry(1, 1, 1);
    const placedRects: Array<{ x: number; z: number; hw: number; hd: number }> = [];

    // 使用极坐标随机分布，中心更密集
    const attempts = 300;
    for (let i = 0; i < attempts; i++) {
      // 极坐标：中心密集，边缘稀疏
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.6) * r; // 0.6 让中心更密集
      const px = cx + Math.cos(angle) * dist;
      const pz = cz + Math.sin(angle) * dist;

      // 随机尺寸
      const w = randomRange(MIN_SIZE, MAX_SIZE);
      const d = randomRange(MIN_SIZE, MAX_SIZE);
      const h = randomRange(MIN_H, MAX_H);

      // 检查是否与已有建筑重叠（允许少量重叠模拟城寨的紧密感）
      const hw = w / 2 + 0.3; // 0.3 的间隙
      const hd = d / 2 + 0.3;
      let overlap = false;
      for (const rect of placedRects) {
        const dx = Math.abs(px - rect.x);
        const dz = Math.abs(pz - rect.z);
        if (dx < hw + rect.hw && dz < hd + rect.hd) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;

      placedRects.push({ x: px, z: pz, hw, hd });

      // 随机旋转一点（不完全对齐）
      const rotY = randomRange(-0.1, 0.1);

      const mat = getRandomBuildingMaterial();
      const mesh = new THREE.Mesh(buildGeo, mat);
      mesh.position.set(px, h / 2, pz);
      mesh.scale.set(w, h, d);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      this.meshes.push(mesh);

      buildings.push({
        x: px,
        z: pz,
        hw: w / 2 + CFG.PLAYER_R,
        hd: d / 2 + CFG.PLAYER_R,
        h,
      });
    }

    return buildings;
  }

  /**
   * 第二步：添加连接通道（已移至 KowloonOptimizer）
   */
  private addConnectingPassages(_group: THREE.Group, _buildings: BuildingData[]): void {
    // 已移至 KowloonOptimizer.addPassageInstances()
  }

  /**
   * 第三步：添加悬挑结构（已移至 KowloonOptimizer）
   */
  private addOverhangs(_group: THREE.Group, _buildings: BuildingData[]): void {
    // 已移至 KowloonOptimizer.addOverhangInstances()
  }

  /**
   * 第四步：添加屋顶结构（已移至 KowloonOptimizer）
   */
  private addRooftopStructures(_group: THREE.Group, _buildings: BuildingData[]): void {
    // 已移至 KowloonOptimizer.addRooftopStructureInstances()
  }

  /**
   * 第五步：添加地面层的混乱结构（已移至 KowloonOptimizer）
   */
  private addGroundLevelChaos(_group: THREE.Group, _cx: number, _cz: number, _r: number): void {
    // 已移至 KowloonOptimizer.addStallInstances(), addTarpInstances(), addPoleInstances()
  }

  /**
   * 第六步：放置店铺预制件（城寨特色服务）
   * 在建筑之间随机放置各种店铺
   */
  private placeShops(group: THREE.Group, buildings: BuildingData[]): void {
    // 店铺类型及其出现概率
    const shopTypes: ShopType[] = [
      'fish_ball', 'fish_ball', 'fish_ball', // 鱼丸工场最多
      'dental', 'dental',                     // 牙科诊所很多
      'barber',                               // 理发店
      'grocery',                              // 杂货店
      'tea_restaurant',                       // 茶餐厅
      'noodle_shop',                          // 面条作坊
      'bbq_shop',                             // 烧腊工场
      'herbalist',                            // 中药房
      'bone_setter',                          // 正骨跌打
      'tailor',                               // 裁缝店
      'mahjong',                              // 麻将馆
      'electronics',                          // 电器维修
      'shoe_repair',                          // 修鞋档
    ];

    // 在建筑之间放置店铺
    const shopCount = 30; // 放置30个店铺
    for (let i = 0; i < shopCount; i++) {
      // 随机选择一个建筑
      const building = randomPick(buildings);
      
      // 随机选择店铺类型
      const shopType = randomPick(shopTypes);
      
      // 计算店铺位置（在建筑旁边）
      const angle = Math.random() * Math.PI * 2;
      const dist = building.hw + 1.5;
      const x = building.x + Math.cos(angle) * dist;
      const z = building.z + Math.sin(angle) * dist;
      
      // 创建店铺预制件
      const shop = createShopPrefab(
        shopType,
        new THREE.Vector3(x, 0, z),
        Math.random() * Math.PI * 2
      );
      group.add(shop);
    }
  }

  /**
   * 第七步：入口拱门
   */
  private createEntranceArch(group: THREE.Group): void {
    const entranceX = 0;
    const entranceZ = 75;

    // 纹理材质
    const pillarMat = createKowloonMaterial('concrete', 0x5a5550, 2);
    const beamMat = createKowloonMaterial('concrete', 0x6a6560, 2);
    const signMat = createKowloonMaterial('metal', 0xffcc00, 1);

    // 拱门支柱
    const pillarGeo = new THREE.BoxGeometry(1, 1, 1);

    // 左支柱
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(entranceX - 8, 10, entranceZ);
    leftPillar.scale.set(1.5, 20, 1.5);
    leftPillar.castShadow = true;
    group.add(leftPillar);
    this.meshes.push(leftPillar);

    // 右支柱
    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(entranceX + 8, 10, entranceZ);
    rightPillar.scale.set(1.5, 20, 1.5);
    rightPillar.castShadow = true;
    group.add(rightPillar);
    this.meshes.push(rightPillar);

    // 横梁
    const beamGeo = new THREE.BoxGeometry(1, 1, 1);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(entranceX, 20, entranceZ);
    beam.scale.set(18, 2, 2);
    beam.castShadow = true;
    group.add(beam);
    this.meshes.push(beam);

    // 招牌
    const signGeo = new THREE.BoxGeometry(1, 1, 1);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(entranceX, 22, entranceZ);
    sign.scale.set(10, 2, 0.3);
    group.add(sign);
    this.meshes.push(sign);

    // 霓虹灯光
    const neonLight = new THREE.PointLight(0xffaa00, 1.5, 25);
    neonLight.position.set(entranceX, 22, entranceZ + 2);
    group.add(neonLight);
    this.lights.push(neonLight);

    // 左右小霓虹灯
    const leftNeon = new THREE.PointLight(0xff6600, 0.8, 15);
    leftNeon.position.set(entranceX - 6, 15, entranceZ + 1);
    group.add(leftNeon);
    this.lights.push(leftNeon);

    const rightNeon = new THREE.PointLight(0xff6600, 0.8, 15);
    rightNeon.position.set(entranceX + 6, 15, entranceZ + 1);
    group.add(rightNeon);
    this.lights.push(rightNeon);
  }

  /** Dispose */
  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
    this.meshes = [];
    this.lights = [];
    this.atmosphere.dispose();
    this.optimizer.dispose();
  }
}
