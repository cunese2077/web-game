# 飞机大战（PlaneWar）项目说明

> 基于 H5 Canvas + TypeScript 实现的飞机大战网页游戏

---

## 一、项目概述

本项目是一个使用纯原生 HTML5 Canvas + TypeScript 实现的网页版飞机大战游戏，采用 ES Module 模块化架构 + TypeScript 强类型系统，无需任何框架和依赖，通过本地服务器访问即可运行。

- **源码**：`src/*.ts`（TypeScript）
- **编译输出**：`js/*.js`（自动生成，勿手动修改）
- **构建**：`npm run build`

---

## 二、项目功能

### 1. 游戏阶段（状态机）
游戏共包含 6 个阶段，由 `curPhase: GamePhase` 变量驱动：

| 阶段常量 | 值 | 说明 |
| ---------- | --- | -------------------------- |
| `PHASE_DOWNLOAD` | 1 | 资源加载阶段，显示加载进度 |
| `PHASE_READY` | 2 | 准备阶段，显示开始 logo，点击进入 |
| `PHASE_LOADING` | 3 | 加载动画阶段，过渡到游戏 |
| `PHASE_PLAY` | 4 | 游戏进行阶段 |
| `PHASE_PAUSE` | 5 | 暂停阶段（鼠标移出画布触发） |
| `PHASE_GAME_OVER` | 6 | 游戏结束阶段（画布内 UI，点击重新开始） |

### 2. 核心玩法
- **战机控制**：鼠标移动 / 手指触摸控制己方战机位置
- **自动射击**：战机自动发射三路子弹（左、中、右），散弹模式下五路齐射
- **敌机生成**：随机生成三种不同体型、速度、生命值的敌机（概率随玩家血量动态调整）
- **敌机移动**：中型敌机正弦摆动，大型敌机锯齿形巡逻，小型敌机直线下落
- **碰撞检测**：子弹与敌机、敌机与战机的碰撞判定
- **爆炸动画**：敌机和战机被击毁时播放逐帧爆炸动画
- **计分系统**：击毁不同敌机获得不同分数（10/20/100），带浮动得分动效
- **等级系统**：击毁敌机获得经验，升级后属性加成（HP/伤害/射速/Buff），30 级满级
- **血量系统**：玩家战机基础 3 HP（随等级增长），受伤后 2 秒无敌时间，底部血条显示
- **道具系统**：4 种道具（回血、双倍火力、护盾、散弹），击败敌机后概率掉落
- **Buff 系统**：拾取道具后激活对应 buff，带进度条 UI 和视觉反馈
- **音效系统**：Web Audio API 程序化合成 11 种音效
- **暂停/恢复**：鼠标移出画布自动暂停
- **滚动背景**：背景图无缝循环滚动，营造飞行感

### 3. 敌机类型与生成逻辑

| 类型 | 速度 | 生命值 | 击毁得分 | 爆炸帧数 | 移动模式 | 基础出现概率 |
| ---- | ---- | ------ | -------- | -------- | -------- | ------------ |
| 小型敌机（enemy1） | 6 | 1 | 10 | 4 | 直线（straight） | 高（剩余概率） |
| 中型敌机（enemy2） | 4 | 15 | 20 | 4 | 正弦摆动（sine） | 中（30%） |
| 大型敌机（enemy3） | 2 | 70 | 100 | 6 | 锯齿形（zigzag） | 低（动态 5%~10%） |

**大型敌机冷却机制**：生成一个大型敌机后，40 帧（约 2 秒）内不会再生成大型敌机，避免连续出现多个大型敌机。

#### 2.1 敌机血量条与受击动效

所有敌机配置了血量条和受击动效，配置集中在 `config.ts` 的 `enemyConfig.*.hpBar` 和全局 `hitEffect`：

**血量条配置**（`hpBar` 字段，每种敌机独立配置）：

| 配置项 | 说明 | 当前值 |
| ------ | ---- | ------ |
| `show` | 是否显示血量条 | true（三种敌机均显示） |
| `showText` | 是否显示血量数字（当前HP/最大HP） | true（三种敌机均显示） |
| `offsetY` | 距敌机顶部偏移（负数=向上） | -8 |
| `height` | 血量条高度 | 4 |
| `colorFull` / `colorMid` / `colorLow` | 满血/中等/低血颜色 | 绿 `#4f4` / 黄 `#ff0` / 红 `#f44` |
| `midThreshold` / `lowThreshold` | 颜色切换阈值（血量比例） | 0.5 / 0.25 |

**受击动效配置**（全局 `hitEffect`，所有敌机共用）：

| 配置项 | 说明 | 当前值 |
| ------ | ---- | ------ |
| `soundCoolDown` | 受击音效冷却帧数（防抖） | 6 |
| `damageText.show` | 是否显示伤害浮动数字 | true |
| `damageText.fontSize` | 伤害数字字体大小 | 18 |
| `damageText.color` | 伤害数字颜色 | `#f44`（红色，醒目） |
| `damageText.floatDistance` | 上浮距离（像素） | 30 |
| `damageText.frames` | 持续帧数 | 25 |
| `damageText.stackOffset` | 堆叠偏移步长（像素，略大于字号，确保不重叠；过大会导致连续命中时频繁跳过显示） | 22 |

