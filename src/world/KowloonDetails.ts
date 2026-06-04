/**
 * 九龙城寨细节生成器
 * 
 * 生成杂乱的电线、垃圾袋、霓虹灯、荧光灯、老鼠等细节元素，
 * 还原城寨"脏乱差"的真实氛围。
 */
import * as THREE from 'three';
import { randomRange, randomInt, randomPick } from '@utils/math';
import type { BuildingData } from '@game/index';
import { KOWLOON_CENTRE_X, KOWLOON_CENTRE_Z, KOWLOON_RADIUS } from './StoryLocations';
import { KowloonOptimizer } from './KowloonOptimizer';

// ========== 细节常量 ==========

/** 电线颜色（老旧、肮脏） */
const WIRE_COLORS = [0x222222, 0x333333, 0x1a1a1a, 0x2a2a2a, 0x444444, 0x111111];

/** 垃圾袋颜色（深色、肮脏） */
const GARBAGE_COLORS = [0x1a1a1a, 0x2a2a2a, 0x333333, 0x0f0f0f, 0x252525, 0x1f1f1f];

/** 杂物颜色 */
const DEBRIS_COLORS = [0x3a3a3a, 0x4a4a4a, 0x2a2a2a, 0x555555, 0x333333];

/** 霓虹灯颜色 */
const NEON_COLORS = [0xff0066, 0x00ff66, 0x6600ff, 0xff6600, 0x0066ff, 0xff3399, 0xff0000, 0x00ff00, 0x0066ff];

/** 荧光灯颜色 */
const FLUORESCENT_COLOR = 0xccddff;

/**
 * 九龙城寨细节生成器
 */
export class KowloonDetails {
  private meshes: THREE.Mesh[] = [];
  private lines: THREE.Line[] = [];
  private lights: THREE.Light[] = [];
  private rats: THREE.Mesh[] = [];
  private ratVelocities: Array<{ vx: number; vz: number; timer: number }> = [];
  private flickeringLights: Array<{ light: THREE.PointLight; baseIntensity: number; flickerTimer: number }> = [];
  private optimizer: KowloonOptimizer = new KowloonOptimizer();

  /**
   * 生成所有细节元素
   * 使用 InstancedMesh 优化垃圾、杂物、塑料桶、霓虹灯、荧光灯
   */
  generate(group: THREE.Group, buildings: BuildingData[]): void {
    this.generateWires(group, buildings);
    // 使用 InstancedMesh 优化这些：
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;
    this.optimizer.addGarbageInstances(group, buildings, cx, cz, r);
    this.optimizer.addDebrisInstances(group, buildings, cx, cz, r);
    this.optimizer.addBucketInstances(group, buildings, cx, cz, r);
    this.optimizer.addNeonSignInstances(group, buildings, cx, cz, r);
    this.optimizer.addFluorescentLightInstances(group, buildings, cx, cz, r);
    this.optimizer.addToScene(group);
    // 以下仍使用独立 mesh：
    this.generateRats(group, buildings);
    this.generatePipes(group, buildings);
    this.generateLaundry(group, buildings);
  }

  /**
   * 生成杂乱电线（私拉乱接）
   * 九龙城寨的电线如同蜘蛛网，混乱但有规律
   */
  private generateWires(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    // 在建筑之间拉更多电线（80% 概率，更远的距离）
    for (let i = 0; i < buildings.length; i++) {
      const b1 = buildings[i];
      const dx1 = b1.x - cx;
      const dz1 = b1.z - cz;
      if (Math.sqrt(dx1 * dx1 + dz1 * dz1) > r) continue;

      // 找附近的建筑连接电线（更多连接）
      for (let j = i + 1; j < buildings.length; j++) {
        const b2 = buildings[j];
        const dx = b2.x - b1.x;
        const dz = b2.z - b1.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // 扩大连接范围
        if (dist > 20 || dist < 2) continue;

        // 80% 概率拉电线（更多电线）
        if (Math.random() > 0.8) continue;

        // 电线数量（2-4 根，更多更乱）
        const wireCount = randomInt(2, 4);
        for (let w = 0; w < wireCount; w++) {
          this.createWire(group, b1, b2, dist);
        }
      }
    }

    // 添加更多垂直方向的电线（从建筑顶部拉出）
    for (const b of buildings) {
      if (Math.random() > 0.4) continue; // 40% 的建筑有垂直方向的乱线
      const h = b.h;
      const wireCount = randomInt(1, 3);
      for (let w = 0; w < wireCount; w++) {
        this.createVerticalWire(group, b, h);
      }
    }
  }

