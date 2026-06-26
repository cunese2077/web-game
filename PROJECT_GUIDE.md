# 飞机大战（PlaneWar）项目说明

> 基于 H5 Canvas 实现的飞机大战网页游戏

---

## 一、项目概述

本项目是一个使用纯原生 HTML5 Canvas + JavaScript（ES6+）实现的网页版飞机大战游戏，采用 ES Module 模块化架构，无需任何框架和依赖，通过本地服务器访问即可运行。

---

## 二、项目功能

### 1. 游戏阶段（状态机）
游戏共包含 6 个阶段，由 `curPhase` 变量驱动：

| 阶段常量 | 值 | 说明 |
| ---------- | --- | -------------------------- |
| `PHASE_DOWNLOAD` | 1 | 资源加载阶段，显示加载进度 |
| `PHASE_READY` | 2 | 准备阶段，显示开始 logo，点击进入 |
| `PHASE_LOADING` | 3 | 加载动画阶段，过渡到游戏 |
| `PHASE_PLAY` | 4 | 游戏进行阶段 |
| `PHASE_PAUSE` | 5 | 暂停阶段（鼠标移出画布触发） |
| `PHASE_GAMEOVER` | 6 | 游戏结束阶段（画布内 UI，点击重新开始） |

### 2. 核心玩法
- **战机控制**：鼠标移动 / 手指触摸控制己方战机位置
- **自动射击**：战机自动发射三路子弹（左、中、右），散弹模式下五路齐射
- **敌机生成**：随机生成三种不同体型、速度、生命值的敌机（概率随玩家血量动态调整）
- **碰撞检测**：子弹与敌机、敌机与战机的碰撞判定
- **爆炸动画**：敌机和战机被击毁时播放逐帧爆炸动画
- **计分系统**：击毁不同敌机获得不同分数（10/20/100），带浮动得分动效
- **血量系统**：玩家战机 3 HP，受伤后 2 秒无敌时间，底部血条显示
- **道具系统**：4 种道具（回血、双倍火力、护盾、散弹），击败敌机后概率掉落
- **Buff 系统**：拾取道具后激活对应 buff，带进度条 UI 和视觉反馈
- **音效系统**：Web Audio API 程序化合成 10 种音效
- **暂停/恢复**：鼠标移出画布自动暂停
- **滚动背景**：背景图无缝循环滚动，营造飞行感

### 3. 敌机类型与生成逻辑

| 类型 | 速度 | 生命值 | 击毁得分 | 爆炸帧数 | 基础出现概率 |
| ---- | ---- | ------ | -------- | -------- | ------------ |
| 小型敌机（enemy1） | 6 | 1 | 10 | 4 | 高（剩余概率） |
| 中型敌机（enemy2） | 4 | 15 | 20 | 4 | 中（30%） |
| 大型敌机（enemy3） | 2 | 70 | 100 | 6 | 低（动态 5%~10%） |

**大型敌机冷却机制**：生成一个大型敌机后，40 帧（约 2 秒）内不会再生成大型敌机，避免连续出现多个大型敌机。

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

### 6. 血量系统

| 属性 | 值 | 说明 |
| ---- | --- | ---- |
| maxHp | 3 | 最大血量 |
| hp | 3 | 当前血量 |
| 无敌帧数 | 40 | 受伤后约 2 秒无敌 |
| 闪烁表现 | 透明度交替 | 无敌期间战机闪烁 |

受伤时扣 1 HP，进入无敌状态；HP 归零时进入 dying 状态，播放爆炸动画后 GAMEOVER。

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
| 游戏结束 | G4-F4-E4-C4 下降音阶 | 进入 GAMEOVER | 仅播放一次 |

**AudioContext 策略**：延迟初始化，用户首次点击画布时 `resumeAudio()` 激活。

---

## 三、技术实现

