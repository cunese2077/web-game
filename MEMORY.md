# 项目开发问题记录与注意事项

## 遇到的问题

### 问题一：游戏卡在 100% 加载界面，无法进入游戏

**现象**：页面显示资源加载进度到 100% 后，不再有任何响应。

**根因**：模块拆分时 `engine.js` 的 `start()` 使用了 `ctx`，但 import 只导入了 `canvas`，遗漏了 `ctx`，导致 `ReferenceError` 中断初始化。

**修复**：补充 `import { canvas, ctx } from "./canvas.js"`

---

### 问题二：击败敌机后分数未增加

**现象**：击毁敌机后 SCORE 始终为 0。

**根因**：原代码直接修改全局 `gameScore`，拆分后 `enemy.js` 未调用 `addGameScore()`。

**修复**：在 `enemy.js` 中 `import { addGameScore } from "./score.js"` 并在击毁时调用。

---

### 问题三：图片加载进度计算错误

**现象**：增减图片后进度可能永远到不了 100%，或超过 100%。

**根因**：`progress += 3` 硬编码，图片总数变化后 1 + N * 3 ≠ 100。

**修复**：改为 `progress += 100 / totalImages`，动态计算图片总数。

---

### 问题四：游戏重新开始时重复绑定事件

**现象**：重启游戏后移动一次触发多次回调，性能下降。

**根因**：每次 `new Hero()` 都调用 `_bindEvents()` 重复绑定 `mouseMove`/`touchMove`。

**修复**：事件绑定提取为模块级 `bindEventsOnce()`，用 `eventsBound` 标志只绑定一次，`activeHero` 引用最新实例。

---

### 问题五：alert 阻塞主线程

**现象**：游戏结束时 `alert` 弹窗阻塞主线程，无法绘制结束 UI。

**修复**：改为画布内绘制 GAME OVER 界面，点击画布重新开始。

---

### 问题六：遍历数组时删除元素导致跳过项

**现象**：`bullet.js` 的 `drawBullet()` 正序遍历 + `splice` 删除会跳过相邻元素。

**修复**：改为逆序遍历，与 `enemy.js` 保持一致。

---

### 问题七：碰撞检测提前返回导致只能拾取一个道具

**现象**：同一帧多个道具与英雄碰撞时只拾取第一个。

**修复**：`Item.checkCollision()` 不再提前 return，收集所有碰撞道具后返回拾取数量。

---

### 问题八：击败敌机分数重复增加

**现象**：击败一个敌机连续触发多次分数增加事件。

**根因**：
1. `hit()` 方法中 `lives <= 0` 触发 `die = true` 后**没有 break**，同帧后续子弹继续命中
2. `draw()` 死亡动画期间仍调用 `hit()`，后续帧子弹继续打爆炸中的敌机
3. 双倍火力 `damageMultiplier=2` 时，50HP 敌机 25 发子弹，第一发致死其余全触发

**修复**：
1. `hit()` 开头加 `if (this.die) return;` 保护
2. 死亡判定块内加 `break` 跳出子弹循环

---

### 问题九：TypeScript 迁移中区分联合类型收窄问题

**现象**：`enemy.ts` 中 `_updateHorizontalPosition()` 访问 `config.frequency` 时 TS 报错"ZigzagMoveConfig 上不存在 frequency"。

**根因**：`this.speed === enemyConfig.medium.speed ? enemyConfig.medium.move : enemyConfig.big.move` 返回联合类型 `SineMoveConfig | ZigzagMoveConfig`，TS 无法通过运行时条件收窄。

**修复**：`moveType === "sine"` 分支直接使用 `enemyConfig.medium.move`（类型为 `SineMoveConfig`），`moveType === "zigzag"` 分支直接使用 `enemyConfig.big.move`（类型为 `ZigzagMoveConfig`），避免联合类型收窄问题。

### 问题十：连续升级只回血 1 HP

**现象**：一次获得大量经验连续升多级时，`_checkLevelUp()` 只触发一次 HP 回血（固定 +1），且无 HP 加成的等级升级时完全不回血。

**根因**：
1. 回血量硬编码为 `this.hp + 1`，未按升级次数累计
2. 回血逻辑被包在 `if (newMaxHp > this.maxHp)` 条件内，只有 HP 加成等级才回血