**受击逻辑**：子弹击中敌机但未击毁时，播放受击音效（6 帧冷却防抖），并在敌机底部位置（`this.y + this.height`）触发 "-X" 红色伤害浮动数字（18px，上浮 30px，25 帧淡出）。用底部而非顶部：大型敌机从屏幕顶部进入时底部先可见，顶部在屏幕外，用底部保证文本始终可见。

**单帧伤害合并**：`enemy.hit()` 在一次调用（单帧）内累积所有命中子弹的伤害，合并为**一个**伤害文本显示总伤害。避免 spread buff 多弹同时命中大型敌机时产生多个动效导致重叠，同时显示更清晰（"-10" 比 5 个 "-2" 更易读）。

**纵向防重叠采用"找空槽 + 跳过兜底"算法**：生成新动效时，`ui.addDamageEffect` 只收集同 x 附近（`fontSize×2` 范围内）且**屏幕内可见**（`curY >= 0`）的现存动效当前 y，从 `max(y, 0)` 开始依次尝试 `y, y-stackOffset, y-2*stackOffset, ...`，找到第一个与所有可见现存动效距离 ≥ `stackOffset` 的空槽作为起始 y（候选位置也限制在 `y >= 0` 屏幕内）。**关键**：若找不到不重叠的空槽（所有可见位置都被占用），**跳过本次伤害文本显示**（return 不产生新动效），彻底避免重叠。此时已有足够的伤害文本在显示，不影响信息传达。

**为何跳过而非兜底**：大型敌机 HP 高、下移慢（2px/帧），子弹间隔 3 帧，连续命中的动效起始 y 间距仅 ~6px，远小于 stackOffset(22px)。向上找空槽很快跑出屏幕顶部，若兜底用原始 y 会与现存动效重叠（间距 6px < 字号 18px）。跳过则保证已有动效不重叠，且 25 帧周期内仍会有足够的新动效产生（敌机下移后空槽重新可用）。血量条颜色随血量比例变化（绿→黄→红），所有敌机血量条上方显示 "当前HP/最大HP" 数字。

### 3.1 敌机横向移动系统

敌机横向移动通过 `MoveType` 区分联合类型实现，配置集中在 `config.ts` 的 `enemyConfig.*.move` 字段：

| 模式 | 适用敌机 | 算法 | 配置参数 |
| ---- | ------- | ---- | -------- |
| `straight` | 小型敌机 | 无横向偏移 | `type: "straight"` |
| `sine` | 中型敌机 | `x = originX + amplitude × sin(phase)`，每帧 `phase += frequency` | `amplitude: 40, frequency: 0.03` |
| `zigzag` | 大型敌机 | `x += horizontalSpeed × direction`，到画布边界反弹 | `amplitude: 60, horizontalSpeed: 1` |

**实现细节**：
- `Enemy` 新增属性：`originX`（初始 X）、`moveType`（移动模式）、`movePhase`（正弦相位，随机初始值）、`moveDirection`（锯齿方向 ±1）
- `_getMoveType()`：从 `enemyConfig` 读取当前敌机类型的移动模式
- `_updateHorizontalPosition()`：每帧调用，根据 `moveType` 执行对应算法
- 死亡动画期间不移动（`if (this.die) return`）
- 碰撞检测、道具掉落位置自动适配（使用实时 `this.x`）

### 4. 道具系统

#### 4.1 道具类型

| 道具 | 外观 | 效果 | 掉落来源 |
| ---- | ---- | ---- | -------- |
| 回血（heal） | 红色心形 | 恢复 1 HP | 大型敌机 |
| 双倍火力（firepower） | 橙色火焰 | 子弹伤害 ×2，持续 200帧(~10秒) | 大型敌机、中型敌机 |
| 护盾（shield） | 蓝色盾牌 | 抵消 1 次伤害，持续 300帧(~15秒) | 大型敌机、中型敌机 |
| 散弹（spread） | 紫色星形 | 5 发齐射（含 45° 斜射），持续 120帧(~6秒) | 中型敌机 |

#### 4.2 道具掉落概率（动态概率系统）

所有道具掉落概率根据玩家血量动态调整，公式为：

```
概率 = base + (1 - hpRatio) * bonus
hpRatio = 当前HP / 最大HP（1.0=满血, 0.0=空血）
```

- **正 bonus**：血量低时概率↑（保护型道具：回血、护盾）
- **负 bonus**：血量高时概率↑（攻击型道具：火力、散弹）

##### 大型敌机掉落概率