### 1. 技术栈
- **渲染层**：HTML5 Canvas 2D Context
- **脚本语言**：原生 JavaScript（ES6+，ES Module）
- **模块架构**：`js/` 目录下 11 个模块
- **音效**：Web Audio API 程序化合成
- **资源**：本地 PNG 图片素材
- **依赖**：无任何第三方库

### 2. 核心架构
游戏采用「主循环 + 状态机」的经典架构：

```
setInterval(gameEngine, 50)  // 主循环每 50ms 调用一次
        │
        ▼
   gameEngine()
        │ 根据 curPhase 分发
        ├─ PHASE_READY    → pBg() + paintLogo()
        ├─ PHASE_LOADING  → pBg() + load()
        ├─ PHASE_PLAY     → pBg() + drawEnemy() + drawItems() + drawBullet() + hero.draw() + drawScoreEffects()
        ├─ PHASE_PAUSE    → drawPause()
        └─ PHASE_GAMEOVER → pBg() + drawGameOver() + playGameOver()
```

### 3. 关键技术点

#### （1）资源加载与进度显示
- 通过 `Image.onload` 事件累加 `progress`
- 使用 `progress += 100 / totalImages` 动态计算，增减图片不影响进度
- 加载完成后自动进入 `PHASE_READY` 阶段

#### （2）滚动背景
- [ui.js](web-game/js/ui.js) 中的 `paintBg()` 使用闭包保存 `y` 偏移量
- 同时绘制两张背景图实现无缝循环滚动

#### （3）ES6 类与模块化
- `Hero`：玩家战机，负责绘制、子弹生成、碰撞检测、血量管理、Buff 管理
- `Hullet`：子弹，含位置、移动、出界标记、散弹斜射支持
- `Enemy`：敌机，含动态概率生成、爆炸动画、与子弹碰撞检测、道具掉落
- `Item`：道具，多类型（心形/火焰/盾牌/星形），下落、碰撞拾取
- `ScoreEffect`：得分动效，浮动文字+发光

#### （4）碰撞检测
- **子弹 vs 敌机**：AABB 矩形碰撞检测，`hit()` 入口检查 `this.die` 防重复触发
- **敌机 vs 战机**：基于重叠点的碰撞判定
- **道具 vs 战机**：矩形碰撞，支持同帧拾取多个道具，返回拾取道具类型数组

#### （5）数组清理机制
- 所有对象使用 `removable` 标记位 + 逆序遍历 `splice` 移除
- 逆序遍历确保删除时不影响未遍历元素的索引

#### （6）输入事件
- 事件绑定提取为模块级 `bindEventsOnce()`，只绑定一次
- 通过 `activeHero` 引用确保事件回调操作最新实例

#### （7）音效合成
- 所有音效通过 Web Audio API 振荡器 + 噪声缓冲区实时合成
- 无需加载外部音频文件，零资源依赖
- 连续触发音效加冷却帧数，单次音效加标志位防重复

#### （8）配置集中管理
- 所有游戏数值参数集中在 `config.js`，包括敌机属性、buff 配置、道具掉落概率、外观配置等
- 动态概率函数统一使用 `base + (1 - hpRatio) * bonus` 公式
- 修改参数只需调整 `config.js` 对应字段，业务逻辑自动引用

---

## 四、项目文件结构

