# 飞机大战（PlaneWar）项目说明

> 基于 H5 Canvas 实现的飞机大战网页游戏 ✈️

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
- **自动射击**：战机自动发射三路子弹（左、中、右）
- **敌机生成**：随机生成三种不同体型、速度、生命值的敌机（概率随玩家血量动态调整）
- **碰撞检测**：子弹与敌机、敌机与战机的碰撞判定
- **爆炸动画**：敌机和战机被击毁时播放逐帧爆炸动画
- **计分系统**：击毁不同敌机获得不同分数（10/20/100），带浮动得分动效
- **血量系统**：玩家战机 3 HP，受伤后 2 秒无敌时间，底部血条显示
- **恢复道具**：击败大型敌机后概率掉落心形道具，拾取恢复 1 HP（满血不拾取）
- **音效系统**：Web Audio API 程序化合成 7 种音效
- **暂停/恢复**：鼠标移出画布自动暂停
- **滚动背景**：背景图无缝循环滚动，营造飞行感

### 3. 敌机类型与生成逻辑

| 类型 | 速度 | 生命值 | 击毁得分 | 爆炸帧数 | 基础出现概率 |
| ---- | ---- | ------ | -------- | -------- | ------------ |
| 小型敌机（enemy1） | 6 | 1 | 10 | 4 | 高（剩余概率） |
| 中型敌机（enemy2） | 4 | 10 | 20 | 4 | 中（30%） |
| 大型敌机（enemy3） | 2 | 50 | 100 | 6 | 低（动态 5%~10%） |

**动态概率机制**（`enemy.js` 的 `getDynamicProbabilities()`）：

大型敌机出现概率和道具掉落概率根据玩家当前血量动态调整：

| 玩家血量比例 | 大型敌机概率 | 道具掉落概率 |
| ----------- | ----------- | ----------- |
| 满血 (3/3) | 5% | 30% |
| 半血 (2/3) | ~7.5% | ~47% |
| 低血 (1/3) | ~8.75% | ~63% |
| 濒死 (0/3) | 10% | 80% |

**大型敌机冷却机制**：生成一个大型敌机后，40 帧（约 2 秒）内不会再生成大型敌机，避免连续出现多个大型敌机。

### 4. 恢复道具系统

- **触发条件**：击败大型敌机（speed=2）后，按动态概率掉落
- **外观**：红色心形，带呼吸动画（缩放）+ 外发光效果
- **行为**：以 2px/帧 速度下落，超出画布自动移除
- **拾取**：与玩家战机矩形碰撞检测，拾取后 HP+1（不超过 maxHp）
- **拾取反馈**：`+1 HP` 浮动文字 + 绿色光环扩散 + 血条闪烁
- **多人拾取**：同一帧可拾取多个道具，返回拾取数量

### 5. 血量系统

| 属性 | 值 | 说明 |
| ---- | --- | ---- |
| maxHp | 3 | 最大血量 |
| hp | 3 | 当前血量 |
| 无敌帧数 | 40 | 受伤后约 2 秒无敌 |
| 闪烁表现 | 透明度交替 | 无敌期间战机闪烁 |

受伤时扣 1 HP，进入无敌状态；HP 归零时进入 dying 状态，播放爆炸动画后 GAMEOVER。

### 6. 音效系统

使用 Web Audio API 程序化合成，无需外部音频文件：

| 音效 | 合成方式 | 触发时机 | 备注 |
| ---- | -------- | -------- | ---- |
| 子弹发射 | 正弦波 1200→600Hz | `Bullet.add()` | 6 帧冷却防叠加 |
| 小型敌机摧毁 | 锯齿波+噪声 0.1s | 敌机 speed=6 被击毁 | |
| 中型敌机摧毁 | 锯齿波+噪声 0.2s | 敌机 speed=4 被击毁 | |
| 大型敌机摧毁 | 双振荡器+噪声 0.4s | 敌机 speed=2 被击毁 | |
| 拾取道具 | C5-E5-G5 上升和弦 | 拾取恢复道具 | |
| 玩家扣血 | 噪声+重击+嗡鸣+蜂鸣 | 碰撞敌机扣 HP | 四层叠加 |
| 游戏结束 | G4-F4-E4-C4 下降音阶 | 进入 GAMEOVER | 仅播放一次 |

**AudioContext 策略**：延迟初始化，用户首次点击画布时 `resumeAudio()` 激活。

---

## 三、技术实现

### 1. 技术栈
- **渲染层**：HTML5 Canvas 2D Context
- **脚本语言**：原生 JavaScript（ES6+，ES Module）
- **模块架构**：`js/` 目录下 9 个模块
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
- `Hero`：玩家战机，负责绘制、子弹生成、碰撞检测、血量管理
- `Hullet`：子弹，含位置、移动、出界标记
- `Enemy`：敌机，含动态概率生成、爆炸动画、与子弹碰撞检测
- `Item`：恢复道具，心形动画、下落、碰撞拾取
- `ScoreEffect`：得分动效，浮动文字+发光