**修复**（`hero.ts` 的 `_checkLevelUp()`）：
- 用 `levelsGained = currentLevel - this.lastLevel` 计算实际升级次数
- 回血改为 `this.hp + levelsGained`（连续升 N 级回 N HP）
- `maxHp` 改为无条件赋值（按当前等级累计 HP 加成更新）
- 回血逻辑移出 maxHp 条件块，确保每次升级都回血

---

## 问题共性分析

所有问题的本质可归为以下几类：

1. **模块拆分遗漏**：拆分时遗漏了跨模块的依赖关系（import 遗漏、全局变量修改未替换为函数调用）
2. **原代码逻辑缺陷**：硬编码进度、重复事件绑定、阻塞式 UI、正序 splice 删除、提前 return
3. **状态保护不足**：敌机死亡后缺少状态守卫（`die` 标志未在 `hit()` 入口检查），导致重复触发
4. **类型收窄问题**：区分联合类型（Discriminated Union）需通过 `type` 字段或直接引用具体子类型来收窄
5. **批量操作遗漏**：连续升级等批量操作未按次数累计奖励（如回血量硬编码而非按升级次数计算）

---

## 后续开发注意事项

### 1. 模块拆分检查清单
- [ ] 每个模块中使用的变量/函数是否都已通过 import 引入
- [ ] 原来直接修改全局变量的操作是否已替换为模块导出的函数调用
- [ ] 模块间的循环依赖是否已处理
- [ ] 事件绑定中引用的外部变量是否在模块作用域内可访问

### 2. 依赖关系梳理方法
- 拆分前先画出变量/函数的依赖关系图
- 标记每个变量被哪些模块「读取」、哪些模块「修改」
- 「修改」操作必须封装为函数并通过 export 暴露

### 3. 测试验证
- 模块拆分后必须逐阶段测试：资源加载 → 准备界面 → 加载动画 → 游戏进行 → 暂停 → 游戏结束 → 重新开始
- 重点验证跨模块数据流动：计分、生命值、碰撞检测、道具拾取
- 使用浏览器 Console 确认无 `ReferenceError` 或 `TypeError`

### 4. 避免循环依赖
当前模块依赖链（TypeScript 源码，含等级模块）：
```
types.ts（类型定义 + 阶段常量）
   ↓
constants.ts（re-export from types.ts）
config.ts（导入 types.ts 接口）
   ↓
level.ts（导入 config.ts, types.ts）  ← 独立模块
   ↓
engine.ts → hero.ts → bullet.ts, resources.ts, canvas.ts, level.ts
engine.ts → enemy.ts → hero.ts (getHeroHp/getHeroMaxHp/getHeroBuffs), item.ts, ui.ts, audio.ts, config.ts, level.ts
engine.ts → ui.ts → score.ts, level.ts
hero.ts → item.ts, audio.ts, config.ts, level.ts
bullet.ts → audio.ts, hero.ts
enemy.ts → config.ts (动态概率函数 + bulletConfig), level.ts (addExp/getExpReward/getLevelBonuses)
```

### 5. 数组遍历删除
- 遍历数组并删除元素时，**必须使用逆序遍历**（`for i = length-1; i >= 0; i--`）
- 正序 `splice` 会导致索引前移，跳过相邻元素

### 6. 音效系统注意
- Web Audio API 的 `AudioContext` 必须在用户交互后创建/恢复，否则浏览器会阻止
- `resumeAudio()` 在用户首次点击画布时调用
- 连续触发的音效（如射击）需加冷却帧数，避免音效叠加刺耳
- 游戏结束等单次音效需用标志位防止每帧重复播放

### 7. 状态守卫
- 敌机 `hit()` 入口必须检查 `this.die`，防止死亡后重复触发得分/掉落/音效
- 死亡判定后必须 `break` 跳出子弹循环，防止同帧多子弹重复命中

### 8. 配置管理
- 所有游戏数值参数集中在 `config.ts`，方便后期调优
- 修改道具掉落概率、buff 持续时间、敌机 HP 等参数只需修改 `config.ts` 对应字段
- 动态概率函数统一使用 `base + (1 - hpRatio) * bonus` 公式
- **概率判断顺序**：优先判断的道具拥有独立概率区间（0~prob），后续道具的区间受前置挤压，因此**低概率道具应优先判断**或确保基础概率足够高

### 9. 游戏平衡调优记录

#### 第一轮调整（基础平衡）
- 大型敌机 HP: 50 → 70
- 中型敌机 HP: 10 → 15
- 双倍火力持续时间: 15秒 → 10秒
- 护盾持续时间: 30秒 → 15秒
- 散弹持续时间: 10秒 → 6秒