| 道具 | 配置 | 满血概率 | 空血概率 | 说明 |
| ---- | ---- | -------- | -------- | ---- |
| 护盾 | shieldBase=0.30, shieldBonus=0.20 | 30% | 50% | 优先判断，独立区间 |
| 回血 | healBase=0.25, healBonus=0.50 | 25% | 75% | |
| 火力 | firepowerBase=0.12, firepowerBonus=-0.04 | 12% | 8% | 负bonus，满血更常见 |

满血总掉落概率：30% + 25% + 12% = 67%

##### 中型敌机掉落概率

| 道具 | 配置 | 满血概率 | 空血概率 | 说明 |
| ---- | ---- | -------- | -------- | ---- |
| 护盾 | shieldBase=0.08, shieldBonus=0.04 | 8% | 12% | 方案四新增 |
| 火力 | firepowerBase=0.08, firepowerBonus=-0.03 | 8% | 5% | |
| 散弹 | spreadBase=0.08, spreadBonus=-0.03 | 8% | 5% | |

满血总掉落概率：8% + 8% + 8% = 24%

##### 概率判断顺序

判断顺序影响实际出现概率：优先判断的道具拥有独立区间（0~prob），后续道具的区间受前置挤压。当前顺序：

- **大型敌机**：护盾 → 回血 → 火力（护盾优先，确保独立区间）
- **中型敌机**：护盾 → 火力 → 散弹

##### 护盾整体出现频率

| 血量状态 | 大型敌机护盾来源 | 中型敌机护盾来源 | 总概率 | 实际频率 |
|---------|----------------|----------------|--------|---------|
| 满血 | 5% × 30% = 1.5% | 20% × 8% = 1.6% | 3.1% | 每 32 个敌机 1 个 |
| 空血 | 10% × 50% = 5% | 25% × 12% = 3% | 8% | 每 12 个敌机 1 个 |

### 5. Buff 系统

| Buff | 持续时间 | 视觉效果 | 机制 |
| ---- | -------- | -------- | ---- |
| 双倍火力 | 200帧(~10秒) | 子弹橙色光晕 + 进度条 | 子弹伤害 ×2 |
| 护盾 | 300帧(~15秒) | 蓝色光环 + 进度条 | 抵消 1 次伤害后消失 + 短暂无敌 |
| 散弹 | 120帧(~6秒) | 进度条 | 5 发齐射（含 45° 斜射） |

**Buff 计时**：每帧 `_tickBuffs()` 递减剩余帧数，归零时失效。

**Buff UI**：血条上方显示激活 buff 的进度条，拾取时显示浮动文字动效。

### 6. 等级系统

#### 6.1 核心参数

| 参数 | 值 | 说明 |
| ---- | --- | ---- |
| 基础升级经验 (base) | 450 | 1→2 级所需经验（起步门槛） |
| 递增系数 (growth) | 30 | 每级递增基数 |
| 曲线指数 (exponent) | 1.0 | 线性增长，前期平稳后期不过陡 |
| 满级 | 30 | 最高等级 |
| 经验曲线 | `base + growth × (lv-1)^exponent` | 线性增长（exponent=1.0） |

#### 6.2 经验来源

| 敌机类型 | 击毁得分 | 经验值 |
| -------- | -------- | ------ |
| 小型敌机 | 10 | 7 |
| 中型敌机 | 20 | 20 |
| 大型敌机 | 100 | 100 |

#### 6.3 升级经验示例

| 等级 | 升级所需 | 累计总经验 |
| ---- | -------- | ---------- |
| 1→2 | 450 | 450 |
| 5→6 | 570 | 2,220 |
| 10→11 | 720 | 5,130 |
| 15→16 | 870 | 8,580 |
| 20→21 | 1,020 | 13,680 |
| 25→26 | 1,170 | 19,350 |
| 29→30 | 1,290 | 25,230 |

#### 6.4 等级奖励

所有奖励规则通过 `config.ts` 的 `levelConfig.bonuses` 配置，无需改代码即可调参：

| 等级段 | 奖励 | 配置字段 | 触发等级 | 效果 |
| ------ | ---- | -------- | -------- | ---- |
| 1~10 | maxHp +1 | `bonuses.hpBonusLevels` | 2/4/7/10 | 10 级时 maxHp=3→7 |
| 1~10 | 子弹伤害 +perLevel | `bonuses.damageBonus` | 每级（封顶 maxLevel=10） | 10 级时基础伤害 1→2.5 |
| 11~20 | maxHp +1 | `bonuses.hpBonusLevels` | 13/17/20 | 20 级时 maxHp=10 |
| 11~20 | 射击间隔 -reduction | `bonuses.bulletInterval` | 每 perLevels=2 级（11~20区间） | 射速加快（下限 1 帧） |
| 21~30 | maxHp +1 | `bonuses.hpBonusLevels` | 23/27/30 | 30 级时 maxHp=13 |
| 21~30 | Buff 持续 ×multiplier | `bonuses.buffDuration` | 每 perLevels=3 级（21~30区间） | 累计 ×1.15 |

**升级回血**：每次升级回复 1 HP，连续升 N 级则回 N HP（不超过 maxHp）。

#### 6.5 伤害计算