#### （4）碰撞检测
- **子弹 vs 敌机**：AABB 矩形碰撞检测
- **敌机 vs 战机**：基于重叠点的碰撞判定
- **道具 vs 战机**：矩形碰撞，支持同帧拾取多个道具

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
│   ├── constants.js              # 游戏阶段常量定义
│   ├── canvas.js                 # 画布初始化与导出
│   ├── resources.js              # 图片资源加载与管理
│   ├── hero.js                   # 玩家战机类 + 血量系统 + 分数管理
│   ├── bullet.js                 # 子弹类
│   ├── enemy.js                  # 敌机类 + 动态概率生成 + 冷却机制
│   ├── item.js                   # 恢复道具类 + 碰撞拾取
│   ├── ui.js                     # UI 绘制 + 得分动效系统
│   ├── audio.js                  # 音效合成模块（Web Audio API）
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

### 3. [js/constants.js](web-game/js/constants.js)
游戏阶段常量定义，导出 6 个阶段常量。

### 4. [js/canvas.js](web-game/js/canvas.js)
画布初始化模块，导出 `width`/`height`/`canvas`/`ctx`。

### 5. [js/resources.js](web-game/js/resources.js)
图片资源加载与管理，导出：
- `download(callback)`：动态计算进度加载所有图片
- 各图片资源对象/数组

### 6. [js/hero.js](web-game/js/hero.js)
玩家战机类 `Hero`，负责：
- 战机绘制与双帧动画切换
- 自动发射三路子弹
- 定时生成敌机
- 与敌机碰撞检测（扣 HP + 无敌帧 + 闪烁）
- 血条绘制（右下角，颜色随血量变化）
- 回血动效（浮动文字 + 光环 + 血条闪烁）
- 道具碰撞拾取
- 分数管理：`getGameScore()` / `resetGameScore()` / `addGameScore()`
- 事件绑定：`bindEventsOnce()` 只绑定一次

### 7. [js/bullet.js](web-game/js/bullet.js)
子弹类 `Hullet`，负责：
- 子弹绘制与移动（含三路偏移）
- 出界标记移除（逆序遍历）
- 射击音效（6 帧冷却）

### 8. [js/enemy.js](web-game/js/enemy.js)
敌机类 `Enemy`，负责：
- 三种敌机动态概率生成（`getDynamicProbabilities()`）
- 大型敌机 40 帧冷却机制
- 敌机移动与爆炸动画
- 与子弹碰撞检测、计分、得分动效、摧毁音效
- 道具掉落逻辑

### 9. [js/item.js](web-game/js/item.js)
恢复道具类 `Item`，负责：
- 心形道具绘制（呼吸动画 + 发光）
- 下落移动与出界移除
- 碰撞拾取检测（返回拾取数量，支持同帧多拾取）

### 10. [js/ui.js](web-game/js/ui.js)
UI 绘制模块，导出：
- `paintBg()`：返回闭包函数，实现无缝滚动背景
- `paintLogo()`：绘制开始界面 logo
- `loading()`：返回加载动画函数
- `drawPause()`：居中绘制暂停图标
- `drawGameOver()`：画布内绘制 GAME OVER + 得分 + 重新开始提示
- `addScoreEffect()` / `drawScoreEffects()` / `clearScoreEffects()`：得分动效系统

### 11. [js/audio.js](web-game/js/audio.js)
音效合成模块，使用 Web Audio API 程序化合成 7 种音效：
- `resumeAudio()`：激活 AudioContext
- `playShoot()`：子弹发射
- `playEnemyDestroySmall()` / `playEnemyDestroyMedium()` / `playEnemyDestroyBig()`：敌机摧毁
- `playHeal()`：拾取道具
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
- ⚠️ **主循环使用 `setInterval(gameEngine, 50)`**：建议替换为 `requestAnimationFrame` 以获得更流畅的动画

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

### 5. 扩展建议
- ~~引入模块化（ES Module）拆分 `app_v2.js`~~ ✅ 已完成
- ~~增加音效系统~~ ✅ 已完成（Web Audio API）
- ~~增加道具系统~~ ✅ 已完成（恢复道具）
- ~~增加血量系统~~ ✅ 已完成（3 HP + 血条）
- 使用 `requestAnimationFrame` + 时间步长替代 `setInterval`
- 增加更多道具类型（双倍火力、护盾等）
- 增加难度递增机制
- 将分数抽取为独立 `score.js` 模块，避免循环依赖风险
- 将音效参数提取为配置对象，方便调优

---

## 八、版本信息

- **当前版本**：v2（模块化重构版）
- **架构**：ES Module 模块化
- **最后更新**：见 Git 提交历史
- **维护状态**：基础功能完整，存在优化空间
