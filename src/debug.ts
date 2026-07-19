// 开发调试模块 — 仅在开发环境下启用
// Canvas 按钮面板，PC 和移动端均可点击操作
import { ctx, fontScale } from "./canvas.js";
import { addExp, getLevel, getExpToNext, getExp } from "./level.js";
import { triggerBossPhase } from "./engine.js";
import { levelConfig } from "./config.js";

// 调试模式开关：检测 URL 参数 ?debug 或 localhost
const DEBUG_MODE: boolean = _detectDebugMode();

// 调试面板可见性
let debugPanelVisible: boolean = true;

// 调试操作反馈（显示 120 帧后消失，20fps=6秒）
let debugInfo: string = "";
let debugInfoTimer: number = 0;

// 按钮定义
interface DebugButton {
  label: string;
  action: () => void;
  x: number;
  y: number;
  w: number;
  h: number;
}

let buttons: DebugButton[] = [];

function _detectDebugMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has("debug") || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function isDebugMode(): boolean {
  return DEBUG_MODE;
}

function isDebugPanelVisible(): boolean {
  return debugPanelVisible;
}

function getDebugInfo(): string {
  return debugInfo;
}

// ====== 调试操作 ======
// 注意：只调用 addExp()，不调用 addPendingLevelUps()
// 因为 hero._checkLevelUp() 会自动检测等级变化并累加 pendingLevelUps
// 如果这里也调用 addPendingLevelUps()，会导致双重累加（选两次道具卡池）

// 手动升级 1 级
function debugLevelUp(): void {
  if (!DEBUG_MODE) return;
  const currentLevel = getLevel();
  if (currentLevel >= levelConfig.maxLevel) return;
  const expNeeded = getExpToNext();
  const currentExp = getExp();
  const gain = Math.max(0, expNeeded - currentExp + 1);
  addExp(gain);
  _showInfo(`+1Lv → Lv${getLevel()}`);
}

// 手动增加 5 级
function debugLevelUp5(): void {
  if (!DEBUG_MODE) return;
  for (let i = 0; i < 5; i++) {
    const currentLevel = getLevel();
    if (currentLevel >= levelConfig.maxLevel) break;
    const expNeeded = getExpToNext();
    const currentExp = getExp();
    const gain = Math.max(0, expNeeded - currentExp + 1);
    addExp(gain);
  }
  _showInfo(`+5Lv → Lv${getLevel()}`);
}

// 直接跳到指定等级
function debugJumpToLevel(targetLevel: number): void {
  if (!DEBUG_MODE) return;
  const currentLevel = getLevel();
  if (targetLevel <= currentLevel || targetLevel > levelConfig.maxLevel) return;
  for (let i = currentLevel; i < targetLevel; i++) {
    const expNeeded = getExpToNext();
    const currentExp = getExp();
    const gain = Math.max(0, expNeeded - currentExp + 1);
    addExp(gain);
  }
  _showInfo(`Jump → Lv${getLevel()}`);
}

// 触发 BOSS
function debugTriggerBoss(): void {
  if (!DEBUG_MODE) return;
  triggerBossPhase();
  _showInfo("BOSS!");
}

function _showInfo(text: string): void {
  debugInfo = text;
  debugInfoTimer = 120;
}

// ====== Canvas 面板绘制 ======

function _buildButtons(): void {
  buttons = [];
  const fs = fontScale;
  const btnH = Math.round(22 * fs);
  const btnW = Math.round(44 * fs);
  const gap = Math.round(3 * fs);
  const padX = Math.round(4 * fs);
  const padY = Math.round(18 * fs); // 标题行高度

  // 第一行：+1Lv  +5Lv  BOSS
  const row1Y = padY;
  const labels1 = ["+1", "+5", "BOSS"];
  const actions1 = [debugLevelUp, debugLevelUp5, debugTriggerBoss];
  for (let i = 0; i < labels1.length; i++) {
    buttons.push({
      label: labels1[i],
      action: actions1[i],
      x: padX + i * (btnW + gap),
      y: row1Y,
      w: btnW,
      h: btnH,
    });
  }

  // 第二行：Lv5  Lv10  Lv20  Lv30
  const row2Y = row1Y + btnH + gap;
  const targets = [5, 10, 20, 30];
  const smallBtnW = Math.round(33 * fs);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    buttons.push({
      label: `Lv${t}`,
      action: () => debugJumpToLevel(t),
      x: padX + i * (smallBtnW + gap),
      y: row2Y,
      w: smallBtnW,
      h: btnH,
    });
  }

  // 第三行：隐藏面板按钮
  const row3Y = row2Y + btnH + gap;
  const hideBtnW = Math.round(60 * fs);
  buttons.push({
    label: "Hide",
    action: () => { debugPanelVisible = false; },
    x: padX,
    y: row3Y,
    w: hideBtnW,
    h: btnH,
  });
}

// 获取调试面板总尺寸
function getDebugPanelSize(): { w: number; h: number } {
  const fs = fontScale;
  return {
    w: Math.round(144 * fs),
    h: Math.round(106 * fs),
  };
}