```
damage = (baseDamage + extraDamage) × firepowerMultiplier
```
- `baseDamage`：子弹基础伤害（config.ts 中 bulletConfig.baseDamage = 1）
- `extraDamage`：等级加成额外伤害
- `firepowerMultiplier`：firepower buff 倍率（激活时 2，否则 1）

#### 6.6 等级 UI

- 右上角：`LV.XX` + 金色经验条（满级后变紫色，显示 "MAX"）
- 升级特效：金色光环 + "LEVEL UP! → N" 浮动文字（60 帧淡出）
- 升级音效：C5-E5-G5-C6 上行琶音
- 游戏结束界面：显示 LEVEL 和 TOTAL EXP

#### 6.7 游戏节奏

| 时间 | 预计等级 |
| ---- | -------- |
| 1 分钟 | 3~4 级 |
| 4 分钟 | 8~10 级 |
| 8 分钟 | 16~18 级 |
| 12 分钟 | 24~26 级 |
| 15 分钟 | 30 级（满级） |

### 7. 血量系统

| 属性 | 值 | 说明 |
| ---- | --- | ---- |
| maxHp | 3 + extraHp | 基础 3 + 等级加成（满级 13） |
| hp | maxHp | 当前血量 |
| 无敌帧数 | 40 | 受伤后约 2 秒无敌 |
| 闪烁表现 | 透明度交替 | 无敌期间战机闪烁 |

受伤时扣 1 HP，进入无敌状态；HP 归零时进入 dying 状态，播放爆炸动画后 GAME_OVER。

### 7. 音效系统

使用 Web Audio API 程序化合成，无需外部音频文件：

| 音效 | 合成方式 | 触发时机 | 备注 |
| ---- | -------- | -------- | ---- |
| 子弹发射 | 正弦波 1200→600Hz | `Bullet.add()` | 6 帧冷却防叠加 |
| 小型敌机摧毁 | 锯齿波+噪声 0.1s | 敌机 speed=6 被击毁 | |
| 中型敌机摧毁 | 锯齿波+噪声 0.2s | 敌机 speed=4 被击毁 | |
| 大型敌机摧毁 | 双振荡器+噪声 0.4s | 敌机 speed=2 被击毁 | |
| 拾取回血 | C5-E5-G5 上升和弦 | 拾取回血道具 | |
| 拾取双倍火力 | 锯齿波上升+噪声 | 拾取火力道具 | |
| 拾取护盾 | 正弦波双音和弦 | 拾取护盾道具 | |
| 拾取散弹 | 三角波快速琶音 | 拾取散弹道具 | |
| 玩家扣血 | 噪声+重击+嗡鸣+蜂鸣 | 碰撞敌机扣 HP | 四层叠加 |
| 游戏结束 | G4-F4-E4-C4 下降音阶 | 进入 GAME_OVER | 仅播放一次 |
| 升级 | C5-E5-G5-C6 上行琶音 | 等级提升 | 区别于道具拾取 |

**AudioContext 策略**：延迟初始化，用户首次点击画布时 `resumeAudio()` 激活。

---

## 三、技术实现

### 1. 技术栈
- **渲染层**：HTML5 Canvas 2D Context
- **脚本语言**：TypeScript 5.4+（ES Module 输出）
- **类型系统**：严格模式（`strict: true`），禁止 `any`
- **模块架构**：`src/` 目录下 13 个 TypeScript 模块
- **音效**：Web Audio API 程序化合成
- **资源**：本地 PNG 图片素材
- **构建**：`tsc` 编译到 `js/` 目录
- **依赖**：仅 `typescript`（devDependency）

### 2. TypeScript 类型系统

核心类型定义在 [src/types.ts](web-game/src/types.ts)：

| 类型 | 说明 |
| ---- | ---- |
| `GamePhase` | 游戏阶段枚举（`1 \| 2 \| 3 \| 4 \| 5 \| 6`，基于 `as const`） |
| `MoveType` | 移动模式（`"straight" \| "sine" \| "zigzag"`） |
| `SmallEnemyMoveConfig` / `SineMoveConfig` / `ZigzagMoveConfig` | 三种移动配置（区分联合类型） |
| `EnemyConfig` | 敌机配置（small/medium/big，move 类型精确对应，含 hpBar 血量条配置） |
| `HpBarConfig` / `HitEffectConfig` / `DamageTextConfig` | 敌机血量条配置 / 受击动效配置 / 伤害浮动动效配置 |
| `BuffConfig` / `BuffState` | Buff 配置与运行时状态 |
| `FirepowerBuffConfig` / `ShieldBuffConfig` / `SpreadBuffConfig` | 三种 Buff 各自配置接口 |
| `ItemType` | 道具类型（`"heal" \| "firepower" \| "shield" \| "spread"`） |
| `ItemConfig` | 道具配置（`Record<ItemType, ItemTypeConfig>`） |
| `DropConfig` | 道具掉落概率配置 |
| `HeroConfig` / `BulletConfig` | 玩家/子弹配置 |
| `LevelConfig` / `LevelBonusConfig` / `LevelBonuses` | 等级配置、奖励规则、属性加成 |
| `BuffFloat` | Buff 浮动文字动效 |

