/**
 * 九龙城寨店铺预制件系统
 * 
 * 每个预制件是一个完整的店铺组合，包含：
 * - 家具（桌椅、柜台、货架）
 * - 设备（炉灶、机器、灯具）
 * - 物品（商品、工具、装饰）
 * - 灯光（荧光灯、霓虹灯）
 * 
 * 使用方法：
 * 1. 创建预制件实例
 * 2. 设置位置和旋转
 * 3. 添加到场景
 */
import * as THREE from 'three';
import { randomRange, randomInt, randomPick } from '@utils/math';
import { createKowloonMaterial, getWoodMaterial, getMetalMaterial, getWallMaterial, getGroundMaterial, getFabricMaterial, getCardboardMaterial } from './TextureManager';

// ========== 预制件类型定义 ==========

/** 店铺类型枚举 */
export type ShopType = 
  | 'fish_ball'      // 鱼丸工场
  | 'barber'         // 理发店
  | 'dental'         // 牙科诊所
  | 'grocery'        // 杂货店
  | 'tea_restaurant' // 茶餐厅
  | 'bone_setter'    // 正骨跌打
  | 'tailor'         // 裁缝店
  | 'mahjong'        // 麻将馆
  | 'noodle_shop'    // 面条作坊
  | 'bbq_shop'       // 烧腊工场
  | 'herbalist'      // 中药房
  | 'electronics'    // 电器维修
  | 'shoe_repair'    // 修鞋档
  | 'cobbler';       // 皮匠

/** 预制件配置 */
export interface ShopConfig {
  type: ShopType;
  name: string;
  width: number;
  depth: number;
  height: number;
  lightColor: number;
  lightIntensity: number;
}

// ========== 店铺配置数据 ==========

export const SHOP_CONFIGS: Record<ShopType, ShopConfig> = {
  fish_ball: {
    type: 'fish_ball',
    name: '鱼丸工场',
    width: 4,
    depth: 3,
    height: 3,
    lightColor: 0xffaa44,
    lightIntensity: 0.8,
  },
  barber: {
    type: 'barber',
    name: '理发店',
    width: 3,
    depth: 3,
    height: 3,
    lightColor: 0xffffff,
    lightIntensity: 0.6,
  },
  dental: {
    type: 'dental',
    name: '牙科诊所',
    width: 3,
    depth: 4,
    height: 3,
    lightColor: 0xccddff,
    lightIntensity: 1.0,
  },
  grocery: {
    type: 'grocery',
    name: '杂货店',
    width: 4,
    depth: 3,
    height: 3,
    lightColor: 0xffcc88,
    lightIntensity: 0.5,
  },
  tea_restaurant: {
    type: 'tea_restaurant',
    name: '茶餐厅',
    width: 5,
    depth: 4,
    height: 3,
    lightColor: 0xffddaa,
    lightIntensity: 0.7,
  },
  bone_setter: {
    type: 'bone_setter',
    name: '正骨跌打',
    width: 3,
    depth: 3,
    height: 3,
    lightColor: 0xffaa66,
    lightIntensity: 0.6,
  },
  tailor: {
    type: 'tailor',
    name: '裁缝店',
    width: 3,
    depth: 3,
    height: 3,
    lightColor: 0xffffff,
    lightIntensity: 0.5,
  },
  mahjong: {
    type: 'mahjong',
    name: '麻将馆',
    width: 4,
    depth: 4,
    height: 3,
    lightColor: 0xff6644,
    lightIntensity: 0.4,
  },
  noodle_shop: {
    type: 'noodle_shop',
    name: '面条作坊',
    width: 4,
    depth: 3,
    height: 3,
    lightColor: 0xffcc66,
    lightIntensity: 0.7,
  },
  bbq_shop: {
    type: 'bbq_shop',
    name: '烧腊工场',
    width: 4,
    depth: 3,
    height: 3,
    lightColor: 0xff8844,
    lightIntensity: 0.9,
  },
  herbalist: {
    type: 'herbalist',
    name: '中药房',
    width: 3,
    depth: 3,
    height: 3,
    lightColor: 0xaa8844,
    lightIntensity: 0.5,
  },
  electronics: {
    type: 'electronics',
    name: '电器维修',
    width: 3,
    depth: 3,
    height: 3,
    lightColor: 0x4488ff,
    lightIntensity: 0.6,
  },
  shoe_repair: {
    type: 'shoe_repair',
    name: '修鞋档',
    width: 2,
    depth: 2,
    height: 2.5,
    lightColor: 0xffaa44,
    lightIntensity: 0.4,
  },
  cobbler: {
    type: 'cobbler',
    name: '皮匠',
    width: 2,
    depth: 2,
    height: 2.5,
    lightColor: 0xffaa44,
    lightIntensity: 0.4,
  },
};