// 绘制调试面板
function drawDebugPanel(): void {
  if (!DEBUG_MODE || !debugPanelVisible) return;

  _buildButtons();

  const fs = fontScale;
  const panelSize = getDebugPanelSize();
  const panelX = 4;
  const panelY = 4;

  ctx.save();

  // 半透明背景
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(panelX, panelY, panelSize.w, panelSize.h);
  // 边框
  ctx.strokeStyle = "#0f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelSize.w, panelSize.h);

  // 标题行
  ctx.fillStyle = "#0f0";
  ctx.font = `${Math.round(9 * fs)}px monospace`;
  ctx.textBaseline = "top";
  const padX = panelX + Math.round(4 * fs);
  ctx.fillText(`[DEBUG] Lv${getLevel()} Exp:${getExp()}/${getExpToNext()}`, padX, panelY + Math.round(3 * fs));

  // 按钮
  for (const btn of buttons) {
    const absX = panelX + btn.x;
    const absY = panelY + btn.y;
    // 按钮背景
    ctx.fillStyle = "rgba(0, 80, 0, 0.6)";
    ctx.fillRect(absX, absY, btn.w, btn.h);
    ctx.strokeStyle = "#0a0";
    ctx.lineWidth = 1;
    ctx.strokeRect(absX, absY, btn.w, btn.h);
    // 按钮文字
    ctx.fillStyle = "#0f0";
    ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(btn.label, absX + btn.w / 2, absY + btn.h / 2);
  }
  ctx.textAlign = "start";

  // 操作反馈
  if (debugInfoTimer > 0) {
    debugInfoTimer--;
    ctx.fillStyle = "#ff0";
    ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
    ctx.textBaseline = "top";
    ctx.fillText(debugInfo, padX, panelY + panelSize.h - Math.round(14 * fs));
  }

  ctx.restore();
}

// 处理点击：返回 true 表示点击在调试面板内
function handleDebugClick(clickX: number, clickY: number): boolean {
  if (!DEBUG_MODE || !debugPanelVisible) return false;

  const panelX = 4;
  const panelY = 4;

  for (const btn of buttons) {
    const absX = panelX + btn.x;
    const absY = panelY + btn.y;
    if (clickX >= absX && clickX <= absX + btn.w && clickY >= absY && clickY <= absY + btn.h) {
      btn.action();
      return true;
    }
  }
  // 点击面板内但非按钮区域也拦截
  const panelSize = getDebugPanelSize();
  if (clickX >= panelX && clickX <= panelX + panelSize.w && clickY >= panelY && clickY <= panelY + panelSize.h) {
    return true;
  }
  return false;
}

// 获取调试面板区域（供 hero.ts 排除移动使用）
function getDebugPanelArea(): { x: number; y: number; w: number; h: number } | null {
  if (!DEBUG_MODE || !debugPanelVisible) return null;
  const panelSize = getDebugPanelSize();
  return { x: 4, y: 4, w: panelSize.w, h: panelSize.h };
}

// ====== 触发入口：游戏开始时在画布右下角绘制一个小开关 ======

let debugToggleArea: { x: number; y: number; w: number; h: number } | null = null;

function drawDebugToggle(): void {
  if (!DEBUG_MODE) return;
  // 面板已显示时不需要开关
  if (debugPanelVisible) return;

  const fs = fontScale;
  const btnW = Math.round(40 * fs);
  const btnH = Math.round(18 * fs);
  const { width } = requireCanvasDims();
  const bx = width - btnW - Math.round(4 * fs);
  const by = Math.round(4 * fs);

  debugToggleArea = { x: bx, y: by, w: btnW, h: btnH };

  ctx.save();
  ctx.fillStyle = "rgba(0, 80, 0, 0.5)";
  ctx.fillRect(bx, by, btnW, btnH);
  ctx.strokeStyle = "#0a0";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, btnW, btnH);
  ctx.fillStyle = "#0f0";
  ctx.font = `bold ${Math.round(9 * fs)}px monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("DBG", bx + btnW / 2, by + btnH / 2);
  ctx.textAlign = "start";
  ctx.restore();
}

// 处理开关按钮点击
function handleDebugToggleClick(clickX: number, clickY: number): boolean {
  if (!DEBUG_MODE || debugPanelVisible) return false;
  if (!debugToggleArea) return false;
  const a = debugToggleArea;
  if (clickX >= a.x && clickX <= a.x + a.w && clickY >= a.y && clickY <= a.y + a.h) {
    debugPanelVisible = true;
    return true;
  }
  return false;
}

// 获取开关按钮区域
function getDebugToggleArea(): { x: number; y: number; w: number; h: number } | null {
  if (!DEBUG_MODE || debugPanelVisible) return null;
  return debugToggleArea;
}

// 辅助：获取 canvas 逻辑尺寸（避免循环依赖，直接读 DOM）
function requireCanvasDims(): { width: number; height: number } {
  const c = document.querySelector("canvas");
  return { width: c ? c.clientWidth : 480, height: c ? c.clientHeight : 800 };
}

// 初始化（无需绑定键盘）
function initDebugControls(): void {
  // 调试面板使用 Canvas 按钮交互，无需键盘绑定
}

export {
  isDebugMode,
  isDebugPanelVisible,
  getDebugInfo,
  getDebugPanelArea,
  getDebugToggleArea,
  drawDebugPanel,
  drawDebugToggle,
  handleDebugClick,
  handleDebugToggleClick,
  initDebugControls,
};