### 3. 核心架构
游戏采用「主循环 + 状态机」的经典架构：

```
requestAnimationFrame(gameLoop)
        │
        ▼
   gameEngine()
        │ 根据 curPhase 分发
        ├─ PHASE_READY    → pBg() + paintLogo()
        ├─ PHASE_LOADING  → pBg() + load()
        ├─ PHASE_PLAY     → pBg() + drawEnemy() + drawItems() + drawBullet() + hero.draw() + drawScoreEffects()
        ├─ PHASE_PAUSE    → drawPause()
        └─ PHASE_GAME_OVER → pBg() + drawGameOver() + playGameOver()
```

### 4. 关键技术点

#### （1）资源加载与进度显示
- 通过 `Image.onload` 事件累加 `progress`
- 使用 `progress += 100 / totalImages` 动态计算，增减图片不影响进度
- 加载完成后自动进入 `PHASE_READY` 阶段

#### （2）滚动背景
- `paintBg()` 使用闭包保存 `y` 偏移量
- 同时绘制两张背景图实现无缝循环滚动

#### （3）ES6 类与模块化
- `Hero`：玩家战机，负责绘制、子弹生成、碰撞检测、血量管理、Buff 管理
- `Bullet`：子弹，含位置、移动、出界标记、散弹斜射支持
- `Enemy`：敌机，含动态概率生成、爆炸动画、横向移动、与子弹碰撞检测、道具掉落
- `Item`：道具，多类型（心形/火焰/盾牌/星形），下落、碰撞拾取
- `ScoreEffectObj`：得分动效，浮动文字+发光

#### （4）碰撞检测
- **子弹 vs 敌机**：矩形碰撞检测，`hit()` 入口检查 `this.die` 防重复触发
- **敌机 vs 战机**：基于重叠点的碰撞判定
- **道具 vs 战机**：矩形碰撞，支持同帧拾取多个道具，返回 `ItemType[]`

#### （5）数组清理机制
- 所有对象使用 `removable` 标记位 + 逆序遍历 `splice` 移除
- 逆序遍历确保删除时不影响未遍历元素的索引

#### （6）输入事件
- 事件绑定提取为模块级 `bindEventsOnce()`，只绑定一次
- 通过 `activeHero` 引用确保事件回调操作最新实例
- 鼠标/触摸事件通过 `e instanceof MouseEvent` 类型收窄

#### （7）音效合成
- 所有音效通过 Web Audio API 振荡器 + 噪声缓冲区实时合成
- 无需加载外部音频文件，零资源依赖
- 连续触发音效加冷却帧数，单次音效加标志位防重复

#### （8）配置集中管理
- 所有游戏数值参数集中在 `config.ts`，包括敌机属性、移动模式、buff 配置、道具掉落概率、外观配置等
- 动态概率函数统一使用 `base + (1 - hpRatio) * bonus` 公式
- 修改参数只需调整 `config.ts` 对应字段，业务逻辑自动引用

---

## 四、项目文件结构

```
web-game/
├── src/                          # TypeScript 源码（开发目录）
│   ├── types.ts                  # 全局类型定义 + 阶段常量
│   ├── constants.ts              # 阶段常量（re-export from types.ts）
│   ├── canvas.ts                 # 画布初始化与导出
│   ├── config.ts                 # 集中配置管理
│   ├── resources.ts              # 图片资源加载与管理
│   ├── score.ts                  # 分数管理模块
│   ├── level.ts                  # 等级管理模块（经验/升级/属性加成）
│   ├── hero.ts                   # 环家战机类 + 血量系统 + Buff 管理 + 等级UI
│   ├── bullet.ts                 # 子弹类（支持散弹斜射）
│   ├── enemy.ts                  # 敌机类 + 动态概率生成 + 横向移动 + 道具掉落
│   ├── item.ts                   # 道具类（4 种类型）+ 碰撞拾取
│   ├── ui.ts                     # UI 绘制 + 得分动效系统
│   ├── audio.ts                  # 音效合成模块（11 种音效）
│   └── engine.ts                 # 游戏主引擎入口
├── js/                           # 编译输出（自动生成，勿手动修改）
│   └── *.js
├── img/                          # 游戏图片资源目录
│   ├── background.png            # 背景图
│   ├── start.png                 # 开始界面 logo
│   ├── game_pause_nor.png        # 暂停图标
│   ├── game_loading1~4.png       # 加载动画帧
│   ├── hero1.png / hero2.png     # 玩家战机双帧动画
│   ├── hero_blowup_n1~n4.png     # 玩家战机爆炸帧
│   ├── m.png / m1.png / m2.png   # 子弹图片
│   ├── enemy1.png                # 小型敌机
│   ├── enemy1_down1~4.png        # 小型敌机爆炸帧
│   ├── enemy2.png                # 中型敌机
│   ├── enemy2_down1~4.png        # 中型敌机爆炸帧
│   ├── enemy3_n1.png / n2.png    # 大型敌机双帧动画
│   ├── enemy3_hit.png            # 大型敌机受击图
│   ├── enemy3_down1~6.png        # 大型敌机爆炸帧
│   └── p1~p6.png                 # 其他素材
├── index.html                    # 页面入口，承载 canvas
├── tsconfig.json                 # TypeScript 编译配置
├── package.json                  # npm 脚本（build/watch/serve）
├── app_v2.js                     # 旧版单文件逻辑（已弃用）
├── README.md                     # 项目简介
├── .gitignore                    # Git 忽略配置
├── PROJECT_GUIDE.md              # 本文档
└── MEMORY.md                     # 开发问题记录与注意事项
```

