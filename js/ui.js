// UI 门面模块：统一 re-export 各 UI 子模块，保持 engine.ts / enemy.ts 的 import 路径不变
// 实际实现已按职责拆分（函数签名与拆分前完全一致）：
//   effects.ts        战斗特效（得分动效 + 伤害浮动动效）
//   startScreen.ts    开始屏（滚动背景 / 标题界面 / 加载动画 / 底部按钮区）
//   settingsPanel.ts  设置面板（绘制 + 点击处理 + 下拉面板）
//   pausePanel.ts     暂停面板
//   gameOverPanel.ts  结算面板（得分/Build 摘要/成就 + 入场动画）
//   gameDataPanel.ts  游戏数据面板（成就列表 + 对局记录分页表 + Tooltip）
export { addScoreEffect, drawScoreEffects, clearScoreEffects, addDamageEffect, drawDamageEffects, clearDamageEffects } from "./effects.js";
export { paintBg, paintLogo, loading, getSettingsBtnArea, getGameDataBtnArea } from "./startScreen.js";
export { drawSettings, handleSettingsClick } from "./settingsPanel.js";
export { drawPause, getPauseBackBtnArea } from "./pausePanel.js";
export { drawGameOver, getGameOverBackBtnArea, resetGameOverAnim } from "./gameOverPanel.js";
export { isGameDataOpen, openGameData, closeGameData, drawGameData, handleGameDataClick, setMousePosition } from "./gameDataPanel.js";
