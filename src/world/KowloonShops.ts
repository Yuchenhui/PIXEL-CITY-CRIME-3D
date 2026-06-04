/**
 * 九龙城寨店铺预制件系统
 * 
 * 城寨特色：拥挤、杂乱、设备满满
 * 每个店铺包含 8-15 个物件，模拟真实的城寨环境
 * 
 * 使用方法：
 * 1. 创建预制件实例
 * 2. 设置位置和旋转
 * 3. 添加到场景
 */
import * as THREE from 'three';
import { randomRange, randomInt, randomPick } from '@utils/math';
import { 
  createKowloonMaterial, 
  getWoodMaterial, 
  getMetalMaterial, 
  getWallMaterial, 
  getGroundMaterial, 
  getFabricMaterial, 
  getCardboardMaterial 
} from './TextureManager';

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
  
  // 添加城寨特色杂物
  addKowloonClutter(group, config);
  
  // 设置位置和旋转
  group.position.copy(position);
  group.rotation.y = rotation;
  
  return group;
}

/**
 * 添加城寨特色杂物（每个店铺都有）
 */
function addKowloonClutter(group: THREE.Group, config: ShopConfig): void {
  const cardboardMat = getCardboardMaterial();
  const metalMat = getMetalMaterial();
  const fabricMat = getFabricMaterial();
  
  // 纸箱（1-3个）
  const boxCount = randomInt(1, 3);
  for (let i = 0; i < boxCount; i++) {
    const boxGeo = new THREE.BoxGeometry(
      randomRange(0.3, 0.6),
      randomRange(0.3, 0.5),
      randomRange(0.3, 0.6)
    );
    const box = new THREE.Mesh(boxGeo, cardboardMat);
    box.position.set(
      randomRange(-config.width/2 + 0.5, config.width/2 - 0.5),
      randomRange(0.2, 0.4),
      randomRange(-config.depth/2 + 0.5, config.depth/2 - 0.5)
    );
    box.rotation.y = Math.random() * Math.PI;
    group.add(box);
  }
  
  // 铁桶（0-2个）
  const bucketCount = randomInt(0, 2);
  for (let i = 0; i < bucketCount; i++) {
    const bucketGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.4, 8);
    const bucket = new THREE.Mesh(bucketGeo, metalMat);
    bucket.position.set(
      randomRange(-config.width/2 + 0.3, config.width/2 - 0.3),
      0.2,
      randomRange(-config.depth/2 + 0.3, config.depth/2 - 0.3)
    );
    group.add(bucket);
  }
  
  // 塑料袋/垃圾（0-2个）
  const trashCount = randomInt(0, 2);
  for (let i = 0; i < trashCount; i++) {
    const trashGeo = new THREE.BoxGeometry(
      randomRange(0.2, 0.4),
      randomRange(0.1, 0.2),
      randomRange(0.2, 0.4)
    );
    const trashMat = new THREE.MeshLambertMaterial({ 
      color: randomPick([0x1a1a1a, 0x2a2a2a, 0x333333]) 
    });
    const trash = new THREE.Mesh(trashGeo, trashMat);
    trash.position.set(
      randomRange(-config.width/2 + 0.3, config.width/2 - 0.3),
      0.05,
      randomRange(-config.depth/2 + 0.3, config.depth/2 - 0.3)
    );
    trash.rotation.y = Math.random() * Math.PI;
    group.add(trash);
  }
}

// ========== 具体店铺实现 ==========