---

## 五、核心功能文件说明

### 1. [index.html](web-game/index.html)
页面入口文件，主要职责：
- 声明 `<canvas id="canvas">` 作为游戏画布
- 设置 `viewport` meta，禁用用户缩放（适配移动端）
- 全屏布局，隐藏溢出内容
- 通过 `<script type="module">` 引入 `js/engine.js` 启动游戏

### 2. [src/engine.ts](web-game/src/engine.ts)
游戏主引擎入口，负责：
- 加载资源完成后启动游戏
- 管理游戏阶段（`curPhase`）状态
- 驱动主循环 `requestAnimationFrame` + 时间步长
- 根据阶段分发渲染逻辑
- 处理画布点击事件（开始/重新开始）
- 用户首次点击时激活 AudioContext

### 3. [src/types.ts](web-game/src/types.ts)
全局类型定义模块，导出：
- 6 个游戏阶段常量（`PHASE_DOWNLOAD` ~ `PHASE_GAME_OVER`，使用 `as const`）
- `GamePhase` 类型（1|2|3|4|5|6 联合类型）
- 敌机移动配置接口（`SmallEnemyMoveConfig` / `SineMoveConfig` / `ZigzagMoveConfig`）
- 敌机配置接口（`EnemyConfig` 及子接口）
- Buff 配置接口（`BuffConfig` / `BuffState` 及子接口）
- 道具类型与配置接口（`ItemType` / `ItemConfig`）
- 掉落配置接口（`DropConfig`）
- 玩家/子弹配置接口（`HeroConfig` / `BulletConfig`）
- 其他辅助类型（`BuffFloat` 等）

### 4. [src/config.ts](web-game/src/config.ts)
集中配置管理模块，导出：
- `enemyConfig`：敌机属性配置（速度、HP、得分、出现权重、**移动模式配置**、**血量条配置 hpBar**）
- `hitEffect`：敌机受击动效全局配置（闪烁帧数、颜色、音效冷却）
- `buffConfig`：Buff 配置（持续时间、颜色、图标、伤害倍率）
- `dropConfig`：道具掉落概率配置（base + bonus 动态概率参数）
- `itemConfig`：道具外观配置（大小、颜色、发光、浮动文字）
- `heroConfig`：玩家战机配置（HP、无敌帧数、射击间隔）
- `bulletConfig`：子弹配置（伤害、速度、偏移）
- `levelConfig`：等级配置（经验曲线 base/growth/exponent、满级、经验奖励、**等级奖励规则 bonuses**）
- 7 个动态概率函数

### 5. [src/constants.ts](web-game/src/constants.ts)
游戏阶段常量定义，re-export `types.ts` 中的 6 个阶段常量。

### 6. [src/canvas.ts](web-game/src/canvas.ts)
画布初始化模块，导出 `width`/`height`/`canvas`/`ctx`。

### 7. [src/resources.ts](web-game/src/resources.ts)
图片资源加载与管理，导出：
- `download(callback)`：动态计算进度加载所有图片
- 各图片资源对象/数组

### 8. [src/score.ts](web-game/src/score.ts)
分数管理模块，导出：
- `getGameScore()` / `resetGameScore()` / `addGameScore()`

### 9. [src/level.ts](web-game/src/level.ts)
等级管理模块（独立于 hero.ts，避免循环依赖），导出：
- `getLevel()` / `getExp()` / `getExpToNext()` / `getTotalExp()`：等级/经验查询
- `addExp(amount)` → 返回升级次数（支持连升多级）
- `resetLevel()`：重置为 1 级
- `getLevelBonuses()` → `LevelBonuses`：当前等级属性加成汇总
- `getExpReward(enemySpeed)` → 该敌机类型经验奖励

### 10. [src/hero.ts](web-game/src/hero.ts)
玩家战机类 `Hero`，负责：
- 战机绘制与双帧动画切换
- 自动发射三路子弹（散弹模式五路齐射）
- 定时生成敌机
- 与敌机碰撞检测（扣 HP + 无敌帧 + 闪烁）
- 护盾抵消伤害逻辑
- 血条绘制（右下角，颜色随血量变化）
- Buff 管理：计时递减、UI 进度条、拾取动效
- 护盾光环渲染
- 道具碰撞拾取
- 事件绑定：`bindEventsOnce()` 只绑定一次