```
web-game/
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
├── js/                           # 游戏逻辑模块（ES Module）
│   ├── config.js                 # 集中配置管理（敌机/Buff/道具掉落/外观/战机/子弹）
│   ├── constants.js              # 游戏阶段常量定义
│   ├── canvas.js                 # 画布初始化与导出
│   ├── resources.js              # 图片资源加载与管理
│   ├── score.js                  # 分数管理模块
│   ├── hero.js                   # 玩家战机类 + 血量系统 + Buff 管理
│   ├── bullet.js                 # 子弹类（支持散弹斜射）
│   ├── enemy.js                  # 敌机类 + 动态概率生成 + 道具掉落
│   ├── item.js                   # 道具类（4 种类型）+ 碰撞拾取
│   ├── ui.js                     # UI 绘制 + 得分动效系统
│   ├── audio.js                  # 音效合成模块（10 种音效）
│   └── engine.js                 # 游戏主引擎入口
├── index.html                    # 页面入口，承载 canvas
├── app_v2.js                     # 旧版单文件逻辑（已拆分为 js/ 目录）
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

### 2. [js/engine.js](web-game/js/engine.js)
游戏主引擎入口，负责：
- 加载资源完成后启动游戏
- 管理游戏阶段（`curPhase`）状态
- 驱动主循环 `setInterval(gameEngine, 50)`
- 根据阶段分发渲染逻辑
- 处理画布点击事件（开始/重新开始）
- 用户首次点击时激活 AudioContext

### 3. [js/config.js](web-game/js/config.js)
集中配置管理模块，导出：
- `enemyConfig`：敌机属性配置（速度、HP、得分、出现权重）
- `buffConfig`：Buff 配置（持续时间、颜色、图标、伤害倍率）
- `dropConfig`：道具掉落概率配置（base + bonus 动态概率参数）
- `itemConfig`：道具外观配置（大小、颜色、发光、浮动文字）
- `heroConfig`：玩家战机配置（HP、无敌帧数、射击间隔）
- `bulletConfig`：子弹配置（伤害、速度、偏移）
- 6 个动态概率函数：`getDynamicHealDropProb`、`getDynamicShieldDropProb`、`getDynamicBigFirepowerDropProb`、`getDynamicMediumFirepowerDropProb`、`getDynamicMediumShieldDropProb`、`getDynamicSpreadDropProb`、`getDynamicBigEnemySpawnProb`

### 4. [js/constants.js](web-game/js/constants.js)
游戏阶段常量定义，导出 6 个阶段常量。

### 5. [js/canvas.js](web-game/js/canvas.js)
画布初始化模块，导出 `width`/`height`/`canvas`/`ctx`。

### 6. [js/resources.js](web-game/js/resources.js)
图片资源加载与管理，导出：
- `download(callback)`：动态计算进度加载所有图片
- 各图片资源对象/数组

### 7. [js/score.js](web-game/js/score.js)
分数管理模块，导出：
- `getGameScore()` / `resetGameScore()` / `addGameScore()`

### 8. [js/hero.js](web-game/js/hero.js)
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

### 9. [js/bullet.js](web-game/js/bullet.js)
子弹类 `Hullet`，负责：
- 子弹绘制与移动（含三路偏移 + 散弹斜射）
- 双倍火力时橙色光晕
- 出界标记移除（逆序遍历）
- 射击音效（6 帧冷却）

### 10. [js/enemy.js](web-game/js/enemy.js)
敌机类 `Enemy`，负责：
- 三种敌机动态概率生成
- 大型敌机 40 帧冷却机制
- 敌机移动与爆炸动画
- 与子弹碰撞检测、计分、得分动效、摧毁音效
- 道具掉落逻辑（动态概率，根据玩家血量调整）

### 11. [js/item.js](web-game/js/item.js)
道具类 `Item`，负责：
- 4 种道具绘制：心形（回血）、火焰（火力）、盾牌（护盾）、星形（散弹）
- 呼吸动画 + 外发光效果
- 下落移动与出界移除
- 碰撞拾取检测（返回拾取道具类型数组，支持同帧多拾取）

### 12. [js/ui.js](web-game/js/ui.js)
UI 绘制模块，导出：
- `paintBg()`：返回闭包函数，实现无缝滚动背景
- `paintLogo()`：绘制开始界面 logo
- `loading()`：返回加载动画函数
- `drawPause()`：居中绘制暂停图标
- `drawGameOver()`：画布内绘制 GAME OVER + 得分 + 重新开始提示
- `addScoreEffect()` / `drawScoreEffects()` / `clearScoreEffects()`：得分动效系统

### 13. [js/audio.js](web-game/js/audio.js)
音效合成模块，使用 Web Audio API 程序化合成 10 种音效：
- `resumeAudio()`：激活 AudioContext
- `playShoot()`：子弹发射
- `playEnemyDestroySmall()` / `playEnemyDestroyMedium()` / `playEnemyDestroyBig()`：敌机摧毁
- `playHeal()` / `playFirepower()` / `playShield()` / `playSpread()`：道具拾取
- `playHit()`：玩家扣血
- `playGameOver()`：游戏结束

---

## 六、运行方式

### 本地服务器（必须）
由于使用 ES Module，必须通过 HTTP 服务器访问（不支持 `file://` 协议）：