/** 鱼丸工场（城寨标志性产业） */
function createFishBallFactory(group: THREE.Group, config: ShopConfig): void {
  const metalMat = getMetalMaterial();
  const concreteMat = createKowloonMaterial('concrete_dirty', 0x666666);
  const woodMat = getWoodMaterial();
  
  // 大锅（多个，生产用）
  for (let i = 0; i < 2; i++) {
    const potGeo = new THREE.CylinderGeometry(0.6, 0.5, 0.4, 12);
    const pot = new THREE.Mesh(potGeo, metalMat);
    pot.position.set(-0.8 + i * 1.6, 0.8, -0.5);
    group.add(pot);
  }
  
  // 炉灶
  const stoveGeo = new THREE.BoxGeometry(2, 0.6, 1);
  const stove = new THREE.Mesh(stoveGeo, concreteMat);
  stove.position.set(0, 0.3, -0.5);
  group.add(stove);
  
  // 工作台（大）
  const tableGeo = new THREE.BoxGeometry(2.5, 0.8, 1.2);
  const table = new THREE.Mesh(tableGeo, woodMat);
  table.position.set(0, 0.4, 1);
  group.add(table);
  
  // 水槽
  const sinkGeo = new THREE.BoxGeometry(1, 0.6, 0.8);
  const sink = new THREE.Mesh(sinkGeo, metalMat);
  sink.position.set(1.5, 0.5, 0);
  group.add(sink);
  
  // 鱼丸盆（多个）
  for (let i = 0; i < 3; i++) {
    const basinGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.2, 8);
    const basin = new THREE.Mesh(basinGeo, metalMat);
    basin.position.set(
      randomRange(-1, 1),
      0.9,
      randomRange(0.5, 1.5)
    );
    group.add(basin);
  }
  
  // 漏勺
  const ladleGeo = new THREE.CylinderGeometry(0.15, 0.1, 0.5, 6);
  const ladle = new THREE.Mesh(ladleGeo, metalMat);
  ladle.position.set(0.5, 1.2, -0.5);
  ladle.rotation.z = 0.3;
  group.add(ladle);
  
  // 塑料桶（装鱼浆）
  for (let i = 0; i < 2; i++) {
    const bucketGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.5, 8);
    const bucketMat = new THREE.MeshLambertMaterial({ color: 0x2244aa });
    const bucket = new THREE.Mesh(bucketGeo, bucketMat);
    bucket.position.set(
      -1.5 + i * 0.8,
      0.25,
      1.5
    );
    group.add(bucket);
  }
  
  // 灯光（暖色，模拟炉火）
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 8);
  light.position.set(0, 2.5, 0);
  group.add(light);
  
  // 炉火光
  const fireLight = new THREE.PointLight(0xff6600, 0.5, 4);
  fireLight.position.set(0, 0.5, -0.5);
  group.add(fireLight);
}

/** 理发店 */
function createBarberShop(group: THREE.Group, config: ShopConfig): void {
  const metalMat = getMetalMaterial();
  const woodMat = getWoodMaterial();
  const mirrorMat = new THREE.MeshBasicMaterial({ 
    color: 0xaaddff, 
    transparent: true, 
    opacity: 0.7 
  });
  
  // 理发椅（2把）
  for (let i = 0; i < 2; i++) {
    const chairGeo = new THREE.BoxGeometry(0.8, 1, 0.8);
    const chair = new THREE.Mesh(chairGeo, metalMat);
    chair.position.set(-0.8 + i * 1.6, 0.5, 0);
    group.add(chair);
    
    // 椅子靠背
    const backGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);
    const back = new THREE.Mesh(backGeo, metalMat);
    back.position.set(-0.8 + i * 1.6, 1, -0.4);
    group.add(back);
  }
  
  // 镜子（2面）
  for (let i = 0; i < 2; i++) {
    const mirrorGeo = new THREE.PlaneGeometry(1.2, 1.8);
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirror.position.set(-0.8 + i * 1.6, 1.5, -1.4);
    group.add(mirror);
  }
  
  // 工具架
  const shelfGeo = new THREE.BoxGeometry(2, 0.1, 0.3);
  const shelf = new THREE.Mesh(shelfGeo, woodMat);
  shelf.position.set(0, 1.2, -1.2);
  group.add(shelf);
  
  // 工具（电推剪、剪刀等）
  for (let i = 0; i < 4; i++) {
    const toolGeo = new THREE.BoxGeometry(0.1, 0.15, 0.05);
    const tool = new THREE.Mesh(toolGeo, metalMat);
    tool.position.set(
      -0.6 + i * 0.4,
      1.3,
      -1.2
    );
    group.add(tool);
  }
  
  // 洗头盆
  const washGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
  const wash = new THREE.Mesh(washGeo, metalMat);
  wash.position.set(0, 0.6, 1.2);
  group.add(wash);
  
  // 热水器
  const heaterGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
  const heater = new THREE.Mesh(heaterGeo, metalMat);
  heater.position.set(0, 1.5, 1.3);
  group.add(heater);
  
  // 旋转灯（理发店标志）
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8);
  const poleMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(0, 2, -1.5);
  group.add(pole);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 牙科诊所（城寨特色：150+家） */