### 11. [src/bullet.ts](web-game/src/bullet.ts)
子弹类 `Bullet`，负责：
- 子弹绘制与移动（含三路偏移 + 散弹斜射）
- 双倍火力时橙色光晕
- 出界标记移除（逆序遍历）
- 射击音效（6 帧冷却）

### 12. [src/enemy.ts](web-game/src/enemy.ts)
敌机类 `Enemy`，负责：
- 三种敌机动态概率生成
- 大型敌机 40 帧冷却机制
- 敌机移动与爆炸动画
- **横向移动系统**：`_getMoveType()` 读取配置，`_updateHorizontalPosition()` 每帧更新 X 坐标
  - `sine`：正弦摆动（`originX + amplitude × sin(phase)`）
  - `zigzag`：锯齿形巡逻（到边界反弹）
  - `straight`：无横向移动
- 与子弹碰撞检测、计分、得分动效、摧毁音效
- 道具掉落逻辑（动态概率，根据玩家血量调整）

### 13. [src/item.ts](web-game/src/item.ts)
道具类 `Item`，负责：
- 4 种道具绘制：心形（回血）、火焰（火力）、盾牌（护盾）、星形（散弹）
- 呼吸动画 + 外发光效果
- 下落移动与出界移除
- 碰撞拾取检测（返回 `ItemType[]`，支持同帧多拾取）

### 14. [src/ui.ts](web-game/src/ui.ts)
UI 绘制模块，导出：
- `paintBg()`：返回闭包函数，实现无缝滚动背景
- `paintLogo()`：绘制开始界面 logo
- `loading()`：返回加载动画函数
- `drawPause()`：居中绘制暂停图标
- `drawGameOver()`：画布内绘制 GAME OVER + 得分 + 重新开始提示
- `addScoreEffect()` / `drawScoreEffects()` / `clearScoreEffects()`：得分动效系统
- `addDamageEffect()` / `drawDamageEffects()` / `clearDamageEffects()`：伤害浮动动效系统（"-X" 上浮淡出）

### 15. [src/audio.ts](web-game/src/audio.ts)
音效合成模块，使用 Web Audio API 程序化合成 11 种音效：
- `resumeAudio()`：激活 AudioContext
- `playShoot()`：子弹发射
- `playEnemyDestroySmall()` / `playEnemyDestroyMedium()` / `playEnemyDestroyBig()`：敌机摧毁
- `playHeal()` / `playFirepower()` / `playShield()` / `playSpread()`：道具拾取
- `playHit()`：玩家扣血（4 层厚重音效：噪音+低频+嗡鸣+警报）
- `playEnemyHit()`：敌机受击（轻量短促单音，音量 0.06，与玩家扣血区分）
- `playGameOver()`：游戏结束
- `playLevelUp()`：升级音效（C5-E5-G5-C6 上行琶音）

---

## 六、运行方式

### 构建（必须先编译）
```bash
npm install        # 安装 TypeScript
npm run build      # 编译 src/*.ts → js/*.js
```

### 本地服务器（必须）
由于使用 ES Module，必须通过 HTTP 服务器访问（不支持 `file://` 协议）：

```bash
# Python 3
python3 -m http.server 8080

# 或使用 npm serve
npm run serve
```

然后访问 `http://localhost:8080`。

### 开发模式（自动编译）
```bash
npm run watch      # 监听文件变化，自动编译
```

### 操作说明
- **PC 端**：移动鼠标控制战机；鼠标移出画布暂停
- **移动端**：手指触摸滑动控制战机
- **开始游戏**：加载完成后点击画布开始
- **重新开始**：游戏结束后点击画布

---

## 七、项目注意事项

### 1. 兼容性说明
- 画布尺寸上限为 `480 × 650`，超过此尺寸的屏幕会留白
- 移动端需通过 `e.touches[0].pageX` 获取触摸坐标
- 不支持 Canvas 的浏览器会显示提示文字
- Web Audio API 需要用户交互后才能创建 AudioContext

### 2. 资源依赖
- 所有图片资源位于 `img/` 目录，路径硬编码为 `"img/" + src`
- 图片总数量 = `imgName.flat().length`，进度自动计算
- 无外部音频文件，音效全部由 Web Audio API 合成

### 3. 代码风格
- TypeScript 严格模式，禁止 `any`
- 命名混合驼峰与全大写常量（如 `gameScore` vs `PHASE_PLAY`）
- 注释以中文为主
- 旧版 `app_v2.js` 保留但不再维护

### 4. 游戏平衡调整指南

所有数值参数集中在 `config.ts`，修改对应字段即可调整游戏平衡：