// ========== 预制件生成器 ==========

/**
 * 生成店铺预制件
 * @param shopType 店铺类型
 * @param position 位置
 * @param rotation 旋转（弧度）
 * @returns THREE.Group 包含所有店铺物品
 */
export function createShopPrefab(
  shopType: ShopType,
  position: THREE.Vector3,
  rotation: number = 0
): THREE.Group {
  const config = SHOP_CONFIGS[shopType];
  const group = new THREE.Group();
  
  // 根据店铺类型生成不同的物品
  switch (shopType) {
    case 'fish_ball':
      createFishBallFactory(group, config);
      break;
    case 'barber':
      createBarberShop(group, config);
      break;
    case 'dental':
      createDentalClinic(group, config);
      break;
    case 'grocery':
      createGroceryStore(group, config);
      break;
    case 'tea_restaurant':
      createTeaRestaurant(group, config);
      break;
    case 'bone_setter':
      createBoneSetter(group, config);
      break;
    case 'tailor':
      createTailorShop(group, config);
      break;
    case 'mahjong':
      createMahjongParlor(group, config);
      break;
    case 'noodle_shop':
      createNoodleShop(group, config);
      break;
    case 'bbq_shop':
      createBBQShop(group, config);
      break;
    case 'herbalist':
      createHerbalistShop(group, config);
      break;
    case 'electronics':
      createElectronicsRepair(group, config);
      break;
    case 'shoe_repair':
    case 'cobbler':
      createShoeRepair(group, config);
      break;
  }
  
  // 设置位置和旋转
  group.position.copy(position);
  group.rotation.y = rotation;
  
  return group;
}

// ========== 具体店铺实现 ==========

/** 鱼丸工场 */
function createFishBallFactory(group: THREE.Group, config: ShopConfig): void {
  const metalMat = createKowloonMaterial('metal', 0x888888);
  const concreteMat = createKowloonMaterial('concrete', 0x666666);
  
  // 大锅
  const potGeo = new THREE.CylinderGeometry(0.8, 0.6, 0.5, 12);
  const pot = new THREE.Mesh(potGeo, metalMat);
  pot.position.set(0, 0.8, 0);
  group.add(pot);
  
  // 炉灶
  const stoveGeo = new THREE.BoxGeometry(1.5, 0.6, 1);
  const stove = new THREE.Mesh(stoveGeo, concreteMat);
  stove.position.set(0, 0.3, 0);
  group.add(stove);
  
  // 工作台
  const tableGeo = new THREE.BoxGeometry(2, 0.8, 1);
  const table = new THREE.Mesh(tableGeo, concreteMat);
  table.position.set(0, 0.4, 1.5);
  group.add(table);
  
  // 水槽
  const sinkGeo = new THREE.BoxGeometry(0.8, 0.6, 0.6);
  const sink = new THREE.Mesh(sinkGeo, metalMat);
  sink.position.set(1.5, 0.5, 0);
  group.add(sink);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 8);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 理发店 */
function createBarberShop(group: THREE.Group, config: ShopConfig): void {
  const metalMat = createKowloonMaterial('metal', 0xaaaaaa);
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  
  // 理发椅
  const chairGeo = new THREE.BoxGeometry(0.8, 1, 0.8);
  const chair = new THREE.Mesh(chairGeo, metalMat);
  chair.position.set(0, 0.5, 0);
  group.add(chair);
  
  // 镜子
  const mirrorGeo = new THREE.PlaneGeometry(1.5, 2);
  const mirrorMat = new THREE.MeshBasicMaterial({ 
    color: 0xaaddff, 
    transparent: true, 
    opacity: 0.7 
  });
  const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
  mirror.position.set(0, 1.5, -1.4);
  group.add(mirror);
  
  // 工具架
  const shelfGeo = new THREE.BoxGeometry(1.5, 0.1, 0.3);
  const shelf = new THREE.Mesh(shelfGeo, woodMat);
  shelf.position.set(0, 1.2, -1.2);
  group.add(shelf);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 牙科诊所 */
function createDentalClinic(group: THREE.Group, config: ShopConfig): void {
  const metalMat = createKowloonMaterial('metal', 0xcccccc);
  
  // 牙科椅
  const chairGeo = new THREE.BoxGeometry(0.8, 0.5, 2);
  const chair = new THREE.Mesh(chairGeo, metalMat);
  chair.position.set(0, 0.4, 0);
  group.add(chair);
  
  // 无影灯
  const lampGeo = new THREE.CylinderGeometry(0.3, 0.5, 0.2, 8);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.set(0, 2.5, 0);
  group.add(lamp);
  
  // 器械盘
  const trayGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
  const tray = new THREE.Mesh(trayGeo, metalMat);
  tray.position.set(0.8, 0.8, 0);
  group.add(tray);
  
  // 灯光（明亮）
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 8);
  light.position.set(0, 2.8, 0);
  group.add(light);
}