#### 第二轮调整（动态概率系统）
- 所有道具掉落概率改为根据玩家血量动态调整
- 保护型道具（回血、护盾）：血量低时概率↑
- 攻击型道具（火力、散弹）：血量高时概率↑

#### 第三轮调整（护盾概率优化）
- 问题：护盾判断排在回血之后，概率区间被挤压
- 修复：护盾优先判断，确保有独立概率区间
- 大型敌机护盾概率：12%→30%（满血），25%→50%（空血）
- 中型敌机新增护盾掉落：8%（满血）→ 12%（空血）

#### 第四轮调整（方案四：组合提升护盾频率）
- 大型敌机护盾：shieldBase 0.12→0.30, shieldBonus 0.13→0.20
- 中型敌机新增护盾：shieldBase 0.08, shieldBonus 0.04
- 整体护盾出现频率提升 5~8 倍

#### 第五轮调整（敌机横向移动）
- 中型敌机新增正弦摆动（sine）：amplitude=40px, frequency=0.03
- 大型敌机新增锯齿形移动（zigzag）：horizontalSpeed=1px/帧，到边界反弹
- 小型敌机保持直线下落（straight）
- 中型敌机移动增加了躲避难度，大型敌机移动增加了命中难度

#### 第六轮调整（等级成长速度重构）
- 问题：原参数 base=20, growth=3, exponent=1.5 导致成长过快，满级仅需约 3.5 分钟
- 根因：base 过低（开局几秒升级）、growth 在低等级增量微弱、1.5 次方曲线前期太平缓、敌机经验奖励相对偏高
- 修复：
  - base: 20 → 450（大幅提高起步门槛）
  - growth: 3 → 30（每级递增基数提高）
  - exponent: 1.5(硬编码) → 1.0(配置化，线性增长)
  - 敌机经验：small 8→7, medium 25→20, big 120→100
  - LevelConfig 接口新增 exponent 字段，level.ts 的 expToNext 改用 levelConfig.exponent
- 新节奏：10级约4分钟，20级约8分钟，满级约15分钟
- 线性曲线（exponent=1.0）优势：前期平稳起步，后期不过陡，绝对耗时仍递增

#### 第七轮调整（敌机血量条与受击动效）
- 问题：敌机已有 lives 属性和扣血逻辑，但缺少血量条 UI 和受击视觉/音效反馈，玩家无法感知是否击中
- 新增内容：
  - types.ts 新增 `HpBarConfig`（血量条配置）和 `HitEffectConfig`（受击动效配置）接口
  - config.ts 三种敌机新增 `hpBar` 配置字段（show/offsetY/height/颜色/阈值），新增全局 `hitEffect` 配置
  - enemy.ts 新增 `maxLives`/`hitFlash`/`hitSoundCoolDown` 属性和 `_drawHpBar()` 方法
  - hit() 未死亡分支新增：触发闪烁（hitFlash）+ 播放受击音效（6帧冷却防抖）
  - draw() 新增：受击闪烁覆盖层、血量条绘制（绿→黄→红三色）、冷却递减
- 配置化设计：血量条参数每种敌机独立配置，受击动效全局共用，均通过 config.ts 调整
- 影响验证：碰撞检测、死亡逻辑、得分/经验/掉落、其他模块均未受影响

#### 第八轮调整（敌机受击音效独立化 + 移除白色蒙层）
- 问题一：受击白色蒙层体验差，移除了 hitFlash 相关代码（属性、draw 闪烁覆盖、config flashFrames/flashColor）
- 问题二：敌机受击复用了 playHit()（玩家扣血音效，4 层厚重音效），导致敌机击打音效过大，淹没玩家扣血反馈
- 修复：audio.ts 新增 `enemyHit` 配置（三角波 900→500Hz，40ms，音量 0.06）和 `playEnemyHit()` 函数
- enemy.ts 将 `playHit()` 替换为 `playEnemyHit()`，player 扣血仍使用 `playHit()`
- 音效区分：敌机受击=轻量短促"叮"声（0.06 音量），玩家扣血=厚重警报音（0.4~0.5 音量）