```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx http-server -p 8080
```

然后访问 `http://localhost:8080`。

### 操作说明
- **PC 端**：移动鼠标控制战机；鼠标移出画布暂停
- **移动端**：手指触摸滑动控制战机
- **开始游戏**：加载完成后点击画布开始
- **重新开始**：游戏结束后点击画布

---

## 七、项目注意事项

### 1. 已知问题与待优化项
- **主循环使用 `setInterval(gameEngine, 50)`**：建议替换为 `requestAnimationFrame` 以获得更流畅的动画

### 2. 兼容性说明
- 画布尺寸上限为 `480 × 650`，超过此尺寸的屏幕会留白
- 移动端需通过 `e.touches[0].pageX` 获取触摸坐标
- 不支持 Canvas 的浏览器会显示提示文字
- Web Audio API 需要用户交互后才能创建 AudioContext

### 3. 资源依赖
- 所有图片资源位于 `img/` 目录，路径硬编码为 `"img/" + src`
- 图片总数量 = `imgName.flat().length`，进度自动计算
- 无外部音频文件，音效全部由 Web Audio API 合成

### 4. 代码风格
- 采用 ES6+ 语法（`let`/`const`、`class`、`import`/`export`）
- 旧版 `app_v2.js` 保留但不再维护
- 注释以中文为主
- 命名混合驼峰与全大写常量（如 `gameScore` vs `PHASE_PLAY`）

### 5. 游戏平衡调整指南

所有数值参数集中在 `config.js`，修改对应字段即可调整游戏平衡：

```javascript
// 敌机属性
enemyConfig.big.hp = 70;           // 大型敌机 HP
enemyConfig.medium.hp = 15;        // 中型敌机 HP

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
```

**概率调整注意事项**：
- 优先判断的道具拥有独立概率区间（0~prob）
- 后续道具的区间受前置挤压，低概率道具应优先判断
- 总掉落概率可能超过 100%，但逐个判断不会重复掉落
- 动态概率公式：`prob = base + (1 - hpRatio) * bonus`

### 6. 扩展建议
- ~~引入模块化（ES Module）拆分 `app_v2.js`~~ ✅ 已完成
- ~~增加音效系统~~ ✅ 已完成（Web Audio API，10 种音效）
- ~~增加道具系统~~ ✅ 已完成（4 种道具 + 动态概率）
- ~~增加血量系统~~ ✅ 已完成（3 HP + 血条 + 回血动效）
- ~~增加 Buff 系统~~ ✅ 已完成（双倍火力 + 护盾 + 散弹）
- ~~配置集中管理~~ ✅ 已完成（config.js）
- ~~分数独立模块~~ ✅ 已完成（score.js）
- 使用 `requestAnimationFrame` + 时间步长替代 `setInterval`
- 增加难度递增机制
- 增加更多敌机行为模式（横向移动、射击等）

---

## 八、版本信息

- **当前版本**：v2（模块化重构版 + 道具/Buff 系统）
- **架构**：ES Module 模块化
- **模块数量**：11 个（含 config.js、score.js）
- **最后更新**：见 Git 提交历史
- **维护状态**：基础功能完整，存在优化空间
