# AGENTS.md — 项目交接文档

> 本文档面向后续接手此项目的 AI 助手或人类开发者，帮助快速理解项目全貌并继续迭代。

## 一、项目定位

**Pixel City Crime 3D** 是一个完全在浏览器中运行的第一人称开放世界犯罪游戏。技术路线是 Three.js + Cannon-es + TypeScript + Vite，不依赖任何游戏引擎，不加载任何外部资源文件（模型、贴图、音频），所有内容在运行时程序化生成。

核心体验参考：GTA 系列的自由探索 + 射击 + 驾驶，但以低多边形风格呈现。

## 二、迭代历程

项目从一个 2D GTA 游戏起步，经历了以下关键迭代阶段：

### 阶段 1：2D → 3D 转换
- 将 2D 俯视视角改为 Three.js 3D 第一人称
- 引入 Cannon-es 物理引擎（重力和地面碰撞）
- 重构为 TypeScript + Vite + 模块化架构

### 阶段 2：性能优化（用户反馈：帧率低，无法保持 60fps）
- **问题**：树木 400 棵各一个 Mesh = 400 draw call，车辆 40 辆各多个 Mesh = 320 draw call
- **解决**：
  - 树木改为 InstancedMesh（400 → 2 draw call）
  - 减少实体数量（MAP_BLOCKS 40→20, VEHICLE 40→15, TREE 200→80, ENEMY 30→20）
  - 移除 logarithmicDepthBuffer（GPU 开销大）
  - 阴影贴图 1024→512
  - 共享几何体/材质（所有敌人共用 torso/head/arm/leg geometry）
  - 预分配 Vector3 对象避免 GC 压力

### 阶段 3：视锥体裁剪（用户反馈：应该只渲染视距内的东西）
- **问题**：BuildingSystem 整个地图一个 InstancedMesh，bounding sphere 覆盖全世界，永远不被裁剪
- **解决**：
  - 建筑拆为 4×4 空间分块，每块独立 InstancedMesh + computeBoundingSphere()
  - 道路拆为 2×2 分块，mergeGeometries 后每块独立 bounding sphere

### 阶段 4：雾效（用户反馈：加雾遮挡远处加载）
- FogExp2 密度 0.006→0.014，200m 外 94%+ 被雾遮挡
- 相机远裁面 300→250

### 阶段 5：战斗信息（用户反馈：死得不明不白）
- 创建 CombatLog 组件（右下角事件流）
- 显示伤害来源、击杀、拾取、方向性威胁扫描
- 修改所有系统接入 CombatLog

### 阶段 6：警察行为修复（用户反馈：警察一上来就打我）
- 警察仅在 wanted > 0 时敌对
- 从初始自由模式生成列表中移除警察
- WaveManager 已正确处理基于通缉等级的警察生成

### 阶段 7：经济系统 + 武器商店 + 车内视角
- 金钱系统：杀敌获得金钱（不同敌人不同奖励）
- 武器商店（B 键打开）：购买武器，显示 DMG/AUTO/MAG 属性
- 武器所有权追踪：boolean[] 控制射击/切换
- 车内第一人称：仪表盘、方向盘（TorusGeometry）、A 柱、后视镜
- 鼠标在车内有限范围 look around

### 阶段 8：光标修复（用户反馈：光标不跟手）
- InputManager 完全重写：使用 movementX/Y（原生 MouseEvent 属性）
- 移除 clientX 差值回退方案
- CSS body.playing class 管理 cursor:none

### 阶段 9：敌人视线检测（用户反馈：看不到敌人就被打死）
- **问题**：敌人 canSee 只是距离检测，能穿墙攻击
- **解决**：
  - PhysicsManager 新增 hasLineOfSight() 方法（空间哈希网格采样）
  - EnemyAI 改为 dist < sight && hasLOS
  - 添加 lastKnownX/Z + alertTimer：敌人丢失视线后追到最后已知位置
  - 降低视野范围（Gang 40→25, Police 50→30）
  - 降低伤害值（Gang 12→7, Police 18→10, Heavy 25→15）

