# 飞机大战（PlaneWar）项目说明

> 基于 H5 Canvas 实现的飞机大战网页游戏 ✈️

---

## 一、项目概述

本项目是一个使用纯原生 HTML5 Canvas + JavaScript 实现的网页版飞机大战游戏，无需任何框架和依赖，打开 `index.html` 即可运行。玩家通过鼠标或触摸控制己方战机，发射子弹击毁敌机获取分数。

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
| `PHASE_GAMEOVER` | 6 | 游戏结束阶段 |

### 2. 核心玩法
- **战机控制**：鼠标移动 / 手指触摸控制己方战机位置
- **自动射击**：战机自动发射三路子弹（左、中、右）
- **敌机生成**：随机生成三种不同体型、速度、生命值的敌机
- **碰撞检测**：子弹与敌机、敌机与战机的碰撞判定
- **爆炸动画**：敌机和战机被击毁时播放逐帧爆炸动画
- **计分系统**：击毁不同敌机获得不同分数（10/20/100）
- **暂停/恢复**：鼠标移出画布自动暂停
- **滚动背景**：背景图无缝循环滚动，营造飞行感

### 3. 敌机类型

| 类型 | 出现概率 | 速度 | 生命值 | 击毁得分 | 爆炸帧数 |
| ---- | -------- | ---- | ------ | -------- | -------- |
| 小型敌机（enemy1） | 高 | 6 | 1 击毙 | 10 | 4 帧 |
| 中型敌机（enemy2） | 中 | 4 | 10 | 20 | 4 帧 |
| 大型敌机（enemy3） | 低 | 2 | 50 | 100 | 6 帧（含受击图） |

---

## 三、技术实现

### 1. 技术栈
- **渲染层**：HTML5 Canvas 2D Context
- **脚本语言**：原生 JavaScript（ES5 风格）
- **页面结构**：单一 `index.html` + `app_v2.js`
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
        ├─ PHASE_PLAY     → pBg() + drawEnemy() + Hullet.drawHullet() + hero.draw()
        ├─ PHASE_PAUSE    → drawPause()
        └─ PHASE_GAMEOVER → gameover()
```

### 3. 关键技术点

#### （1）资源加载与进度显示
- 通过 `Image.onload` 事件累加 `progress`，绘制百分比文字
- 加载完成后自动进入 `PHASE_READY` 阶段

#### （2）滚动背景
- [app_v2.js](web-game/app_v2.js) 中的 `paintBg()` 使用闭包保存 `y` 偏移量
- 同时绘制两张背景图（一张正常位置，一张在上方），实现无缝循环滚动

#### （3）对象构造函数（基于原型）
- `Hero`：玩家战机，负责绘制、子弹生成、敌机生成调度、自身碰撞检测
- `Hullet`：子弹，含位置、移动、出界标记；`Hullet.drawHullet` 为静态方法批量绘制
- `Enemy`：敌机，含随机生成、爆炸动画、与子弹碰撞检测

#### （4）碰撞检测
- **子弹 vs 敌机**：AABB 矩形碰撞检测（[app_v2.js](web-game/app_v2.js) 中 `Enemy.prototype.hit`）
- **敌机 vs 战机**：基于重叠点的碰撞判定（`Hero` 的 `this.hit` 方法）

#### （5）数组清理机制
- 子弹和敌机使用 `removable` 标记位
- 遍历时检测标记并 `splice` 移除，避免数组膨胀
- `drawEnemy()` 采用从后向前遍历，确保删除时不影响未遍历元素的索引

#### （6）输入事件
- 同时绑定 `mousemove` 和 `touchmove`，兼容 PC 与移动端
- `canvas.onmouseout` 触发暂停

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
├── index.html                    # 页面入口，承载 canvas
├── app_v2.js                     # 游戏全部逻辑代码
├── README.md                     # 项目简介
├── .gitignore                    # Git 忽略配置
└── PROJECT_GUIDE.md              # 本文档
```

---

## 五、核心功能文件说明

### 1. [index.html](web-game/index.html)
页面入口文件，主要职责：
- 声明 `<canvas id="canvas">` 作为游戏画布
- 设置 `viewport` meta，禁用用户缩放（适配移动端）
- 全屏布局，隐藏溢出内容
- 引入 `app_v2.js` 启动游戏

### 2. [app_v2.js](web-game/app_v2.js)
游戏核心逻辑文件（约 457 行），包含以下模块：