function createDentalClinic(group: THREE.Group, config: ShopConfig): void {
  const metalMat = getMetalMaterial();
  const woodMat = getWoodMaterial();
  
  // 牙科椅
  const chairGeo = new THREE.BoxGeometry(0.8, 0.5, 2);
  const chair = new THREE.Mesh(chairGeo, metalMat);
  chair.position.set(0, 0.4, 0);
  group.add(chair);
  
  // 椅子靠背（可调节）
  const backGeo = new THREE.BoxGeometry(0.8, 0.8, 0.3);
  const back = new THREE.Mesh(backGeo, metalMat);
  back.position.set(0, 0.8, -0.8);
  back.rotation.x = -0.3;
  group.add(back);
  
  // 无影灯
  const lampGeo = new THREE.CylinderGeometry(0.4, 0.6, 0.2, 8);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.set(0, 2.5, 0);
  group.add(lamp);
  
  // 灯臂
  const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 4);
  const arm = new THREE.Mesh(armGeo, metalMat);
  arm.position.set(0, 2, 0);
  arm.rotation.z = 0.5;
  group.add(arm);
  
  // 器械盘
  const trayGeo = new THREE.BoxGeometry(0.8, 0.1, 0.6);
  const tray = new THREE.Mesh(trayGeo, metalMat);
  tray.position.set(0.8, 0.8, 0);
  group.add(tray);
  
  // 器械（探针、镊子等）
  for (let i = 0; i < 5; i++) {
    const toolGeo = new THREE.BoxGeometry(0.02, 0.2, 0.02);
    const tool = new THREE.Mesh(toolGeo, metalMat);
    tool.position.set(
      0.6 + i * 0.1,
      0.9,
      randomRange(-0.2, 0.2)
    );
    tool.rotation.z = randomRange(-0.3, 0.3);
    group.add(tool);
  }
  
  // 药柜
  const cabinetGeo = new THREE.BoxGeometry(1.2, 1.8, 0.4);
  const cabinet = new THREE.Mesh(cabinetGeo, woodMat);
  cabinet.position.set(-1.2, 0.9, -1.2);
  group.add(cabinet);
  
  // 药瓶
  for (let i = 0; i < 6; i++) {
    const bottleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 6);
    const bottleMat = new THREE.MeshLambertMaterial({ 
      color: randomPick([0xffffff, 0xaaaaaa, 0x888888]) 
    });
    const bottle = new THREE.Mesh(bottleGeo, bottleMat);
    bottle.position.set(
      -1.2 + (i % 3) * 0.3,
      0.3 + Math.floor(i / 3) * 0.3,
      -1
    );
    group.add(bottle);
  }
  
  // 招牌（牙科）
  const signGeo = new THREE.BoxGeometry(1.5, 0.3, 0.05);
  const signMat = new THREE.MeshBasicMaterial({ color: 0x4488ff });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 2.8, -1.5);
  group.add(sign);
  
  // 灯光（明亮）
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 8);
  light.position.set(0, 2.8, 0);
  group.add(light);
}