### 阶段 10：敌人精度（用户反馈：敌人太准了）
- 给每种敌人加 accuracy 属性（Gang 0.4, Police 0.55, Heavy 0.45）
- 命中率随距离衰减：hitChance = accuracy × (1 - dist/sight × 0.5)
- 射偏时在玩家脚边溅起尘土 + 战斗日志提示

### 阶段 11：敌人武器模型 + 弹道（用户反馈：敌人手上没武器，也没有弹道）
- 敌人手持武器模型：手枪/冲锋枪/火箭筒（根据 weapon id 生成）
- 可见弹道轨迹：从敌人枪口到玩家方向的圆柱体，80ms 淡出
- 命中/射偏弹道终点不同

### 阶段 12：代码质量
- 全项目注释补全（types/index.ts 字段级 JSDoc、AudioManager 音效设计注释、EnemyAI mesh 索引映射等）
- 创建 .gitignore，清理空目录
- 初始化 git 仓库并推送到 GitHub
- 完善 README.md 和 GitHub 仓库描述

## 三、架构决策记录

### 为什么不用 ECS？
项目规模不大（20 个敌人、15 辆车），完整的 ECS 框架（如 bitECS、ECSY）引入复杂度高于收益。当前采用简单的"系统类 + 共享状态"模式，Game.ts 作为编排器手动调用各系统 update。

### 为什么 Cannon-es 只用了一个 Sphere + Plane？
建筑的碰撞检测通过自建的空间哈希网格（PhysicsManager.spatialGrid）完成，比 Cannon-es 的刚体碰撞快得多。Cannon-es 目前只负责重力、跳跃和地面检测。未来如果要加车辆物理或布娃娃，才需要更多 Cannon 刚体。

### 为什么 StateManager 用 getMutableState() 而不是不可变更新？
游戏循环每帧调用所有系统，如果每个系统都用不可变更新会产生大量 GC 压力。getMutableState() 返回直接引用，性能优先。需要响应式更新的地方用 subscribe() 事件。

### 为什么音频是程序化合成的？
零外部依赖，不需要加载任何音频文件。所有音效用 Web Audio API 的 OscillatorNode 和 AudioBuffer 实时合成。详见 AudioManager.ts 中的设计注释。

### 为什么敌人动画用 children 索引？
行走动画通过 `mesh.children[4]`（左腿）和 `mesh.children[5]`（右腿）的 rotation.x 实现。这是脆弱代码——如果 createMesh 中子节点的添加顺序改变，动画就会失效。已在注释中标注了索引映射，但长期应改为命名查找。

## 四、已知问题与待改进项

### 高优先级（影响游戏体验）

1. **Game.ts 是上帝类（440+ 行）**
   - 承担系统初始化、游戏循环、威胁扫描、状态切换、暂停/恢复
   - 建议拆分：GameLoop.ts（循环）、GameFlowController.ts（状态切换）

2. **系统间耦合过深**
   - EnemyAI 构造函数 8 个参数，VehicleSystem 9 个
   - 建议引入 EventBus 或 ServiceLocator 解耦

3. **EnemyAI 同时管渲染和逻辑**
   - createMesh、createEnemyWeapon 应该在 EnemyRenderer.ts
   - EnemyAI 只管状态机和行为

4. **没有存档系统**
   - StateManager.serialize() 已预留但没实现
   - 需要 localStorage 或 IndexedDB 持久化

5. **车辆物理太简单**
   - 当前是简化的速度/转向模型，没有真实的轮胎摩擦、悬挂
   - 没有碰撞检测（车辆可以穿过彼此）

### 中优先级（功能缺失）

6. **没有音效音量控制 / 静音选项**
7. **没有小地图缩放**
8. **没有敌人死亡动画**（直接倒地然后淡出）
9. **没有武器切换动画**
10. **建筑内部不可进入**（全是实心方块）
11. **NPC 平民行为太简单**（只会跑，没有日常行为）
12. **没有任务系统**
13. **没有 minimap 上的任务标记 / 商店标记**

### 低优先级（代码质量）

14. **没有任何测试**（连单元测试都没有）
15. **没有 ESLint / Prettier**
16. **walking animation 的 children 索引硬编码**（应改为命名引用）
17. **VehicleSystem 中 `e.type === 'civilian'` 用了字符串字面量**（应该用枚举 EnemyTypeName.Civilian）
18. ** ShootingSystem.spawnExplosion 的硬编码参数**（120 伤害、8 半径应该可配置）