| 模块 | 关键函数/对象 | 行号参考 | 作用 |
| ---- | -------------- | -------- | ---- |
| 画布初始化 | `canvas` / `ctx` | 1-9 | 获取并设置画布尺寸（最大 480×650） |
| 状态常量 | `PHASE_*` | 11-17 | 定义 6 个游戏阶段 |
| 资源定义 | `imgName` / `enemy1` 等 | 19-77 | 声明所有图片资源名及存储数组 |
| 资源加载 | `download()` | 80-118 | 加载图片并绘制进度百分比 |
| 游戏启动 | `start()` | 120-130 | 进入 READY 阶段，创建 Hero，启动引擎 |
| 背景绘制 | `paintBg()` | 132-142 | 闭包实现无缝滚动背景 |
| Logo 绘制 | `paintLogo()` | 144-146 | 绘制开始界面 logo |
| 加载动画 | `loading()` | 148-163 | 4 帧加载动画过渡 |
| 玩家战机 | `Hero()` | 166-237 | 战机绘制、子弹/敌机生成、碰撞检测、事件绑定 |
| 子弹 | `Hullet()` | 240-272 | 子弹构造与批量绘制 |
| 敌机 | `Enemy()` | 275-345 | 敌机构造、随机生成、爆炸动画、碰撞检测 |
| 敌机批量绘制 | `drawEnemy()` | 347-356 | 从后向前遍历清理并绘制敌机 |
| 暂停 | `drawPause()` | 358-360 | 居中绘制暂停图标 |
| 游戏结束 | `gameover()` | 362-368 | 弹窗显示成绩并重置 |
| 主引擎 | `gameEngine()` | 370-398 | 状态分发，调度各阶段渲染 |
| 主循环 | `setInterval(gameEngine, 50)` | 401 | 每 50ms 驱动一次游戏循环 |

---

## 六、运行方式

### 1. 直接打开
双击 `index.html` 在浏览器中打开即可运行。

### 2. 本地服务器（推荐）
由于浏览器对本地文件 `Image.onload` 的安全策略，建议通过本地服务器访问：

```bash
# Python 3
python3 -m http.server 8080

# Node.js（需安装 http-server）
npx http-server -p 8080
```

然后访问 `http://localhost:8080`。

### 3. 操作说明
- **PC 端**：移动鼠标控制战机；鼠标移出画布暂停
- **移动端**：手指触摸滑动控制战机
- **开始游戏**：加载完成后点击画布开始

---

## 七、项目注意事项

### 1. 已知问题与待优化项
- ⚠️ **主循环使用 `setInterval(gameEngine, 50)`**：代码中已标注 `TODO 启动定时器，待优化`，建议替换为 `requestAnimationFrame` 以获得更流畅的动画和更好的性能（代码中已注释掉 `requestAnimationFrame(gameEngine)`）。
- ⚠️ **全局变量过多**：`hero`、`hullet`、`liveEnemy`、`gameScore` 等均为全局变量，不利于维护和扩展。
- ⚠️ **`gameover()` 使用 `alert`**：会阻塞主线程，影响用户体验，建议改为画布内 UI 提示。
- ⚠️ **`Hero` 内部直接绑定事件**：每次 `new Hero()` 都会重复绑定 `mousemove`/`touchmove`，重启游戏后事件可能叠加。

### 2. 兼容性说明
- 画布尺寸上限为 `480 × 650`，超过此尺寸的屏幕会留白
- 移动端需通过 `e.touches[0].pageX` 获取触摸坐标
- 不支持 Canvas 的浏览器会显示提示文字「您的浏览器不支持canvas绘图!!!」

### 3. 资源依赖
- 所有图片资源位于 `img/` 目录，路径硬编码为 `"img/" + src`，移动文件需同步修改代码
- 图片总数量约 40 张，建议预加载以避免游戏中卡顿

### 4. 代码风格
- 采用 ES5 语法（`var`、构造函数 + `prototype`），未使用 ES6+ 特性
- 注释以中文为主，部分含幽默表达
- 命名混合驼峰与下划线（如 `gameScore` vs `PHASE_PLAY`）

### 5. 扩展建议
- 引入模块化（ES Module）拆分 `app_v2.js`
- 使用 `requestAnimationFrame` + 时间步长替代 `setInterval`
- 增加音效系统
- 增加道具系统（双倍火力、护盾等）
- 增加难度递增机制
- 重构为面向对象（ES6 Class）或 ECS 架构

---

## 八、版本信息

- **当前版本**：v2（文件名 `app_v2.js` 暗示）
- **最后更新**：见 Git 提交历史
- **维护状态**：基础功能完整，存在优化空间