/** 杂货店 */
function createGroceryStore(group: THREE.Group, config: ShopConfig): void {
  const woodMat = getWoodMaterial();
  
  // 货架（3排）
  for (let i = 0; i < 3; i++) {
    const shelfGeo = new THREE.BoxGeometry(0.3, 2, 1.5);
    const shelf = new THREE.Mesh(shelfGeo, woodMat);
    shelf.position.set(-1.5 + i * 1.5, 1, 0);
    group.add(shelf);
    
    // 货架层板
    for (let j = 0; j < 3; j++) {
      const boardGeo = new THREE.BoxGeometry(0.3, 0.05, 1.5);
      const board = new THREE.Mesh(boardGeo, woodMat);
      board.position.set(-1.5 + i * 1.5, 0.5 + j * 0.6, 0);
      group.add(board);
    }
  }
  
  // 商品（小盒子）
  for (let i = 0; i < 12; i++) {
    const itemGeo = new THREE.BoxGeometry(
      randomRange(0.15, 0.25),
      randomRange(0.15, 0.25),
      randomRange(0.15, 0.25)
    );
    const itemMat = new THREE.MeshLambertMaterial({ 
      color: randomPick([0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff]) 
    });
    const item = new THREE.Mesh(itemGeo, itemMat);
    item.position.set(
      -1.5 + (i % 3) * 1.5,
      0.6 + Math.floor(i / 3) * 0.3,
      randomRange(-0.5, 0.5)
    );
    group.add(item);
  }
  
  // 收银台
  const counterGeo = new THREE.BoxGeometry(1.2, 0.8, 0.6);
  const counter = new THREE.Mesh(counterGeo, woodMat);
  counter.position.set(0, 0.4, 1.2);
  group.add(counter);
  
  // 收银机
  const registerGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const registerMat = getMetalMaterial();
  const register = new THREE.Mesh(registerGeo, registerMat);
  register.position.set(0, 1, 1.2);
  group.add(register);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 茶餐厅 */
function createTeaRestaurant(group: THREE.Group, config: ShopConfig): void {
  const woodMat = getWoodMaterial();
  
  // 桌子（4张）
  for (let i = 0; i < 4; i++) {
    const tableGeo = new THREE.BoxGeometry(1, 0.7, 1);
    const table = new THREE.Mesh(tableGeo, woodMat);
    table.position.set(-1.5 + i * 1.5, 0.35, 0);
    group.add(table);
    
    // 椅子（每桌4把）
    for (let j = 0; j < 4; j++) {
      const chairGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
      const chair = new THREE.Mesh(chairGeo, woodMat);
      const angle = (j / 4) * Math.PI * 2;
      chair.position.set(
        -1.5 + i * 1.5 + Math.cos(angle) * 0.6,
        0.25,
        Math.sin(angle) * 0.6
      );
      group.add(chair);
    }
    
    // 餐具
    const plateGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8);
    const plateMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(-1.5 + i * 1.5, 0.72, 0);
    group.add(plate);
  }
  
  // 柜台
  const counterGeo = new THREE.BoxGeometry(3, 1, 0.8);
  const counter = new THREE.Mesh(counterGeo, woodMat);
  counter.position.set(0, 0.5, -1.5);
  group.add(counter);
  
  // 餐牌
  const menuGeo = new THREE.PlaneGeometry(1.5, 1);
  const menuMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const menu = new THREE.Mesh(menuGeo, menuMat);
  menu.position.set(0, 2, -1.5);
  group.add(menu);
  
  // 吊扇
  const fanGeo = new THREE.BoxGeometry(1.5, 0.1, 0.3);
  const fan = new THREE.Mesh(fanGeo, woodMat);
  fan.position.set(0, 2.8, 0);
  group.add(fan);
  
  // 茶壶
  const teapotGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.15, 8);
  const teapotMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const teapot = new THREE.Mesh(teapotGeo, teapotMat);
  teapot.position.set(0.5, 0.75, -1.5);
  group.add(teapot);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 8);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 正骨跌打 */
