# 项目开发问题记录与注意事项

## 遇到的问题

### 问题一：游戏卡在 100% 加载界面，无法进入游戏

**现象**：页面显示资源加载进度到 100% 后，不再有任何响应，无法进入游戏准备界面。

**根因**：模块拆分时，`engine.js` 中 `start()` 函数使用了 `ctx.fillStyle` 和 `ctx.font`，但 import 语句只导入了 `canvas`，遗漏了 `ctx`。导致 `start()` 执行时抛出 `ReferenceError: ctx is not defined`，后续的 Hero 初始化、背景绘制函数创建等逻辑全部未执行，主循环 `gameEngine()` 中的 `pBg()`、`loadAnim` 均为 `null`，调用即报错，整个游戏流程中断。

**修复**：在 `engine.js` 的 import 中补充 `ctx`：
```js
// 修复前
import { canvas } from "./canvas.js";
// 修复后
import { canvas, ctx } from "./canvas.js";
```

---

### 问题二：击败敌机后分数未增加

**现象**：游戏可以正常运行，子弹击中敌机后敌机正常爆炸消失，但顶部 SCORE 始终为 0。

**根因**：原始 `app_v2.js` 中，击毁敌机时直接操作全局变量 `gameScore += ...`。模块化拆分后，`gameScore` 被收归到 `hero.js` 模块内部，通过 `addGameScore()` 函数管理。但在 `enemy.js` 的 `hit()` 方法中，只设置了 `this.score` 属性，并未调用 `addGameScore()` 将分数加到总分中，导致分数计算逻辑断裂。

**修复**：在 `enemy.js` 中导入 `addGameScore` 并在击毁时调用：
```js
import { addGameScore } from "./hero.js";

// hit() 方法中
if (--this.lifes === 0) {
  this.die = true;
  addGameScore(this.speed === 6 ? 10 : this.speed === 4 ? 20 : 100);
}
```

---

## 问题共性分析

两个问题的本质原因相同：**模块拆分时遗漏了跨模块的依赖关系**。

原始代码是单文件结构，所有变量和函数都在同一作用域内，可以直接访问。拆分为 ES Module 后，每个模块拥有独立作用域，必须通过 `import`/`export` 显式声明依赖。拆分过程中容易发生以下疏漏：

1. **变量/函数的导入遗漏**：原代码中隐式访问的变量（如 `ctx`、`gameScore`），拆分后未在新模块中显式 import
2. **副作用逻辑断裂**：原代码中直接修改全局变量的操作（如 `gameScore += ...`），拆分后未替换为对应的模块化接口调用（如 `addGameScore()`）

---

## 后续开发注意事项

### 1. 模块拆分检查清单
拆分单文件为多模块时，必须逐项检查：
- [ ] 每个模块中使用的变量/函数是否都已通过 import 引入
- [ ] 原来直接修改全局变量的操作是否已替换为模块导出的函数调用
- [ ] 模块间的循环依赖是否已处理（如 `enemy.js` → `hero.js` → `bullet.js`）
- [ ] 事件绑定中引用的外部变量是否在模块作用域内可访问

### 2. 依赖关系梳理方法
- 拆分前先画出变量/函数的依赖关系图
- 标记每个变量被哪些模块「读取」、哪些模块「修改」
- 「修改」操作必须封装为函数并通过 export 暴露，避免直接跨模块赋值

### 3. 测试验证
- 模块拆分后必须逐阶段测试：资源加载 → 准备界面 → 加载动画 → 游戏进行 → 暂停 → 游戏结束 → 重新开始
- 重点验证涉及跨模块数据流动的功能：计分、生命值、碰撞检测
- 使用浏览器开发者工具的 Console 面板，确认无 `ReferenceError` 或 `TypeError`

### 4. 避免循环依赖
当前模块依赖链：
```
engine.js → hero.js → bullet.js → resources.js → canvas.js
engine.js → enemy.js → hero.js (addGameScore)
engine.js → ui.js → hero.js (getGameScore, resetGameScore)
```
`hero.js` 和 `enemy.js` 之间存在双向依赖风险（`hero.js` 导入 `Enemy`，`enemy.js` 导入 `addGameScore`）。当前通过将分数管理函数独立导出避免了循环，但若后续增加更多交互，建议将共享状态（如分数）抽取为独立的 `score.js` 模块。

### 5. 代码审查要点
- 每个模块的 import 列表是否完整覆盖了该模块实际使用的所有外部符号
- export 列表是否覆盖了其他模块需要使用的所有符号
- 原代码中的全局变量赋值是否已全部替换为函数调用