```typescript
// 敌机属性
enemyConfig.big.hp = 70;           // 大型敌机 HP
enemyConfig.medium.hp = 15;        // 中型敌机 HP

// 敌机移动
enemyConfig.medium.move.amplitude = 40;   // 正弦摆动幅度
enemyConfig.medium.move.frequency = 0.03; // 正弦摆动频率
enemyConfig.big.move.horizontalSpeed = 1; // 锯齿横向速度

// 敌机血量条（每种敌机独立配置）
enemyConfig.small.hpBar.show = false;     // 关闭小型敌机血量条
enemyConfig.big.hpBar.colorFull = "#0f0"; // 修改满血颜色
enemyConfig.medium.hpBar.lowThreshold = 0.2; // 调整低血阈值

// 敌机受击动效（全局配置）
hitEffect.soundCoolDown = 8;          // 增加音效冷却
hitEffect.damageText.show = false;    // 关闭伤害浮动数字
hitEffect.damageText.fontSize = 18;   // 放大伤害数字

// 关闭横向移动（恢复直线）
enemyConfig.medium.move.type = "straight";
enemyConfig.big.move.type = "straight";

// Buff 持续时间
buffConfig.firepower.duration = 200;  // 双倍火力持续帧数
buffConfig.shield.duration = 300;     // 护盾持续帧数
buffConfig.spread.duration = 120;     // 散弹持续帧数

// 道具掉落概率（动态系统）
dropConfig.bigEnemy.shieldBase = 0.30;   // 满血时护盾掉落概率
dropConfig.bigEnemy.shieldBonus = 0.20;  // 空血时额外加成
dropConfig.bigEnemy.healBase = 0.25;     // 满血时回血掉落概率
dropConfig.bigEnemy.healBonus = 0.50;    // 空血时额外加成
dropConfig.mediumEnemy.shieldBase = 0.08; // 中型敌机护盾掉落概率

// 等级系统 - 经验曲线（控制升级速度）
levelConfig.base = 450;             // 基础升级经验（起步门槛）
levelConfig.growth = 30;            // 每级递增基数
levelConfig.exponent = 1.0;         // 曲线指数（1.0=线性）
levelConfig.maxLevel = 30;          // 满级
levelConfig.expRewards.small = 7;   // 小型敌机经验
levelConfig.expRewards.medium = 20; // 中型敌机经验
levelConfig.expRewards.big = 100;   // 大型敌机经验

// 等级系统 - 等级奖励（控制升级后的属性加成）
levelConfig.bonuses.hpBonusLevels = [2, 4, 7, 10, 13, 17, 20, 23, 27, 30]; // HP+1 等级点
levelConfig.bonuses.damageBonus.perLevel = 0.15;  // 每级伤害加成
levelConfig.bonuses.damageBonus.maxLevel = 10;    // 伤害加成封顶等级
levelConfig.bonuses.bulletInterval.perLevels = 2; // 每 N 级减射速间隔
levelConfig.bonuses.bulletInterval.reduction = 0.15;
levelConfig.bonuses.buffDuration.perLevels = 3;   // 每 N 级增 Buff 时长
levelConfig.bonuses.buffDuration.multiplier = 1.05;
```

**概率调整注意事项**：
- 优先判断的道具拥有独立概率区间（0~prob）
- 后续道具的区间受前置挤压，低概率道具应优先判断
- 总掉落概率可能超过 100%，但逐个判断不会重复掉落
- 动态概率公式：`prob = base + (1 - hpRatio) * bonus`

### 5. 扩展建议
- ~~引入模块化（ES Module）拆分 `app_v2.js`~~ ✅ 已完成
- ~~增加音效系统~~ ✅ 已完成（Web Audio API，10 种音效）
- ~~增加道具系统~~ ✅ 已完成（4 种道具 + 动态概率）
- ~~增加血量系统~~ ✅ 已完成（3 HP + 血条 + 回血动效）
- ~~增加 Buff 系统~~ ✅ 已完成（双倍火力 + 护盾 + 散弹）
- ~~配置集中管理~~ ✅ 已完成（config.ts）
- ~~分数独立模块~~ ✅ 已完成（score.ts）
- ~~使用 `requestAnimationFrame` + 时间步长替代 `setInterval`~~ ✅ 已完成
- ~~迁移到 TypeScript~~ ✅ 已完成（strict 模式，禁止 any）
- ~~敌机横向移动~~ ✅ 已完成（sine/zigzag/straight 三种模式）
- ~~玩家战机等级系统~~ ✅ 已完成（经验/升级/属性加成/30级满级）
- 增加难度递增机制
- 增加敌机射击（向下发射敌弹）
- 增加中型敌机俯冲行为
- 增加小型敌机编队出现

---

## 八、版本信息

- **当前版本**：v4（TypeScript 重构版 + 道具/Buff 系统 + 敌机横向移动 + 等级系统）
- **架构**：TypeScript + ES Module
- **源码模块数量**：14 个（src/ 目录）
- **类型定义**：22+ 接口/类型（types.ts）
- **构建方式**：`tsc` 编译到 js/
- **最后更新**：见 Git 提交历史
- **维护状态**：基础功能完整，存在扩展空间