function createBoneSetter(group: THREE.Group, config: ShopConfig): void {
  const woodMat = getWoodMaterial();
  
  // 按摩床
  const bedGeo = new THREE.BoxGeometry(0.8, 0.5, 2);
  const bed = new THREE.Mesh(bedGeo, woodMat);
  bed.position.set(0, 0.4, 0);
  group.add(bed);
  
  // 药柜（百子柜）
  const cabinetGeo = new THREE.BoxGeometry(1.5, 2, 0.5);
  const cabinet = new THREE.Mesh(cabinetGeo, woodMat);
  cabinet.position.set(-1.2, 1, 0);
  group.add(cabinet);
  
  // 药柜抽屉
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const drawerGeo = new THREE.BoxGeometry(0.2, 0.15, 0.15);
      const drawer = new THREE.Mesh(drawerGeo, woodMat);
      drawer.position.set(
        -1.8 + col * 0.2,
        0.3 + row * 0.4,
        0.2
      );
      group.add(drawer);
    }
  }
  
  // 人体模型（穴位图）
  const dummyGeo = new THREE.CylinderGeometry(0.2, 0.15, 1.5, 8);
  const dummyMat = new THREE.MeshLambertMaterial({ color: 0xcc9966 });
  const dummy = new THREE.Mesh(dummyGeo, dummyMat);
  dummy.position.set(1, 1, 0);
  group.add(dummy);
  
  // 药酒瓶
  for (let i = 0; i < 5; i++) {
    const bottleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6);
    const bottleMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const bottle = new THREE.Mesh(bottleGeo, bottleMat);
    bottle.position.set(
      1.2,
      0.3 + i * 0.25,
      randomRange(-0.3, 0.3)
    );
    group.add(bottle);
  }
  
  // 火罐
  for (let i = 0; i < 4; i++) {
    const cupGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.1, 8);
    const cupMat = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(
      randomRange(-0.5, 0.5),
      0.6,
      randomRange(-0.8, 0.8)
    );
    group.add(cup);
  }
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 裁缝店 */
function createTailorShop(group: THREE.Group, config: ShopConfig): void {
  const metalMat = getMetalMaterial();
  const woodMat = getWoodMaterial();
  
  // 缝纫机（2台）
  for (let i = 0; i < 2; i++) {
    const machineGeo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
    const machine = new THREE.Mesh(machineGeo, metalMat);
    machine.position.set(-0.8 + i * 1.6, 0.4, 0);
    group.add(machine);
    
    // 缝纫机头
    const headGeo = new THREE.BoxGeometry(0.4, 0.3, 0.4);
    const head = new THREE.Mesh(headGeo, metalMat);
    head.position.set(-0.8 + i * 1.6, 1, 0);
    group.add(head);
  }
  
  // 布料架
  const rackGeo = new THREE.BoxGeometry(0.1, 2, 1.5);
  const rack = new THREE.Mesh(rackGeo, woodMat);
  rack.position.set(-1.5, 1, 0);
  group.add(rack);
  
  // 布料卷
  for (let i = 0; i < 4; i++) {
    const rollGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
    const rollMat = new THREE.MeshLambertMaterial({ 
      color: randomPick([0xff4444, 0x4444ff, 0x44ff44, 0xffff44]) 
    });
    const roll = new THREE.Mesh(rollGeo, rollMat);
    roll.position.set(
      -1.5,
      0.5 + i * 0.3,
      randomRange(-0.5, 0.5)
    );
    roll.rotation.x = Math.PI / 2;
    group.add(roll);
  }
  
  // 人台（模特）
  for (let i = 0; i < 2; i++) {
    const mannequinGeo = new THREE.CylinderGeometry(0.2, 0.15, 1.5, 8);
    const mannequinMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    const mannequin = new THREE.Mesh(mannequinGeo, mannequinMat);
    mannequin.position.set(1, 1, -0.5 + i * 1);
    group.add(mannequin);
    
    // 衣服
    const clothesGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
    const clothesMat = new THREE.MeshLambertMaterial({ 
      color: randomPick([0x333333, 0x444444, 0x555555]) 
    });
    const clothes = new THREE.Mesh(clothesGeo, clothesMat);
    clothes.position.set(1, 1.2, -0.5 + i * 1);
    group.add(clothes);
  }
  
  // 剪刀和工具
  for (let i = 0; i < 3; i++) {
    const toolGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
    const tool = new THREE.Mesh(toolGeo, metalMat);
    tool.position.set(
      randomRange(-0.5, 0.5),
      0.85,
      randomRange(-0.3, 0.3)
    );
    group.add(tool);
  }
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 麻将馆 */
function createMahjongParlor(group: THREE.Group, config: ShopConfig): void {
  const woodMat = getWoodMaterial();
  
  // 麻将桌（2桌）
  for (let i = 0; i < 2; i++) {
    const tableGeo = new THREE.BoxGeometry(1.2, 0.7, 1.2);
    const table = new THREE.Mesh(tableGeo, woodMat);
    table.position.set(-1 + i * 2, 0.35, 0);
    group.add(table);
    
    // 椅子（每桌4把）
    for (let j = 0; j < 4; j++) {
      const chairGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
      const chair = new THREE.Mesh(chairGeo, woodMat);
      const angle = (j / 4) * Math.PI * 2;
      chair.position.set(
        -1 + i * 2 + Math.cos(angle) * 0.8,
        0.25,
        Math.sin(angle) * 0.8
      );
      group.add(chair);
    }
    
    // 麻将牌（简化）
    for (let j = 0; j < 16; j++) {
      const tileGeo = new THREE.BoxGeometry(0.08, 0.12, 0.06);
      const tileMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.set(
        -1 + i * 2 + randomRange(-0.4, 0.4),
        0.75,
        randomRange(-0.4, 0.4)
      );
      tile.rotation.y = Math.random() * Math.PI;
      group.add(tile);
    }
  }
  
  // 香炉
  const incenseGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
  const incenseMat = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
  const incense = new THREE.Mesh(incenseGeo, incenseMat);
  incense.position.set(0, 1.5, -1.5);
  group.add(incense);
  
  // 香烟盒
  const cigGeo = new THREE.BoxGeometry(0.15, 0.08, 0.05);
  const cigMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const cig = new THREE.Mesh(cigGeo, cigMat);
  cig.position.set(0.5, 0.75, 0.5);
  group.add(cig);
  
  // 烟灰缸
  const ashGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.05, 8);
  const ashMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const ash = new THREE.Mesh(ashGeo, ashMat);
  ash.position.set(0.5, 0.73, 0.6);
  group.add(ash);
  
  // 灯光（昏暗）
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 面条作坊 */
function createNoodleShop(group: THREE.Group, config: ShopConfig): void {
  const woodMat = getWoodMaterial();
  const metalMat = getMetalMaterial();
  
  // 工作台（大）
  const tableGeo = new THREE.BoxGeometry(2.5, 0.8, 1.2);
  const table = new THREE.Mesh(tableGeo, woodMat);
  table.position.set(0, 0.4, 0);
  group.add(table);
  
  // 大锅（煮面用）
  for (let i = 0; i < 2; i++) {
    const potGeo = new THREE.CylinderGeometry(0.5, 0.4, 0.4, 12);
    const pot = new THREE.Mesh(potGeo, metalMat);
    pot.position.set(-0.8 + i * 1.6, 0.9, -0.5);
    group.add(pot);
  }
  
  // 炉灶
  const stoveGeo = new THREE.BoxGeometry(2, 0.6, 1);
  const stove = new THREE.Mesh(stoveGeo, createKowloonMaterial('concrete_dirty', 0x555555));
  stove.position.set(0, 0.3, -0.5);
  group.add(stove);
  
  // 面粉袋（多个）
  for (let i = 0; i < 4; i++) {
    const bagGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
    const bagMat = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
    const bag = new THREE.Mesh(bagGeo, bagMat);
    bag.position.set(
      1.5,
      0.4,
      -0.8 + i * 0.5
    );
    group.add(bag);
  }
  
  // 擀面杖
  for (let i = 0; i < 3; i++) {
    const rollerGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
    const roller = new THREE.Mesh(rollerGeo, woodMat);
    roller.position.set(
      randomRange(-1, 1),
      0.9,
      randomRange(0.3, 0.8)
    );
    roller.rotation.z = Math.PI / 2;
    group.add(roller);
  }
  
  // 竹筛
  const sieveGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12);
  const sieve = new THREE.Mesh(sieveGeo, woodMat);
  sieve.position.set(-1.2, 0.9, 0.5);
  group.add(sieve);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 7);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 烧腊工场 */