/** 杂货店 */
function createGroceryStore(group: THREE.Group, config: ShopConfig): void {
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  
  // 货架
  const shelfGeo = new THREE.BoxGeometry(0.3, 2, 1.5);
  for (let i = 0; i < 3; i++) {
    const shelf = new THREE.Mesh(shelfGeo, woodMat);
    shelf.position.set(-1.5 + i * 1.5, 1, 0);
    group.add(shelf);
  }
  
  // 收银台
  const counterGeo = new THREE.BoxGeometry(1, 0.8, 0.6);
  const counter = new THREE.Mesh(counterGeo, woodMat);
  counter.position.set(0, 0.4, 1.2);
  group.add(counter);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 茶餐厅 */
function createTeaRestaurant(group: THREE.Group, config: ShopConfig): void {
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  
  // 桌子
  const tableGeo = new THREE.BoxGeometry(1, 0.7, 1);
  for (let i = 0; i < 4; i++) {
    const table = new THREE.Mesh(tableGeo, woodMat);
    table.position.set(-1.5 + i * 1.5, 0.35, 0);
    group.add(table);
    
    // 椅子
    const chairGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
    for (let j = 0; j < 4; j++) {
      const chair = new THREE.Mesh(chairGeo, woodMat);
      const angle = (j / 4) * Math.PI * 2;
      chair.position.set(
        -1.5 + i * 1.5 + Math.cos(angle) * 0.6,
        0.25,
        Math.sin(angle) * 0.6
      );
      group.add(chair);
    }
  }
  
  // 柜台
  const counterGeo = new THREE.BoxGeometry(3, 1, 0.8);
  const counter = new THREE.Mesh(counterGeo, woodMat);
  counter.position.set(0, 0.5, -1.5);
  group.add(counter);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 8);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 正骨跌打 */
function createBoneSetter(group: THREE.Group, config: ShopConfig): void {
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  
  // 按摩床
  const bedGeo = new THREE.BoxGeometry(0.8, 0.5, 2);
  const bed = new THREE.Mesh(bedGeo, woodMat);
  bed.position.set(0, 0.4, 0);
  group.add(bed);
  
  // 药柜
  const cabinetGeo = new THREE.BoxGeometry(1.5, 2, 0.5);
  const cabinet = new THREE.Mesh(cabinetGeo, woodMat);
  cabinet.position.set(-1.2, 1, 0);
  group.add(cabinet);
  
  // 人体模型
  const dummyGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8);
  const dummyMat = new THREE.MeshLambertMaterial({ color: 0xcc9966 });
  const dummy = new THREE.Mesh(dummyGeo, dummyMat);
  dummy.position.set(1, 1, 0);
  group.add(dummy);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 裁缝店 */
function createTailorShop(group: THREE.Group, config: ShopConfig): void {
  const metalMat = createKowloonMaterial('metal', 0x888888);
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  
  // 缝纫机
  const machineGeo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
  const machine = new THREE.Mesh(machineGeo, metalMat);
  machine.position.set(0, 0.4, 0);
  group.add(machine);
  
  // 布料架
  const rackGeo = new THREE.BoxGeometry(0.1, 2, 1.5);
  const rack = new THREE.Mesh(rackGeo, woodMat);
  rack.position.set(-1.2, 1, 0);
  group.add(rack);
  
  // 人台
  const mannequinGeo = new THREE.CylinderGeometry(0.2, 0.15, 1.5, 8);
  const mannequinMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
  const mannequin = new THREE.Mesh(mannequinGeo, mannequinMat);
  mannequin.position.set(1, 1, 0);
  group.add(mannequin);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 麻将馆 */
function createMahjongParlor(group: THREE.Group, config: ShopConfig): void {
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  
  // 麻将桌
  const tableGeo = new THREE.BoxGeometry(1.2, 0.7, 1.2);
  for (let i = 0; i < 2; i++) {
    const table = new THREE.Mesh(tableGeo, woodMat);
    table.position.set(-1 + i * 2, 0.35, 0);
    group.add(table);
    
    // 椅子
    const chairGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
    for (let j = 0; j < 4; j++) {
      const chair = new THREE.Mesh(chairGeo, woodMat);
      const angle = (j / 4) * Math.PI * 2;
      chair.position.set(
        -1 + i * 2 + Math.cos(angle) * 0.8,
        0.25,
        Math.sin(angle) * 0.8
      );
      group.add(chair);
    }
  }
  
  // 香炉
  const incenseGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
  const incenseMat = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
  const incense = new THREE.Mesh(incenseGeo, incenseMat);
  incense.position.set(0, 1.5, -1.5);
  group.add(incense);
  
  // 灯光（昏暗）
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 面条作坊 */
function createNoodleShop(group: THREE.Group, config: ShopConfig): void {
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  const metalMat = createKowloonMaterial('metal', 0x888888);
  
  // 工作台
  const tableGeo = new THREE.BoxGeometry(2, 0.8, 1);
  const table = new THREE.Mesh(tableGeo, woodMat);
  table.position.set(0, 0.4, 0);
  group.add(table);
  
  // 大锅
  const potGeo = new THREE.CylinderGeometry(0.6, 0.5, 0.4, 12);
  const pot = new THREE.Mesh(potGeo, metalMat);
  pot.position.set(0, 1, 1);
  group.add(pot);
  
  // 面粉袋
  const bagGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
  const bagMat = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
  for (let i = 0; i < 3; i++) {
    const bag = new THREE.Mesh(bagGeo, bagMat);
    bag.position.set(1.5, 0.4, -0.5 + i * 0.6);
    group.add(bag);
  }
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 7);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 烧腊工场 */
function createBBQShop(group: THREE.Group, config: ShopConfig): void {
  const metalMat = createKowloonMaterial('metal', 0x666666);
  
  // 烤炉
  const ovenGeo = new THREE.BoxGeometry(2, 1.5, 1);
  const oven = new THREE.Mesh(ovenGeo, metalMat);
  oven.position.set(0, 0.75, 0);
  group.add(oven);
  
  // 挂钩
  const hookGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 4);
  for (let i = 0; i < 5; i++) {
    const hook = new THREE.Mesh(hookGeo, metalMat);
    hook.position.set(-0.8 + i * 0.4, 2, 0);
    group.add(hook);
  }
  
  // 灯光（暖色）
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 8);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 中药房 */
function createHerbalistShop(group: THREE.Group, config: ShopConfig): void {
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  
  // 药柜（百子柜）
  const cabinetGeo = new THREE.BoxGeometry(2, 2, 0.5);
  const cabinet = new THREE.Mesh(cabinetGeo, woodMat);
  cabinet.position.set(0, 1, -1.2);
  group.add(cabinet);
  
  // 药柜抽屉
  const drawerGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      const drawer = new THREE.Mesh(drawerGeo, woodMat);
      drawer.position.set(
        -0.85 + col * 0.15,
        0.2 + row * 0.2,
        -0.95
      );
      group.add(drawer);
    }
  }
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 电器维修 */
function createElectronicsRepair(group: THREE.Group, config: ShopConfig): void {
  const metalMat = createKowloonMaterial('metal', 0x888888);
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  
  // 工作台
  const tableGeo = new THREE.BoxGeometry(1.5, 0.8, 0.8);
  const table = new THREE.Mesh(tableGeo, woodMat);
  table.position.set(0, 0.4, 0);
  group.add(table);
  
  // 电视机
  const tvGeo = new THREE.BoxGeometry(0.8, 0.6, 0.5);
  const tv = new THREE.Mesh(tvGeo, metalMat);
  tv.position.set(0, 1.1, 0);
  group.add(tv);
  
  // 工具架
  const shelfGeo = new THREE.BoxGeometry(1.5, 0.1, 0.3);
  const shelf = new THREE.Mesh(shelfGeo, woodMat);
  shelf.position.set(0, 1.5, -0.8);
  group.add(shelf);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 修鞋档/皮匠 */
function createShoeRepair(group: THREE.Group, config: ShopConfig): void {
  const woodMat = createKowloonMaterial('wood', 0x8B4513);
  
  // 小凳子
  const stoolGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
  const stool = new THREE.Mesh(stoolGeo, woodMat);
  stool.position.set(0, 0.2, 0);
  group.add(stool);
  
  // 工具箱
  const toolboxGeo = new THREE.BoxGeometry(0.6, 0.4, 0.4);
  const toolbox = new THREE.Mesh(toolboxGeo, woodMat);
  toolbox.position.set(0.6, 0.2, 0);
  group.add(toolbox);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 4);
  light.position.set(0, 2, 0);
  group.add(light);
}

// ========== 工具函数 ==========

/**
 * 获取随机店铺类型
 */
export function getRandomShopType(): ShopType {
  const types: ShopType[] = [
    'fish_ball', 'barber', 'dental', 'grocery', 'tea_restaurant',
    'bone_setter', 'tailor', 'mahjong', 'noodle_shop', 'bbq_shop',
    'herbalist', 'electronics', 'shoe_repair', 'cobbler'
  ];
  return randomPick(types);
}

/**
 * 获取店铺配置
 */
export function getShopConfig(type: ShopType): ShopConfig {
  return SHOP_CONFIGS[type];
}