  /**
   * 创建一根电线（带下垂效果）
   */
  private createWire(group: THREE.Group, b1: BuildingData, b2: BuildingData, dist: number): void {
    // 电线高度（在建筑中间偏下，更多变化）
    const h1 = randomRange(4, b1.h * 0.7);
    const h2 = randomRange(4, b2.h * 0.7);

    // 电线颜色
    const color = randomPick(WIRE_COLORS);
    const material = new THREE.LineBasicMaterial({ color });

    // 创建曲线点（电线会下垂，更大的下垂量）
    const points: THREE.Vector3[] = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = b1.x + (b2.x - b1.x) * t;
      const z = b1.z + (b2.z - b1.z) * t;
      // 下垂效果（更大，更随机）
      const sag = Math.sin(t * Math.PI) * randomRange(1.0, 3.0);
      const y = h1 + (h2 - h1) * t - sag;
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    group.add(line);
    this.lines.push(line);
  }

  /**
   * 创建垂直方向的乱拉电线
   */
  private createVerticalWire(group: THREE.Group, b: BuildingData, h: number): void {
    const color = randomPick(WIRE_COLORS);
    const material = new THREE.LineBasicMaterial({ color });

    // 从建筑顶部往下拉的电线
    const topY = h;
    const bottomY = randomRange(1, 3);
    const x = b.x + randomRange(-b.hw * 0.5, b.hw * 0.5);
    const z = b.z + randomRange(-b.hd * 0.5, b.hd * 0.5);

    // 创建弯曲的垂直电线
    const points: THREE.Vector3[] = [];
    const segments = 6;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = topY + (bottomY - topY) * t;
      // 添加一些横向偏移模拟乱拉
      const offsetX = Math.sin(t * Math.PI * 2) * randomRange(0.3, 1.0);
      const offsetZ = Math.cos(t * Math.PI * 2) * randomRange(0.3, 1.0);
      points.push(new THREE.Vector3(x + offsetX, y, z + offsetZ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    group.add(line);
    this.lines.push(line);
  }

  /**
   * 生成霓虹灯招牌（已移至 KowloonOptimizer）
   */
  private generateNeonSigns(_group: THREE.Group, _buildings: BuildingData[]): void {
    // 已移至 KowloonOptimizer.addNeonSignInstances()
  }

  /**
   * 生成荧光灯（已移至 KowloonOptimizer）
   */
  private generateFluorescentLights(_group: THREE.Group, _buildings: BuildingData[]): void {
    // 已移至 KowloonOptimizer.addFluorescentLightInstances()
  }

  /**
   * 生成老鼠（可动画的四处乱窜）
   */
  private generateRats(group: THREE.Group, buildings: BuildingData[]): void {
    const cx = KOWLOON_CENTRE_X;
    const cz = KOWLOON_CENTRE_Z;
    const r = KOWLOON_RADIUS;

    const ratGeo = new THREE.BoxGeometry(1, 1, 1);
    const ratMat = new THREE.MeshLambertMaterial({ color: 0x444433 });

    // 生成 20-30 只老鼠（更多）
    const ratCount = randomInt(20, 30);
    for (let i = 0; i < ratCount; i++) {
      const b = randomPick(buildings);
      const dx = b.x - cx;
      const dz = b.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) > r) continue;

      const mesh = new THREE.Mesh(ratGeo, ratMat);
      const x = b.x + randomRange(-b.hw, b.hw);
      const z = b.z + randomRange(-b.hd, b.hd);
      const y = 0.12;

      mesh.position.set(x, y, z);
      mesh.scale.set(0.25, 0.12, 0.4);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.castShadow = false;

      group.add(mesh);
      this.rats.push(mesh);
      this.meshes.push(mesh);

      // 初始化速度
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(0.02, 0.06);
      this.ratVelocities.push({
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        timer: randomInt(30, 120) // 多久换方向
      });
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
   * 更新老鼠动画和闪烁灯光
   */
  update(): void {
    // 更新老鼠
    for (let i = 0; i < this.rats.length; i++) {
      const rat = this.rats[i];
      const vel = this.ratVelocities[i];

      // 更新位置
      rat.position.x += vel.vx;
      rat.position.z += vel.vz;

      // 朝移动方向旋转
      rat.rotation.y = Math.atan2(vel.vx, vel.vz);

      // 计时器
      vel.timer--;
      if (vel.timer <= 0) {
        // 随机改变方向
        const angle = Math.random() * Math.PI * 2;
        const speed = randomRange(0.02, 0.06);
        vel.vx = Math.cos(angle) * speed;
        vel.vz = Math.sin(angle) * speed;
        vel.timer = randomInt(30, 120);
      }

      // 边界检测，防止跑太远
      if (Math.abs(rat.position.x) > 50 || Math.abs(rat.position.z) > 50) {
        // 回到中心附近
        rat.position.x = randomRange(-20, 20);
        rat.position.z = randomRange(-20, 20);
      }
    }

    // 更新闪烁灯光
    for (const fl of this.flickeringLights) {
      fl.flickerTimer--;
      if (fl.flickerTimer <= 0) {
        // 闪烁效果
        const flicker = Math.random() < 0.3 ? 0.1 : fl.baseIntensity;
        fl.light.intensity = flicker;
        fl.flickerTimer = randomInt(5, 15);
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
    this.rats = [];
    this.ratVelocities = [];
    this.optimizer.dispose();
  }
}