function createBBQShop(group: THREE.Group, config: ShopConfig): void {
  const metalMat = getMetalMaterial();
  const woodMat = getWoodMaterial();
  
  // 烤炉（大）
  const ovenGeo = new THREE.BoxGeometry(2.5, 1.5, 1.2);
  const oven = new THREE.Mesh(ovenGeo, metalMat);
  oven.position.set(0, 0.75, 0);
  group.add(oven);
  
  // 炉门
  const doorGeo = new THREE.BoxGeometry(1, 1, 0.1);
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.75, 0.6);
  group.add(door);
  
  // 挂钩（挂烧腊）
  for (let i = 0; i < 6; i++) {
    const hookGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 4);
    const hook = new THREE.Mesh(hookGeo, metalMat);
    hook.position.set(-1 + i * 0.4, 2, 0);
    group.add(hook);
    
    // 烧腊（简化）
    const meatGeo = new THREE.BoxGeometry(0.15, 0.4, 0.1);
    const meatMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const meat = new THREE.Mesh(meatGeo, meatMat);
    meat.position.set(-1 + i * 0.4, 1.5, 0);
    group.add(meat);
  }
  
  // 砧板
  const boardGeo = new THREE.BoxGeometry(0.8, 0.1, 0.6);
  const board = new THREE.Mesh(boardGeo, woodMat);
  board.position.set(1.5, 0.8, 0);
  group.add(board);
  
  // 刀具
  for (let i = 0; i < 3; i++) {
    const knifeGeo = new THREE.BoxGeometry(0.05, 0.3, 0.02);
    const knife = new THREE.Mesh(knifeGeo, metalMat);
    knife.position.set(
      1.5,
      1,
      -0.3 + i * 0.3
    );
    knife.rotation.z = 0.2;
    group.add(knife);
  }
  
  // 灯光（暖色，模拟炉火）
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 8);
  light.position.set(0, 2.5, 0);
  group.add(light);
  
  // 炉火光
  const fireLight = new THREE.PointLight(0xff4400, 0.8, 5);
  fireLight.position.set(0, 0.5, 0);
  group.add(fireLight);
}