#### 第九轮调整（敌机血量数字显示 + 伤害浮动动效）
- 需求：敌机需要显示具体血量数字，且每次攻击命中需有伤害扣除动效
- 新增内容：
  - types.ts 新增 `DamageTextConfig` 接口，`HpBarConfig` 增加 `showText` 字段，`HitEffectConfig` 增加 `damageText` 字段
  - config.ts 中型/大型敌机 `hpBar.showText = true`（小型 1HP 不显示），`hitEffect.damageText` 配置（14px 白色，上浮 30px，25 帧）
  - enemy.ts `_drawHpBar()` 新增血量数字绘制（"当前HP/最大HP"，10px 白字带阴影）
  - enemy.ts `hit()` 未死亡分支新增 `addDamageEffect()` 调用，显示 "-X" 伤害浮动数字
  - ui.ts 新增 `DamageEffectObj` 类和 `addDamageEffect()`/`drawDamageEffects()`/`clearDamageEffects()` 函数
  - engine.ts 游戏循环调用 `drawDamageEffects()`，重置时调用 `clearDamageEffects()`
- 多模块验证：碰撞检测、死亡逻辑、得分/经验/掉落、音效、其他模块均未受影响

#### 第十轮调整（伤害动效防重叠 + 样式调优）
- 问题：大型敌机 HP 高、移动慢、子弹射速快（3帧/发），伤害动效持续 25 帧导致同时约 8 个动效堆叠重叠
- 初始方案（已废弃）：添加 15 帧冷却阻止动效生成 → 导致大型敌机只出现一次扣血文本，严重影响体验
- ~~最终修复：移除冷却机制，改为每次击中均生成伤害动效，通过水平随机偏移（±15px）避免位置重叠~~（已迭代，见第十一轮）
- 样式调优：伤害数字字号 14→18，颜色白色→红色(#f44)，小型敌机血量数字 showText 从 false 改为 true
- 多模块验证：音效冷却独立运作不受影响，碰撞/死亡/得分/掉落逻辑无变化

#### 第十一轮调整（伤害动效防重叠 - 运行时调试定位根因）
- 问题：第十轮的水平随机偏移未解决竖直方向重叠，大型/中型敌机伤害文本仍重叠
- 迭代过程（水平偏移 → 纵向固定偏移 → 找空槽算法 → 单帧伤害合并 → 找空槽+跳过兜底）
- 使用 TRAE-debugger 收集运行时证据，定位真正根因：
  - 根因1（单帧多弹）：spread buff 5 颗子弹同帧命中大型敌机产生 5 个动效 → 修复：单帧伤害合并，累积总伤害显示一个文本
  - 根因2（屏幕外动效占位）：动效上浮跑出屏幕顶部（curY 负数）后仍占用空槽，新动效找不到空槽兜底重叠 → 修复：只收集 curY >= 0 的可见动效参与堆叠计算
  - 根因3（连续命中间距过小）：敌机下移 2px/帧，子弹间隔 3 帧，连续命中动效起始 y 间距仅 ~6px << stackOffset，向上找空槽很快跑出屏幕顶部 → 修复：兜底时跳过本次显示（return），不产生新动效
- 最终方案（ui.ts addDamageEffect）：
  - visibleCeiling = 0（只收集屏幕内可见动效）
  - searchStartY = max(y, 0)（敌机在屏幕外时从 0 开始搜索）
  - 候选位置限制 y >= 0，找到与所有可见动效距离 >= stackOffset 的空槽
  - 找不到空槽则 return 跳过（不兜底，避免重叠）
- 配套调整：stackOffset 35→22（略大于字号 18px，过大会导致跳过频繁）
- DamageTextConfig 移除 offsetRange，新增 stackOffset 字段
- 多模块验证：碰撞/死亡/得分/经验/掉落/音效均未受影响

#### 第十二轮调整（伤害文本位置 - 顶部改底部）
- 问题：伤害文本起始位置用敌机顶部 this.y，大型敌机从屏幕顶部进入时顶部在屏幕外，文本被压到屏幕边缘（y=0）而敌机身体在下方，玩家看不到
- 修复：enemy.ts 中 addDamageEffect 的 y 参数从 this.y 改为 this.y + this.height（敌机底部）
- 原因：大型敌机从顶部进入时底部先可见，用底部保证文本始终在可见区域；也更符合"子弹从下方射上击中敌机底部"的直觉
- 配合 ui.ts 的 searchStartY = max(y, 0)，敌机底部在屏幕外时从 y=0 开始搜索空槽
- 多模块验证：仅改 addDamageEffect 调用参数，防重叠算法、碰撞、死亡等逻辑均未受影响

#### 第十三轮新增（玩家属性面板 - 左下角常驻显示）
- 需求：给玩家战机增加属性显示，方便玩家掌握成长状态。调研对比"常驻面板"vs"交互弹窗"两个方案
- 选择常驻面板的理由：画布小(480×650)但左下空闲；成长反馈需持续可见（升级时立刻看到数值变化）；移动端触屏交互弹窗易误触
- 实现：hero.ts 新增 _drawStats() 方法，draw() 中调用（dying 分支不调用，死亡时自动隐藏）
- 显示内容（3 行，半透明黑底圆角矩形）：
  - ATK 子弹伤害：黄色，火力 buff 激活时变橙色高亮，数值实时翻倍
  - RATE 射击间隔：浅蓝标签 + 白色数值（越小越快）
  - BUFF 持续倍率：紫色标签，仅 >1 时显示（21 级前隐藏，避免干扰）
- 动态反馈：升级瞬间（levelUpAnim > 0，60 帧）面板边框变金黄色、背景透明度提高
- 数值来源：直接读 this.levelBonuses 和 this.buffs，与 enemy.ts hit() 伤害计算逻辑一致，无新状态无副作用
- 新增导入：bulletConfig（用于 baseDamage）
- 多模块验证：仅新增绘制方法，未修改任何现有逻辑（hit/collision/level/buff/score），textAlign 末尾恢复 left

### 10. TypeScript 开发注意

- **源码目录**：`src/`，编译输出目录：`js/`（勿手动修改）
- **构建命令**：`npm run build`（编译）、`npm run watch`（监听）
- **禁止 `any`**：所有类型必须使用具体类型定义
- **区分联合类型收窄**：当访问联合类型特有属性时，直接引用具体子类型而非通过条件推断
  - 例：`moveType === "sine"` 时直接用 `enemyConfig.medium.move`（类型 `SineMoveConfig`），而非 `enemyConfig[...].move`（联合类型）
- **DOM 类型断言**：`document.getElementById("canvas") as HTMLCanvasElement`、`canvas.getContext("2d") as CanvasRenderingContext2D`
- **AudioContext 兼容**：`webkitAudioContext` 通过 `window as unknown as { webkitAudioContext: ... }` 类型断言
- **事件类型**：鼠标/触摸联合事件用 `e instanceof MouseEvent` 收窄
- **阶段常量**：定义在 `types.ts` 中用 `as const`，`constants.ts` re-export，`GamePhase` 类型为 `1|2|3|4|5|6`
- **BuffState 迭代**：`_tickBuffs()` 使用 `const keys: (keyof BuffState)[]` 确保类型安全

### 11. 等级系统注意

- **独立模块**：`level.ts` 仅依赖 `config.ts` + `types.ts`（type-only），与 `hero.ts` 无循环依赖
- **升级检测**：`hero.ts` 的 `_checkLevelUp()` 每帧比较 `getLevel()` 与 `this.lastLevel`，检测到升级时应用属性加成
- **经验曲线**：`expToNext(lv) = base + growth × (lv - 1)^exponent`，exponent 已配置化（当前 1.0=线性），满级约 15 分钟
- **属性加成全配置化**：所有等级奖励规则从 `levelConfig.bonuses` 读取，`level.ts` 无硬编码数值
  - HP 加成：`bonuses.hpBonusLevels` 数组指定触发等级点
  - 子弹伤害：`bonuses.damageBonus.perLevel` 每级增量，`maxLevel` 封顶
  - 射击间隔：`bonuses.bulletInterval`（perLevels/reduction/startLevel/endLevel）区间触发
  - Buff 持续倍率：`bonuses.buffDuration`（perLevels/multiplier/startLevel/endLevel）区间触发
  - 修改任何奖励只需调整 `config.ts` 的 `levelConfig.bonuses` 字段
- **伤害计算**：`baseDamage + extraDamage` 作为基础，再乘以 firepower buff 倍率
- **升级回血**：每次升级回复 1 HP，连续升 N 级则回 N HP（不超过 maxHp）；maxHp 按当前等级累计 HP 加成无条件更新
- **重置**：`engine.ts` 重新开始时调用 `resetLevel()`，等级归 1
- **满级行为**：30 级后 `addExp()` 不再累积，`getExpToNext()` 返回 0，经验条显示 "MAX"