## 五、快速上手指南

### 给新的 AI 助手

1. 先读 `README.md` 了解项目概况
2. 读 `src/types/index.ts` 了解所有数据类型（每个字段都有 JSDoc）
3. 读 `src/Game.ts` 了解系统编排和主循环
4. 读 `src/config/constants.ts` 了解世界参数
5. 用 `npx tsc --noEmit` 做类型检查
6. 用 `npx vite` 启动开发服务器（端口 8765）

### 关键文件速查

| 想了解... | 读这个文件 |
|-----------|-----------|
| 世界怎么生成的 | `src/world/WorldGenerator.ts` → BuildingSystem → RoadSystem |
| 敌人 AI 怎么工作 | `src/systems/EnemyAI.ts`（注意文件头的 mesh 索引说明）|
| 碰撞怎么检测 | `src/core/PhysicsManager.ts`（空间哈希 + LOS）|
| 玩家怎么移动 | `src/systems/PlayerController.ts` |
| 武器怎么射击 | `src/systems/ShootingSystem.ts` |
| 车辆怎么驾驶 | `src/systems/VehicleSystem.ts` |
| UI 怎么更新 | `src/ui/HUDController.ts` + `src/ui/CombatLog.ts` |
| 声音怎么合成 | `src/core/AudioManager.ts`（每个音效有设计注释）|
| 波次怎么管理 | `src/systems/WaveManager.ts`（有公式说明）|
| 所有配置在哪 | `src/config/` 下 4 个文件 |

### 开发注意事项

- **修改 mesh 子节点顺序时**：必须同步更新 EnemyAI 中 walking animation 的 children 索引，以及 EnemyEntity 类型注释中的顺序表
- **添加新武器时**：需要同时更新 `weapons.ts`（属性）、`WEAPON_PRICES`（价格）、`ShootingSystem.updateWeaponModel()`（视图模型）、HUD 武器槽位
- **添加新敌人类型时**：需要更新 `enemies.ts`（属性 + SCORE + MONEY）、`EnemyAI.createEnemyWeapon()`（如果有武器）、CombatLog 的 ENEMY_NAMES、types 的 EnemyTypeName 枚举
- **性能敏感**：游戏循环中不要创建新对象，用预分配的 Vector3（参考 PlayerController 的 `_forward`、`_right`、`_up` 模式）
- **路径别名**：`@config/*` → `src/config/*`，`@core/*` → `src/core/*`，以此类推（tsconfig.json 和 vite.config.ts 要保持同步）

## 六、数值平衡参考

```
地图大小：20 blocks × (24 block + 8 road) = 640 units
建筑高度：8–40m
玩家速度：walk 6 m/s, sprint 11 m/s
跳跃速度：10 m/s, 重力 25 m/s²

敌人精度：Gang 40%, Police 55%, Heavy 45%
敌人视野：Gang 25, Police 30, Heavy 22, Civilian 20

武器伤害范围：Pistol 18 → Sniper 90 → RPG 120
射速范围：Sniper 1.2s → SMG 0.07s → Flamer 0.04s

Combo 上限：10x 倍数
掉落率：30%
波间休息：5 秒
波次敌人数：3 + wave × 2
通缉衰减：每 15 秒 -1 星
```

## 七、技术债清单

- [ ] `buildFromBuildingGrid()` 注释说 "skip individual building bodies" — 如果未来需要 Cannon 刚体碰撞需要补上
- [ ] `checkBuildingCollision` 用 AABB 近似球碰撞 — 对小物体足够，对大物体可能漏检
- [ ] `ParticleManager` 粒子重力 15 与 `CFG.GRAVITY` 25 不一致 — 应该统一或加注释说明为什么不同
- [ ] `DayNightCycle` 的 `dayTime: 0.3` 初始值没有文档说明为什么不是 0 或 0.5
- [ ] `Engine.getDelta()` 的 50ms cap — 已有 "spiral of death" 注释，但具体阈值选择没有解释