/** 中药房 */
function createHerbalistShop(group: THREE.Group, config: ShopConfig): void {
  const woodMat = getWoodMaterial();
  
  // 药柜（百子柜）- 大型
  const cabinetGeo = new THREE.BoxGeometry(2.5, 2.5, 0.6);
  const cabinet = new THREE.Mesh(cabinetGeo, woodMat);
  cabinet.position.set(0, 1.25, -1.2);
  group.add(cabinet);
  
  // 药柜抽屉（密集）
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      const drawerGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const drawer = new THREE.Mesh(drawerGeo, woodMat);
      drawer.position.set(
        -0.85 + col * 0.15,
        0.2 + row * 0.28,
        -0.95
      );
      group.add(drawer);
    }
  }
  
  // 药材罐
  for (let i = 0; i < 8; i++) {
    const jarGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8);
    const jarMat = new THREE.MeshLambertMaterial({ 
      color: randomPick([0x8B4513, 0x654321, 0x704214]) 
    });
    const jar = new THREE.Mesh(jarGeo, jarMat);
    jar.position.set(
      -1 + i * 0.3,
      2.8,
      -1
    );
    group.add(jar);
  }
  
  // 研钵
  const mortarGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.2, 8);
  const mortar = new THREE.Mesh(mortarGeo, woodMat);
  mortar.position.set(1.2, 0.8, 0);
  group.add(mortar);
  
  // 算盘
  const abacusGeo = new THREE.BoxGeometry(0.4, 0.3, 0.05);
  const abacus = new THREE.Mesh(abacusGeo, woodMat);
  abacus.position.set(0.8, 0.85, 0.8);
  group.add(abacus);
  
  // 药方纸
  const paperGeo = new THREE.PlaneGeometry(0.3, 0.4);
  const paperMat = new THREE.MeshBasicMaterial({ color: 0xf5f5dc });
  const paper = new THREE.Mesh(paperGeo, paperMat);
  paper.position.set(0.5, 0.82, 0.5);
  paper.rotation.x = -Math.PI / 2;
  group.add(paper);
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 电器维修 */
function createElectronicsRepair(group: THREE.Group, config: ShopConfig): void {
  const metalMat = getMetalMaterial();
  const woodMat = getWoodMaterial();
  
  // 工作台
  const tableGeo = new THREE.BoxGeometry(2, 0.8, 1);
  const table = new THREE.Mesh(tableGeo, woodMat);
  table.position.set(0, 0.4, 0);
  group.add(table);
  
  // 电视机（待修）
  for (let i = 0; i < 2; i++) {
    const tvGeo = new THREE.BoxGeometry(0.8, 0.6, 0.5);
    const tv = new THREE.Mesh(tvGeo, metalMat);
    tv.position.set(-0.5 + i * 1, 1.1, 0);
    group.add(tv);
    
    // 屏幕
    const screenGeo = new THREE.PlaneGeometry(0.6, 0.4);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(-0.5 + i * 1, 1.1, 0.26);
    group.add(screen);
  }
  
  // 收音机
  const radioGeo = new THREE.BoxGeometry(0.4, 0.3, 0.2);
  const radio = new THREE.Mesh(radioGeo, woodMat);
  radio.position.set(0.8, 1.1, 0.3);
  group.add(radio);
  
  // 工具架
  const shelfGeo = new THREE.BoxGeometry(2, 0.1, 0.3);
  const shelf = new THREE.Mesh(shelfGeo, woodMat);
  shelf.position.set(0, 1.8, -0.8);
  group.add(shelf);
  
  // 工具（螺丝刀、钳子等）
  for (let i = 0; i < 6; i++) {
    const toolGeo = new THREE.BoxGeometry(0.03, 0.2, 0.03);
    const tool = new THREE.Mesh(toolGeo, metalMat);
    tool.position.set(
      -0.6 + i * 0.2,
      1.9,
      -0.8
    );
    tool.rotation.z = randomRange(-0.3, 0.3);
    group.add(tool);
  }
  
  // 电烙铁
  const ironGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
  const iron = new THREE.Mesh(ironGeo, metalMat);
  iron.position.set(-0.8, 0.9, 0.5);
  iron.rotation.z = Math.PI / 2;
  group.add(iron);
  
  // 电线卷
  for (let i = 0; i < 3; i++) {
    const wireGeo = new THREE.TorusGeometry(0.15, 0.02, 8, 16);
    const wireMat = new THREE.MeshLambertMaterial({ 
      color: randomPick([0xff0000, 0x0000ff, 0x00ff00]) 
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(
      1.2,
      0.5 + i * 0.2,
      randomRange(-0.3, 0.3)
    );
    group.add(wire);
  }
  
  // 灯光
  const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 6);
  light.position.set(0, 2.5, 0);
  group.add(light);
}

/** 修鞋档/皮匠 */
function createShoeRepair(group: THREE.Group, config: ShopConfig): void {
  const woodMat = getWoodMaterial();
  const metalMat = getMetalMaterial();
  
  // 小凳子
  const stoolGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
  const stool = new THREE.Mesh(stoolGeo, woodMat);
  stool.position.set(0, 0.2, 0);
  group.add(stool);
  
  // 工具箱
  const toolboxGeo = new THREE.BoxGeometry(0.8, 0.5, 0.5);
  const toolbox = new THREE.Mesh(toolboxGeo, woodMat);
  toolbox.position.set(0.6, 0.25, 0);
  group.add(toolbox);
  
  // 鞋子（待修）
  for (let i = 0; i < 4; i++) {
    const shoeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.25);
    const shoeMat = new THREE.MeshLambertMaterial({ 
      color: randomPick([0x333333, 0x444444, 0x555555]) 
    });
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(
      randomRange(-0.5, 0.5),
      0.05,
      randomRange(-0.5, 0.5)
    );
    shoe.rotation.y = Math.random() * Math.PI;
    group.add(shoe);
  }
  
  // 鞋楦
  for (let i = 0; i < 3; i++) {
    const lastGeo = new THREE.BoxGeometry(0.1, 0.15, 0.3);
    const last = new THREE.Mesh(lastGeo, woodMat);
    last.position.set(
      -0.5,
      0.1 + i * 0.15,
      0.3
    );
    group.add(last);
  }
  
  // 皮革卷
  for (let i = 0; i < 2; i++) {
    const leatherGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
    const leatherMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const leather = new THREE.Mesh(leatherGeo, leatherMat);
    leather.position.set(
      -0.3,
      0.3 + i * 0.2,
      -0.3
    );
    leather.rotation.z = Math.PI / 2;
    group.add(leather);
  }
  
  // 锥子、锤子等工具
  for (let i = 0; i < 4; i++) {
    const toolGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
    const tool = new THREE.Mesh(toolGeo, metalMat);
    tool.position.set(
      0.6,
      0.55,
      -0.2 + i * 0.15
    );
    tool.rotation.z = randomRange(-0.3, 0.3);
    group.add(tool);
  }
  
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
