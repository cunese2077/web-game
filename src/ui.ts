// UI 绘制模块：背景、logo、loading、暂停、游戏结束、得分动效
import { ctx, width, height, fontScale } from "./canvas.js";
import { bg, pause, gameLoad, heroImg } from "./resources.js";
import { PHASE_READY, PHASE_LOADING, PHASE_PLAY, PHASE_GAME_OVER } from "./constants.js";
import { getGameScore, resetGameScore } from "./score.js";
import { getLevel, getTotalExp } from "./level.js";
import { getBuildSummary } from "./upgrade.js";
import { getHighScore, getHighLevel, resetHighScoreRecords } from "./record.js";
import { getStats, getLastGame, getAchievementDefs, getAchievementTier, isUnlocked, deleteAchievement, resetAllData, getRecords, deleteRecord } from "./achievement.js";
import type { GameRecord } from "./achievement.js";
import { t } from "./i18n.js";
import type { TextKey } from "./i18n.js";
import type { GamePhase } from "./types.js";

// ========== 得分动效系统 ==========
const scoreEffects: ScoreEffectObj[] = [];
const SCORE_EFFECT_FRAMES: number = 30;

class ScoreEffectObj {
  x: number;
  y: number;
  score: number;
  frame: number;
  removable: boolean;

  constructor(x: number, y: number, score: number) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.frame = SCORE_EFFECT_FRAMES;
    this.removable = false;
  }

  update(): void {
    this.frame--;
    if (this.frame <= 0) {
      this.removable = true;
    }
  }

  draw(): void {
    const progress = 1 - this.frame / SCORE_EFFECT_FRAMES;
    const floatY = this.y - progress * 40;
    const alpha = 1 - progress * 0.8;
    const scale = 1 + progress * 0.3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, floatY);
    ctx.scale(scale, scale);

    ctx.font = `bold ${Math.round(22 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#fff";
    ctx.fillText("+" + this.score, 0, 0);

    ctx.restore();
  }
}

function addScoreEffect(x: number, y: number, score: number): void {
  scoreEffects.push(new ScoreEffectObj(x, y, score));
}

function drawScoreEffects(): void {
  for (let i = scoreEffects.length - 1; i >= 0; i--) {
    scoreEffects[i].update();
    if (scoreEffects[i].removable) {
      scoreEffects.splice(i, 1);
    } else {
      scoreEffects[i].draw();
    }
  }
}

function clearScoreEffects(): void {
  scoreEffects.length = 0;
}

// ========== 伤害浮动动效系统 ==========
// 子弹击中敌机时，在命中位置显示 "-X" 伤害数字，上浮并淡出
const damageEffects: DamageEffectObj[] = [];

class DamageEffectObj {
  x: number;
  y: number;
  damage: number;
  fontSize: number;
  color: string;
  floatDistance: number;
  frames: number;
  frame: number;
  removable: boolean;
  crit: boolean;

  constructor(x: number, y: number, damage: number, fontSize: number, color: string, floatDistance: number, frames: number, crit: boolean = false) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.fontSize = fontSize;
    this.color = color;
    this.floatDistance = floatDistance;
    this.frames = frames;
    this.frame = frames;
    this.removable = false;
    this.crit = crit;
  }

  update(): void {
    this.frame--;
    if (this.frame <= 0) {
      this.removable = true;
    }
  }

  // 当前实际渲染的 y 位置（含上浮进度），用于动态偏移计算
  getCurrentY(): number {
    const progress = 1 - this.frame / this.frames;
    return this.y - progress * this.floatDistance;
  }

  draw(): void {
    const floatY = this.getCurrentY();
    const alpha = 1 - (1 - this.frame / this.frames) * 0.8;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${this.fontSize}px arial`;
    ctx.textAlign = "center";

    if (this.crit) {
      // 暴击效果：金色 + 更强发光 + 缩放动画
      const progress = 1 - this.frame / this.frames;
      const scale = 1 + (1 - progress) * 0.3;
      ctx.translate(this.x, floatY);
      ctx.scale(scale, scale);
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffd700";
      ctx.fillText("-" + this.damage, 0, 0);
      // 暴击标签
      const labelSize = Math.round(this.fontSize * 0.6);
      ctx.font = `bold ${labelSize}px arial`;
      ctx.fillStyle = "#ff6600";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 6;
      ctx.fillText(t("combat.crit"), 0, -this.fontSize * 0.8);
    } else {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = this.color;
      ctx.fillText("-" + this.damage, this.x, floatY);
    }

    ctx.restore();
  }
}

// 添加伤害浮动动效：动态找空槽，避免与同 x 附近的现存动效重叠
//
// 【算法】"找空槽"而非"找最高"：
//   1. 收集同 x 附近（xRange 内）现存动效的当前 y（含上浮进度）
//   2. 从传入 y（敌机顶部，最自然位置）开始，依次尝试 y, y-stackOffset, y-2*stackOffset, ...
//   3. 找到第一个与所有现存动效当前 y 距离 >= stackOffset 的空槽，用作新动效起始 y
//   4. 优先用最低位置（最接近敌机），只有被占用才向上找
//
// 【不重叠的数学保证】所有动效上浮速度相同（每帧 floatDistance/frames），
//   因此两个动效的相对距离在整个生命周期内恒定 = 起始 y 差值。
//   只要起始间距 >= stackOffset（>fontSize），整个生命周期永不重叠。
//
// 【兜底】找不到不重叠的空槽时，跳过本次伤害文本显示（return），彻底避免重叠。
//   场景：大型敌机持续受击，连续命中动效起始 y 间距仅 ~6px（敌机下移 2px/帧 × 子弹间隔 3 帧），
//   远小于 stackOffset，向上找空槽很快跑出屏幕顶部。此时已有足够的伤害文本在显示，跳过不影响信息传达。
function addDamageEffect(x: number, y: number, damage: number, fontSize: number, color: string, floatDistance: number, frames: number, stackOffset: number, crit: boolean = false): void {
  const xRange = fontSize * 2;        // x 检测范围：字号 2 倍（同 x 附近的动效才需要堆叠）
  // 【关键】只收集"屏幕内可见"的动效参与堆叠计算（curY >= 0）。
  // 已跑出屏幕顶部（curY < 0）的动效不可见，不占用空槽，否则会阻挡新动效找空槽导致兜底重叠。
  // 候选位置也限制在 y >= 0（屏幕内），避免动效堆叠到屏幕外不可见。
  // 【兜底】若所有可见空槽都被占用（极端情况），用传入 y 保证可见（可能轻微重叠但优先可见）。
  const visibleCeiling = 0;           // 可见性阈值：curY >= 0 视为可见

  // 收集同 x 附近且可见（curY >= 0）的现存动效当前 y
  const occupiedY: number[] = [];
  for (const e of damageEffects) {
    if (e.removable) continue;
    const curY = e.getCurrentY();
    if (curY < visibleCeiling) continue;          // 屏幕外不可见，不占用空槽
    if (Math.abs(e.x - x) > xRange) continue;     // x 不在附近，不冲突
    occupiedY.push(curY);
  }

  // 从传入 y 开始向上找空槽：候选位置与所有可见占用位置距离 >= stackOffset
  // 候选位置也必须在屏幕内（>= visibleCeiling），避免堆叠到屏幕外
  // 若传入 y < 0（敌机在屏幕外），从 visibleCeiling 开始向上找
  const searchStartY = Math.max(y, visibleCeiling);
  let startY = searchStartY;  // 默认用搜索起始 y（保证可见）
  let chosenSlot = -1;  // -1 表示兜底
  for (let i = 0; ; i++) {
    const candidateY = searchStartY - i * stackOffset;
    // 候选位置跑出屏幕顶部则停止，使用兜底
    if (candidateY < visibleCeiling) break;
    // 检查候选位置是否与任一可见现存动效距离 < stackOffset（冲突）
    const conflict = occupiedY.some(oy => Math.abs(oy - candidateY) < stackOffset);
    if (!conflict) {
      startY = candidateY;
      chosenSlot = i;
      break;
    }
    // 继续向上找下一个空槽
  }

  // 【关键】兜底（找不到不重叠的空槽）时跳过本次伤害文本显示，避免重叠。
  // 场景：大型敌机持续受击，敌机下移速度(2px/帧)远小于 stackOffset，
  // 连续命中的动效起始 y 间距仅 ~6px，向上找空槽时很快跑出屏幕顶部。
  // 此时已有足够的伤害文本在显示，跳过本次不会影响信息传达，且彻底避免重叠。
  if (chosenSlot === -1) {
    return;  // 不产生新动效，避免重叠
  }

  damageEffects.push(new DamageEffectObj(x, startY, damage, fontSize, color, floatDistance, frames, crit));
}

function drawDamageEffects(): void {
  for (let i = damageEffects.length - 1; i >= 0; i--) {
    damageEffects[i].update();
    if (damageEffects[i].removable) {
      damageEffects.splice(i, 1);
    } else {
      damageEffects[i].draw();
    }
  }
}

function clearDamageEffects(): void {
  damageEffects.length = 0;
}

// 画滚动背景
// 背景图拉伸到画布宽高，确保铺满整个屏幕（支持任意尺寸的设备）
// 使用 height 作为滚动周期，两张图交替滚动实现无缝循环
function paintBg(): () => void {
  let y: number = 0;
  return function (): void {
    ctx.drawImage(bg, 0, y, width, height);
    ctx.drawImage(bg, 0, y - height, width, height);
    y++;
    // 使用 >= 而非 ===：移动端地址栏显示/隐藏、横竖屏切换会导致画布尺寸缩小，
    // 若 y 已超过新 height，=== 比较永远不成立，y 无限递增使两张 drawImage 都画在画布外，
    // 画布不被覆盖，产生残影累积（子弹/敌机/战机残影不消失）
    if (y >= height) y = 0;
  };
}

// 开始界面动画帧计数器（用于标题浮动、飞机摆动、提示闪烁）
let logoFrame: number = 0;

// 画开始界面（飞机装饰 + 标题 + 提示文本，支持多语言，带动画）
// 水平+垂直居中，避免大屏设备内容偏上
function paintLogo(): void {
  logoFrame = (logoFrame + 1) % 10000; // 用取模限制增长，解决精度丢失问题
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.textAlign = "center";

  // ===== 飞机装饰：漂移 + 摇晃 + 蓝色发光底（置于顶部） =====
  const heroW = heroImg[0].width;
  const heroH = heroImg[0].height;
  const heroBaseY = cy - Math.round(120 * fontScale);
  const heroDriftX = Math.sin(logoFrame * 0.05) * Math.round(12 * fontScale);
  const heroDriftY = Math.cos(logoFrame * 0.02) * Math.round(8 * fontScale);
  ctx.save();
  ctx.translate(cx + heroDriftX, heroBaseY + heroDriftY);
  ctx.rotate(Math.sin(logoFrame * 0.04) * 0.12);
  ctx.shadowColor = "#4af";
  ctx.shadowBlur = 15;
  ctx.drawImage(heroImg[0], -heroW / 2, -heroH / 2);
  ctx.restore();

  // ===== 标题：金色渐变 + 描边 + 发光 + 轻微浮动 =====
  const titleFloat = Math.sin(logoFrame * 0.03) * Math.round(3 * fontScale);
  const titleY = cy + Math.round(5 * fontScale) + titleFloat;
  const titleFontSize = Math.round(48 * fontScale);
  ctx.font = `bold ${titleFontSize}px arial`;
  ctx.shadowColor = "#ff8c00";
  ctx.shadowBlur = 20;
  // 描边
  ctx.strokeStyle = "#3a1a00";
  ctx.lineWidth = Math.max(1, Math.round(2 * fontScale));
  ctx.strokeText(t("start.title"), cx, titleY);
  // 渐变填充
  const gradient = ctx.createLinearGradient(0, titleY - titleFontSize, 0, titleY);
  gradient.addColorStop(0, "#ffe066");
  gradient.addColorStop(0.5, "#ffd700");
  gradient.addColorStop(1, "#ff8c00");
  ctx.fillStyle = gradient;
  ctx.fillText(t("start.title"), cx, titleY);

  // ===== 提示文字：闪烁效果 =====
  const blinkAlpha = 0.5 + 0.5 * Math.sin(logoFrame * 0.08);
  ctx.globalAlpha = blinkAlpha;
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.round(20 * fontScale)}px arial`;
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 6;
  ctx.fillText(t("start.clickToStart"), cx, cy + Math.round(75 * fontScale));

  // ===== 底部按钮：设置 + 游戏数据 =====
  ctx.globalAlpha = 0.7;
  ctx.shadowBlur = 4;
  ctx.shadowColor = "#000";
  ctx.fillStyle = "#ccc";
  ctx.font = `${Math.round(18 * fontScale)}px arial`;

  // 设置按钮（左侧）
  const btnGap = Math.round(60 * fontScale);
  settingsBtnY = height - Math.round(40 * fontScale);
  ctx.fillText(t("start.settings"), cx - btnGap / 2, settingsBtnY);
  settingsBtnHitH = Math.round(30 * fontScale);
  // 记录设置按钮的水平范围
  const settingsTextWidth = ctx.measureText(t("start.settings")).width;
  settingsBtnX = cx - btnGap / 2 - settingsTextWidth / 2;
  settingsBtnW = settingsTextWidth;

  // 游戏数据按钮（右侧）
  const gameDataTextY = settingsBtnY;  // 与设置按钮同一行
  ctx.fillText(t("start.gameData"), cx + btnGap / 2, gameDataTextY);
  const gameDataTextWidth = ctx.measureText(t("start.gameData")).width;
  gameDataBtnX = cx + btnGap / 2 - gameDataTextWidth / 2;
  gameDataBtnW = gameDataTextWidth;

  ctx.restore();
}

// 设置按钮点击区域（供 engine.ts 判断点击）
let settingsBtnX: number = 0;
let settingsBtnW: number = 0;
let settingsBtnY: number = 0;
let settingsBtnHitH: number = 0;

function getSettingsBtnArea(): { x: number; y: number; w: number; h: number } {
  return { x: settingsBtnX, y: settingsBtnY - settingsBtnHitH, w: settingsBtnW, h: settingsBtnHitH };
}

// 游戏数据按钮点击区域
let gameDataBtnX: number = 0;
let gameDataBtnW: number = 0;

function getGameDataBtnArea(): { x: number; y: number; w: number; h: number } {
  const y = settingsBtnY;  // 与设置按钮同一行
  return { x: gameDataBtnX, y: y - settingsBtnHitH, w: gameDataBtnW, h: settingsBtnHitH };
}

// ========== 设置界面绘制 ==========
import { getSettingItems } from "./settings.js";

// 设置界面各元素的点击区域（供 engine.ts 判断点击）
interface SettingHitArea {
  x: number;
  w: number;
  y: number;
  h: number;
  type: "toggle" | "option" | "back";
  itemIndex: number;   // 对应 settingItems 索引（back 按钮为 -1）
  optionIndex: number; // 选项索引（toggle 类型为 -1）
}

let settingHitAreas: SettingHitArea[] = [];
// 当前展开的设置项索引（-1 表示全部收起）
let expandedItem: number = -1;

function drawSettings(): void {
  const cx = width / 2;
  const items = getSettingItems();

  ctx.save();
  ctx.textAlign = "center";

  // 半透明遮罩
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, width, height);

  // 标题
  ctx.fillStyle = "#ffd700";
  ctx.font = `bold ${Math.round(32 * fontScale)}px arial`;
  ctx.shadowColor = "#ff8c00";
  ctx.shadowBlur = 10;
  ctx.fillText(t("settings.title"), cx, Math.round(60 * fontScale));
  ctx.shadowBlur = 0;

  // 设置项列表
  const itemFontSize = Math.round(20 * fontScale);
  const optionFontSize = Math.round(18 * fontScale);
  const lineH = Math.round(50 * fontScale);
  const optionLineH = Math.round(38 * fontScale);
  settingHitAreas = [];

  // 收集展开的下拉面板数据，延迟到最后绘制（保证在最上层）
  interface DropdownInfo {
    baseY: number;
    optionLabels: TextKey[];
    currentIdx: number;
    itemIndex: number;
  }
  const pendingDropdowns: DropdownInfo[] = [];

  let curY = Math.round(110 * fontScale);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isToggleType = item.toggle !== undefined;

    // 标签（左侧）
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = `${itemFontSize}px arial`;
    ctx.fillText(t(item.label), Math.round(30 * fontScale), curY);

    if (isToggleType) {
      // 开关型设置项：radio 样式 ○ 关  ● 开
      const isOn = item.toggle!();
      const radioFontSize = Math.round(16 * fontScale);
      const rightX = width - Math.round(30 * fontScale);

      // "关" 选项（左侧）
      ctx.font = `${radioFontSize}px arial`;
      ctx.textAlign = "right";
      const offX = rightX - Math.round(55 * fontScale);
      ctx.fillStyle = !isOn ? "#f44" : "#888";
      ctx.fillText((!isOn ? "● " : "○ ") + t("settings.sound.off"), offX, curY);

      // "开" 选项（右侧）
      ctx.textAlign = "right";
      ctx.fillStyle = isOn ? "#4f4" : "#888";
      ctx.fillText((isOn ? "● " : "○ ") + t("settings.sound.on"), rightX, curY);

      // 记录点击区域（整行宽度）
      settingHitAreas.push({
        x: Math.round(30 * fontScale),
        w: width - Math.round(60 * fontScale),
        y: curY - lineH * 0.7,
        h: lineH * 0.9,
        type: "toggle",
        itemIndex: i,
        optionIndex: -1,
      });

      curY += lineH;
    } else {
      // 下拉选择型设置项
      const currentIdx = item.current ? item.current() : 0;
      const isExpanded = expandedItem === i;
      const arrow = isExpanded ? " ▲" : " ▼";
      const optionText = (item.optionLabels ? t(item.optionLabels[currentIdx]) : "") + arrow;
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${optionFontSize}px arial`;
      ctx.fillText(optionText, width - Math.round(30 * fontScale), curY);

      settingHitAreas.push({
        x: Math.round(30 * fontScale),
        w: width - Math.round(60 * fontScale),
        y: curY - lineH * 0.7,
        h: lineH * 0.9,
        type: "toggle",
        itemIndex: i,
        optionIndex: -1,
      });

      // 收集展开的下拉面板数据，延迟绘制
      if (isExpanded && item.optionLabels) {
        pendingDropdowns.push({
          baseY: curY + lineH * 0.3,
          optionLabels: item.optionLabels,
          currentIdx,
          itemIndex: i,
        });
      }

      curY += lineH;
    }
  }

  // 返回按钮
  const backY = curY + Math.round(20 * fontScale);
  ctx.textAlign = "center";
  ctx.fillStyle = "#aaa";
  ctx.font = `${Math.round(18 * fontScale)}px arial`;
  ctx.fillText(t("settings.back"), cx, backY);
  settingHitAreas.push({
    x: Math.round(30 * fontScale),
    w: width - Math.round(60 * fontScale),
    y: backY - Math.round(25 * fontScale),
    h: Math.round(30 * fontScale),
    type: "back",
    itemIndex: -1,
    optionIndex: -1,
  });

  // 最后绘制下拉面板（保证在所有元素最上层）
  for (const dd of pendingDropdowns) {
    const dropdownBaseY = dd.baseY;
    const padH = Math.round(6 * fontScale);
    const padW = Math.round(12 * fontScale);
    const optionPadW = Math.round(10 * fontScale);

    // 计算自适应宽度：测量所有选项文字，取最大宽度
    ctx.font = `${optionFontSize}px arial`;
    let maxTextW = 0;
    for (const label of dd.optionLabels) {
      const w = ctx.measureText(t(label)).width;
      if (w > maxTextW) maxTextW = w;
    }
    // "● " 前缀宽度
    const prefixW = ctx.measureText("● ").width;
    const dropdownW = maxTextW + prefixW + padW * 2 + optionPadW;
    const dropdownH = dd.optionLabels.length * optionLineH + padH * 2;
    const dropdownX = width - Math.round(30 * fontScale) - dropdownW;

    // 半透明背景 + 金色边框
    ctx.fillStyle = "rgba(20, 20, 40, 0.95)";
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = Math.max(1, Math.round(1.5 * fontScale));
    ctx.beginPath();
    const r = Math.round(6 * fontScale);
    ctx.moveTo(dropdownX + r, dropdownBaseY);
    ctx.lineTo(dropdownX + dropdownW - r, dropdownBaseY);
    ctx.arcTo(dropdownX + dropdownW, dropdownBaseY, dropdownX + dropdownW, dropdownBaseY + r, r);
    ctx.lineTo(dropdownX + dropdownW, dropdownBaseY + dropdownH - r);
    ctx.arcTo(dropdownX + dropdownW, dropdownBaseY + dropdownH, dropdownX + dropdownW - r, dropdownBaseY + dropdownH, r);
    ctx.lineTo(dropdownX + r, dropdownBaseY + dropdownH);
    ctx.arcTo(dropdownX, dropdownBaseY + dropdownH, dropdownX, dropdownBaseY + dropdownH - r, r);
    ctx.lineTo(dropdownX, dropdownBaseY + r);
    ctx.arcTo(dropdownX, dropdownBaseY, dropdownX + r, dropdownBaseY, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    let optY = dropdownBaseY + padH + optionLineH * 0.7;
    for (let j = 0; j < dd.optionLabels.length; j++) {
      const isSelected = j === dd.currentIdx;
      const prefix = isSelected ? "● " : "  ";
      ctx.textAlign = "left";
      ctx.fillStyle = isSelected ? "#ffd700" : "#ccc";
      ctx.font = `${optionFontSize}px arial`;
      ctx.fillText(prefix + t(dd.optionLabels[j]), dropdownX + padW, optY);

      settingHitAreas.push({
        x: dropdownX,
        w: dropdownW,
        y: optY - optionLineH * 0.7,
        h: optionLineH * 0.9,
        type: "option",
        itemIndex: dd.itemIndex,
        optionIndex: j,
      });
      optY += optionLineH;
    }
  }

  ctx.restore();
}

// 处理设置界面点击
function handleSettingsClick(clickX: number, clickY: number): "option" | "back" | null {
  // 优先匹配下拉面板选项（最上层，防止穿透到底层元素）
  for (const area of settingHitAreas) {
    if (area.type !== "option") continue;
    if (clickX >= area.x && clickX < area.x + area.w &&
        clickY >= area.y && clickY < area.y + area.h) {
      const item = getSettingItems()[area.itemIndex];
      item.select!(area.optionIndex);
      expandedItem = -1;
      return "option";
    }
  }

  // 检查是否点击在下拉面板区域内（点击面板空白处收起，不穿透）
  const checkedItemIndices = new Set<number>();
  for (const area of settingHitAreas) {
    if (area.type !== "option") continue;
    if (checkedItemIndices.has(area.itemIndex)) continue;
    checkedItemIndices.add(area.itemIndex);
    // 找到面板的边界（所有同 itemIndex 的 option 区域的并集）
    const panelAreas = settingHitAreas.filter(a => a.type === "option" && a.itemIndex === area.itemIndex);
    if (panelAreas.length === 0) continue;
    const panelX = Math.min(...panelAreas.map(a => a.x));
    const panelW = Math.max(...panelAreas.map(a => a.x + a.w)) - panelX;
    const panelY = Math.min(...panelAreas.map(a => a.y));
    const panelH = Math.max(...panelAreas.map(a => a.y + a.h)) - panelY;
    if (clickX >= panelX && clickX < panelX + panelW &&
        clickY >= panelY && clickY < panelY + panelH) {
      // 点击在面板区域内但不在选项上 → 收起面板，不穿透
      expandedItem = -1;
      return null;
    }
  }

  // 匹配其他元素（toggle / back）
  for (const area of settingHitAreas) {
    if (area.type === "option") continue;
    if (clickX >= area.x && clickX < area.x + area.w &&
        clickY >= area.y && clickY < area.y + area.h) {
      if (area.type === "back") {
        expandedItem = -1;
        return "back";
      }
      if (area.type === "toggle") {
        const item = getSettingItems()[area.itemIndex];
        if (item.toggle !== undefined) {
          item.onToggle!();
        } else {
          expandedItem = expandedItem === area.itemIndex ? -1 : area.itemIndex;
        }
        return "option";
      }
    }
  }
  // 点击空白区域收起
  expandedItem = -1;
  return null;
}

// 加载动画
function loading(): () => GamePhase {
  let index: number = 0;
  return function (): GamePhase {
    index % 1 === 0 &&
      ctx.drawImage(gameLoad[Math.floor(index)], (width - gameLoad[0].width) / 2, height - gameLoad[0].height);
    index += 0.5;
    if (index > 3) {
      index = 0;
      return PHASE_PLAY;
    }
    return PHASE_LOADING;
  };
}

// 画暂停图标
// 暂停界面返回按钮点击区域
let pauseBackBtnX: number = 0;
let pauseBackBtnW: number = 0;
let pauseBackBtnY: number = 0;
let pauseBackBtnH: number = 0;

function getPauseBackBtnArea(): { x: number; y: number; w: number; h: number } {
  return { x: pauseBackBtnX, y: pauseBackBtnY, w: pauseBackBtnW, h: pauseBackBtnH };
}

function drawPause(): void {
  // 半透明遮罩（保留游戏画面可见）
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, width, height);

  // 居中绘制 ▶ 播放图标（圆形背景 + 三角 + 发光）
  const circleR = Math.round(28 * fontScale);
  const iconX = width / 2;
  const iconY = height / 2 - Math.round(24 * fontScale);
  ctx.save();
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.arc(iconX, iconY, circleR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // ▶ 三角
  const triW = Math.round(14 * fontScale);
  const triH = Math.round(18 * fontScale);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.moveTo(iconX - triW / 2 + Math.round(2 * fontScale), iconY - triH / 2);
  ctx.lineTo(iconX + triW / 2 + Math.round(2 * fontScale), iconY);
  ctx.lineTo(iconX - triW / 2 + Math.round(2 * fontScale), iconY + triH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 返回主页面按钮（播放图标下方）
  const btnFontSize = Math.round(18 * fontScale);
  ctx.font = `${btnFontSize}px arial`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ccc";
  const btnY = iconY + circleR + Math.round(28 * fontScale);
  ctx.fillText(t("pause.backToMain"), width / 2, btnY);

  // 记录点击区域
  const btnText = t("pause.backToMain");
  const btnW = ctx.measureText(btnText).width + Math.round(20 * fontScale);
  pauseBackBtnX = width / 2 - btnW / 2;
  pauseBackBtnW = btnW;
  pauseBackBtnY = btnY - btnFontSize;
  pauseBackBtnH = btnFontSize + Math.round(10 * fontScale);
}

// 游戏结束界面返回主页按钮点击区域
let gameOverBackBtnX: number = 0;
let gameOverBackBtnW: number = 0;
let gameOverBackBtnY: number = 0;
let gameOverBackBtnH: number = 0;

function getGameOverBackBtnArea(): { x: number; y: number; w: number; h: number } {
  return { x: gameOverBackBtnX, y: gameOverBackBtnY, w: gameOverBackBtnW, h: gameOverBackBtnH };
}

// 结算入场动画帧计数器
let gameOverAnimFrame: number = 0;

function resetGameOverAnim(): void {
  gameOverAnimFrame = 0;
}

// 画游戏结束界面（含 Build 摘要）
function drawGameOver(): void {
  gameOverAnimFrame++;

  // 入场动画辅助函数
  const animAlpha = (start: number, dur: number): number => {
    if (gameOverAnimFrame < start) return 0;
    if (gameOverAnimFrame >= start + dur) return 1;
    return (gameOverAnimFrame - start) / dur;
  };
  const animOffset = (start: number, dur: number, dist: number): number => {
    if (gameOverAnimFrame < start) return -dist;
    if (gameOverAnimFrame >= start + dur) return 0;
    return -dist * (1 - (gameOverAnimFrame - start) / dur);
  };

  // 遮罩渐入
  const overlayAlpha = animAlpha(0, 8) * 0.7;
  ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  let curY = height * 0.12;

  // === 上半部分：标题+得分+等级+纪录（渐入+下滑）===
  const topAlpha = animAlpha(4, 12);
  const topOffset = animOffset(4, 12, 25);

  ctx.save();
  ctx.globalAlpha = topAlpha;
  ctx.textAlign = "center";
  ctx.translate(0, topOffset);

  // 标题
  ctx.fillStyle = "#f44";
  ctx.font = `bold ${Math.round(36 * fontScale)}px arial`;
  ctx.shadowColor = "#f00";
  ctx.shadowBlur = 10;
  ctx.fillText(t("gameOver.title"), cx, curY);
  ctx.shadowBlur = 0;
  curY += Math.round(40 * fontScale);

  // 得分
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(26 * fontScale)}px arial`;
  ctx.fillText(t("gameOver.score") + getGameScore(), cx, curY);
  curY += Math.round(28 * fontScale);

  // 等级 + 总经验
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.round(20 * fontScale)}px arial`;
  ctx.fillText(t("gameOver.level") + getLevel() + t("gameOver.totalExp") + getTotalExp(), cx, curY);
  curY += Math.round(24 * fontScale);

  // 历史最高分/最高等级（新纪录时醒目提示）
  const score = getGameScore();
  const level = getLevel();
  const highScore = getHighScore();
  const highLevel = getHighLevel();
  const isNewScore = score >= highScore && score > 0;
  const isNewLevel = level >= highLevel && level > 1;

  if (isNewScore || isNewLevel) {
    // 新纪录醒目提示：大字 + 发光 + 星号装饰（增大与上方的距离）
    curY += Math.round(6 * fontScale);
    ctx.save();
    ctx.font = `bold ${Math.round(24 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#ffd700";
    if (isNewScore && isNewLevel) {
      ctx.fillText("★ " + t("gameOver.newRecord") + " ★", cx, curY);
    } else if (isNewScore) {
      ctx.fillText(t("gameOver.highScore") + " " + t("gameOver.newRecord"), cx, curY);
    } else {
      ctx.fillText(t("gameOver.highLevel") + " " + t("gameOver.newRecord"), cx, curY);
    }
    ctx.restore();
    curY += Math.round(30 * fontScale);
  }

  ctx.font = `${Math.round(16 * fontScale)}px arial`;
  if (highScore > 0) {
    ctx.fillStyle = "#888";
    ctx.fillText(t("gameOver.highScore") + highScore, cx, curY);
    curY += Math.round(22 * fontScale);
  }
  if (highLevel > 0) {
    ctx.fillStyle = "#888";
    ctx.fillText(t("gameOver.highLevel") + highLevel, cx, curY);
    curY += Math.round(22 * fontScale);
  }

  ctx.restore(); // 上半部分动画结束

  // === 下半部分：Build摘要+成就+统计+按钮（延迟渐入）===
  const bottomAlpha = animAlpha(14, 12);
  const bottomOffset = animOffset(14, 12, 20);

  ctx.save();
  ctx.globalAlpha = bottomAlpha;
  ctx.textAlign = "center";
  ctx.translate(0, bottomOffset);

  curY += Math.round(4 * fontScale);

  // === Build 摘要 ===
  const build = getBuildSummary();
  if (build.length > 0) {
    // 分隔线
    ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.35, curY);
    ctx.lineTo(cx + width * 0.35, curY);
    ctx.stroke();
    curY += Math.round(36 * fontScale);  // 分隔线到标题的间距

    // Build 摘要标题
    ctx.fillStyle = "#ffd700";
    ctx.font = `bold ${Math.round(18 * fontScale)}px arial`;
    ctx.fillText(t("gameOver.build"), cx, curY);
    curY += Math.round(22 * fontScale);

    // 分为武器和被动两组
    const weapons = build.filter(e => e.type === "weapon");
    const passives = build.filter(e => e.type !== "weapon");

    const itemFontSize = Math.round(14 * fontScale);
    const lineHeight = Math.round(20 * fontScale);
    const colGap = Math.round(10 * fontScale);
    const halfW = width * 0.42;

    // 稀有度颜色
    function rarityColor(rarity: string): string {
      if (rarity === "legendary") return "#ffd700";
      if (rarity === "epic") return "#c64fff";
      if (rarity === "rare") return "#4a9eff";
      return "#ccc";
    }

    // 绘制一组条目（左侧标题+右侧条目列表）
    function drawGroup(title: TextKey, entries: typeof build, startY: number): number {
      if (entries.length === 0) return startY;
      ctx.font = `bold ${itemFontSize}px arial`;
      ctx.fillStyle = "#aaa";
      ctx.textAlign = "left";
      ctx.fillText(t(title), cx - halfW, startY);
      let y = startY + lineHeight;
      for (const entry of entries) {
        const nameStr = t(entry.label);
        const levelStr = entry.type === "weapon" ? `Lv${entry.level}` : `×${entry.level}`;
        ctx.fillStyle = rarityColor(entry.rarity);
        ctx.font = `${itemFontSize}px arial`;
        ctx.fillText(nameStr, cx - halfW + Math.round(4 * fontScale), y);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.fillText(levelStr, cx + halfW, y);
        ctx.textAlign = "left";
        y += lineHeight;
      }
      return y;
    }

    // 左列：武器，右列：被动
    const leftStartY = curY;
    const rightStartY = curY;

    // 先计算两列高度，取较大值
    const leftH = weapons.length > 0 ? (1 + weapons.length) * lineHeight : 0;
    const rightH = passives.length > 0 ? (1 + passives.length) * lineHeight : 0;

    // 绘制左列
    let nextY = leftStartY;
    if (weapons.length > 0) {
      nextY = drawGroup("gameOver.weapons", weapons, nextY);
    }

    // 绘制右列（如果两列不并排，就顺序放）
    if (passives.length > 0) {
      drawGroup("gameOver.passives", passives, nextY);
      nextY += (1 + passives.length) * lineHeight;
    } else {
      // nextY 已经是武器列底部
    }

    // 如果武器列和被动列都有内容，使用顺序排列
    // 重新绘制：不使用双列布局（避免复杂对齐），改为从上到下依次展示
    // 已在上面顺序绘制

    curY = Math.max(nextY, leftStartY + Math.max(leftH, rightH)) + Math.round(8 * fontScale);
  }

  // === 成就展示（本局新解锁/升档的成就） ===
  const stats = getStats();
  const lastGame = getLastGame();
  const achDefs = getAchievementDefs();
  const achHalfW = width * 0.42;
  // 显示本局新解锁或升档的成就
  const newTierMap = new Map<string, number>();
  for (const nt of lastGame.newAchievementTiers) {
    newTierMap.set(nt.id, nt.tier);
  }
  const tierColors = ["#444", "#cd7f32", "#c0c0c0", "#ffd700"]; // 未解锁/铜/银/金
  const tierSymbols = ["☆", "◈", "◆", "★"];
  if (newTierMap.size > 0) {
    // 分隔线
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.35, curY);
    ctx.lineTo(cx + width * 0.35, curY);
    ctx.stroke();
    curY += Math.round(16 * fontScale);  // 分隔线到标题的间距

    ctx.fillStyle = "#ffd700";
    ctx.font = `bold ${Math.round(14 * fontScale)}px arial`;
    ctx.fillText(t("gameOver.achievements") + " " + newTierMap.size, cx, curY);
    curY += Math.round(18 * fontScale);

    // 本局新解锁/升档成就列表
    const achFontSize = Math.round(12 * fontScale);
    const achLineH = Math.round(16 * fontScale);
    ctx.font = `${achFontSize}px arial`;
    for (const [achId, tier] of newTierMap) {
      const ach = achDefs.find(d => d.id === achId);
      if (!ach) continue;
      ctx.textAlign = "left";
      ctx.fillStyle = tierColors[tier];
      ctx.fillText(tierSymbols[tier] + " " + t(ach.label), cx - achHalfW, curY);
      curY += achLineH;
      // 限制显示数量，避免界面过长
      if (curY > height * 0.82) break;
    }
    curY += Math.round(4 * fontScale);
  }

  // === 统计摘要（本局数据） ===
  {
    ctx.font = `${Math.round(12 * fontScale)}px arial`;
    ctx.fillStyle = "#777";
    ctx.textAlign = "center";
    const statLine = `${t("gameOver.stats")}${stats.totalGames}：${t("gameData.highLevel")} ${lastGame.level} | ${t("gameData.killsCol")} ${lastGame.kills} | ${t("gameData.bossKillsCol")} ${lastGame.bossKills}`;
    ctx.fillText(statLine, cx, curY);
    curY += Math.round(14 * fontScale);
  }

  // 底部按钮行：重新开始 + 返回主页，同一行居中，交替闪烁
  const bottomY = height * 0.92;
  const bottomFontSize = Math.round(16 * fontScale);
  ctx.font = `${bottomFontSize}px arial`;
  ctx.fillStyle = "#ccc";
  const blinkAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
  const gap = Math.round(30 * fontScale);
  const restartText = t("gameOver.restart");
  const backText = t("pause.backToMain");
  const restartW = ctx.measureText(restartText).width;
  const backW = ctx.measureText(backText).width;
  const totalW = restartW + gap + backW;
  const startX = cx - totalW / 2;

  // 重新开始（左侧，闪烁）
  ctx.textAlign = "left";
  ctx.globalAlpha = blinkAlpha;
  ctx.fillText(restartText, startX, bottomY);
  ctx.globalAlpha = 1;

  // 返回主页（右侧，闪烁）
  ctx.globalAlpha = blinkAlpha;
  ctx.fillText(backText, startX + restartW + gap, bottomY);
  ctx.globalAlpha = 1;

  // 记录返回主页点击区域
  gameOverBackBtnX = startX + restartW + gap - Math.round(8 * fontScale);
  gameOverBackBtnW = backW + Math.round(16 * fontScale);
  gameOverBackBtnY = bottomY - bottomFontSize;
  gameOverBackBtnH = Math.round(24 * fontScale);

  ctx.restore();
}

// ========== 游戏数据页面 ==========
let gameDataOpen: boolean = false;
let deleteConfirmVisible: boolean = false;
let pendingDeleteRecordId: number | null = null; // null=删除全部, number=删除指定记录
let currentPage: number = 1;
const PAGE_SIZE = 10;

// Tooltip 系统
let mouseX: number = -1;
let mouseY: number = -1;
let tooltipText: string = "";
let tooltipX: number = 0;
let tooltipY: number = 0;
let tooltipVisible: boolean = false;

interface InfoIconArea {
  x: number;
  y: number;
  r: number;  // 半径
  desc: string;
  achievementId?: string;
}

let infoIconAreas: InfoIconArea[] = [];

function setMousePosition(x: number, y: number): void {
  mouseX = x;
  mouseY = y;
}

interface GameDataHitArea {
  x: number;
  w: number;
  y: number;
  h: number;
  type: "back" | "deleteOne" | "deleteAll" | "confirm" | "cancel" | "prevPage" | "nextPage" | "deleteRecord";
  achievementId?: string;
  recordId?: number;
}

let gameDataHitAreas: GameDataHitArea[] = [];

function isGameDataOpen(): boolean {
  return gameDataOpen;
}

function openGameData(): void {
  gameDataOpen = true;
  deleteConfirmVisible = false;
  pendingDeleteRecordId = null;
  currentPage = 1;
}

function closeGameData(): void {
  gameDataOpen = false;
  deleteConfirmVisible = false;
}

function drawGameData(): void {
  const cx = width / 2;
  const stats = getStats();
  const achDefs = getAchievementDefs();
  const allRecords = getRecords();

  gameDataHitAreas = [];

  ctx.save();

  // 半透明遮罩
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(0, 0, width, height);

  // 返回按钮（左上角）
  ctx.textAlign = "left";
  ctx.fillStyle = "#ccc";
  ctx.font = `${Math.round(16 * fontScale)}px arial`;
  ctx.fillText(t("gameData.back"), Math.round(16 * fontScale), Math.round(30 * fontScale));
  gameDataHitAreas.push({
    x: 0, w: Math.round(100 * fontScale),
    y: 0, h: Math.round(40 * fontScale),
    type: "back",
  });

  // 标题
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd700";
  ctx.font = `bold ${Math.round(26 * fontScale)}px arial`;
  ctx.shadowColor = "#ff8c00";
  ctx.shadowBlur = 10;
  ctx.fillText(t("gameData.title"), cx, Math.round(30 * fontScale));
  ctx.shadowBlur = 0;

  // 内容区域
  let curY = Math.round(50 * fontScale);
  const leftX = Math.round(16 * fontScale);
  const rightX = width - Math.round(16 * fontScale);
  const contentW = rightX - leftX;

  // === 汇总统计（紧凑单行） ===
  ctx.font = `${Math.round(12 * fontScale)}px arial`;
  ctx.fillStyle = "#999";
  ctx.textAlign = "center";
  const summaryLine = `${t("gameData.highScore")}:${stats.highestScore}  ${t("gameData.highLevel")}:${stats.highestLevel}  ${t("gameData.totalGames")}:${stats.totalGames}  ${t("gameData.totalKills")}:${stats.totalKills}  ${t("gameData.totalBossKills")}:${stats.totalBossKills}`;
  ctx.fillText(summaryLine, cx, curY);
  curY += Math.round(20 * fontScale);

  // === 成就列表 ===
  const unlockedCount = achDefs.filter(d => isUnlocked(d.id)).length;
  ctx.fillStyle = "#ffd700";
  ctx.font = `bold ${Math.round(13 * fontScale)}px arial`;
  ctx.fillText(t("gameData.achievements") + " " + unlockedCount + "/" + achDefs.length, cx, curY);
  curY += Math.round(16 * fontScale);

  // 成就详情列表（紧凑排列，两列居中布局 + 分档标记 + info 图标）
  infoIconAreas = [];
  const achFontSize = Math.round(11 * fontScale);
  const achLineH = Math.round(18 * fontScale);
  ctx.font = `${achFontSize}px arial`;
  const achColW = Math.round(150 * fontScale);  // 每列宽度
  const achTotalW = achColW * 2;
  const achStartX = cx - achTotalW / 2;          // 整体居中起点
  // 分档颜色和标记
  const tierColors = ["#444", "#cd7f32", "#c0c0c0", "#ffd700"]; // 未解锁/铜/银/金
  const tierSymbols = ["☆", "◈", "◆", "★"]; // 未解锁/铜/银/金
  let colIdx = 0;
  for (const ach of achDefs) {
    const tier = getAchievementTier(ach.id);
    const unlocked = tier >= 1;
    const col = colIdx % 2;
    const row = Math.floor(colIdx / 2);
    const x = achStartX + col * achColW;
    const y = curY + row * achLineH;

    // 成就名（带分档符号+颜色）
    ctx.textAlign = "left";
    ctx.fillStyle = tierColors[tier];
    const prefix = tierSymbols[tier] + " ";
    const nameStr = prefix + t(ach.label);
    ctx.fillText(nameStr, x, y);
    const textEndX = x + ctx.measureText(nameStr).width;

    // info 图标（ⓘ）— 紧跟成就名后面
    const iconR = Math.round(6 * fontScale);
    const iconGap = Math.round(4 * fontScale);
    const iconCx = textEndX + iconGap + iconR;
    const iconCy = y - Math.round(3 * fontScale);

    // 绘制圆形 info 图标
    ctx.beginPath();
    ctx.arc(iconCx, iconCy, iconR, 0, Math.PI * 2);
    ctx.fillStyle = unlocked ? "rgba(255, 215, 0, 0.3)" : "rgba(100, 100, 100, 0.3)";
    ctx.fill();
    ctx.fillStyle = unlocked ? "#ffd700" : "#666";
    ctx.font = `bold ${Math.round(9 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.fillText("i", iconCx, iconCy + Math.round(3 * fontScale));
    ctx.font = `${achFontSize}px arial`;  // 恢复字体

    // info 描述：显示当前档位 + 下一档目标
    const tierLabels: TextKey[] = ["achievement.tier.bronze", "achievement.tier.silver", "achievement.tier.gold"];
    const clampedTier = Math.min(tier, ach.tiers.length);
    let tooltip: string;
    if (clampedTier >= 1) {
      // 已解锁：当前档位
      const curName = t(tierLabels[clampedTier - 1]);
      const curDesc = t(ach.tiers[clampedTier - 1].desc);
      const nextIdx = clampedTier; // tiers 是 0-based，下一档索引 = clampedTier
      if (nextIdx < ach.tiers.length) {
        // 还有下一档
        const nextName = t(tierLabels[nextIdx]);
        const nextDesc = t(ach.tiers[nextIdx].desc);
        tooltip = `当前：${curName} - ${curDesc}\n下一档：${nextName} - ${nextDesc}`;
      } else if (ach.tiers.length > 1) {
        // 多档位成就已满级
        tooltip = `当前：${curName} - ${curDesc}（已满级）`;
      } else {
        // 单档位成就，不显示满级提示
        tooltip = `当前：${curName} - ${curDesc}`;
      }
    } else {
      // 未解锁：显示首档目标
      const nextName = t(tierLabels[0]);
      const nextDesc = t(ach.tiers[0].desc);
      tooltip = `下一档：${nextName} - ${nextDesc}`;
    }
    infoIconAreas.push({
      x: iconCx,
      y: iconCy,
      r: iconR + Math.round(2 * fontScale),
      desc: tooltip,
      achievementId: ach.id,
    });

    colIdx++;
  }
  const achRows = Math.ceil(achDefs.length / 2);
  curY += achRows * achLineH + Math.round(8 * fontScale);

  // === 分隔线 ===
  ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, curY);
  ctx.lineTo(rightX, curY);
  ctx.stroke();
  curY += Math.round(22 * fontScale);

  // === 对局记录列表 ===
  if (allRecords.length === 0) {
    // 无数据：仅在固定高度区域内居中显示提示
    const rowH = Math.round(22 * fontScale);
    const dataContainerH = PAGE_SIZE * rowH;
    ctx.textAlign = "center";
    ctx.fillStyle = "#666";
    ctx.font = `${Math.round(14 * fontScale)}px arial`;
    ctx.fillText(t("gameData.noData"), cx, curY + dataContainerH / 2);
    curY += dataContainerH;
  } else {
    // 有数据：显示表格标题 + 表头 + 数据行 + 分页
    const totalPages = Math.ceil(allRecords.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageRecords = allRecords.slice(startIdx, startIdx + PAGE_SIZE);
    const totalGames = stats.totalGames;

    const rowFontSize = Math.round(11 * fontScale);
    const rowH = Math.round(22 * fontScale);

    // 固定列宽布局（局号 | 等级 | 得分 | 击杀敌机数 | 击杀BOSS数 | 删除）
    const colNo = leftX + Math.round(2 * fontScale);        // 局号列起始
    const colLv = colNo + Math.round(36 * fontScale);       // 等级列起始
    const colSc = colLv + Math.round(66 * fontScale);       // 得分列起始
    const colKl = colSc + Math.round(56 * fontScale);       // 击杀敌机数列起始
    const colBo = colKl + Math.round(72 * fontScale);       // 击杀BOSS数列起始
    const delAreaRight = rightX - Math.round(2 * fontScale);

    // 表格标题
    ctx.font = `bold ${Math.round(14 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ccc";
    ctx.fillText(t("gameData.recordTitle"), cx, curY);
    curY += Math.round(20 * fontScale);

    // 表头
    ctx.font = `bold ${rowFontSize}px arial`;
    ctx.textAlign = "left";
    ctx.fillStyle = "#666";
    ctx.fillText("#", colNo, curY);
    ctx.fillText(t("gameData.highLevel"), colLv, curY);
    ctx.fillText(t("gameData.score"), colSc, curY);
    ctx.fillText(t("gameData.killsCol"), colKl, curY);
    ctx.fillText(t("gameData.bossKillsCol"), colBo, curY);
    curY += rowH;

    // 数据行区域：固定10行高度
    const dataContainerH = PAGE_SIZE * rowH;
    const dataContentY = curY;

    for (let i = 0; i < pageRecords.length; i++) {
      const rec = pageRecords[i];

      // 行背景（交替色）
      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.fillRect(leftX, curY - rowH + Math.round(4 * fontScale), contentW, rowH);
      }

      // 局号
      ctx.textAlign = "left";
      ctx.font = `${rowFontSize}px arial`;
      ctx.fillStyle = "#aaa";
      ctx.fillText(String(totalGames - startIdx - i), colNo, curY);

      // 各列数据（左对齐固定列宽）
      ctx.fillStyle = "#ccc";
      ctx.fillText(String(rec.level), colLv, curY);
      ctx.fillText(String(rec.score), colSc, curY);
      ctx.fillText("×" + rec.kills, colKl, curY);
      ctx.fillText("×" + rec.bossKills, colBo, curY);

      // 删除按钮
      const delText = t("gameData.deleteRecord");
      ctx.textAlign = "right";
      ctx.fillStyle = "#f66";
      ctx.font = `${Math.round(10 * fontScale)}px arial`;
      ctx.fillText(delText, delAreaRight, curY);
      const delW = ctx.measureText(delText).width + Math.round(6 * fontScale);
      gameDataHitAreas.push({
        x: delAreaRight - delW, w: delW,
        y: curY - rowH + Math.round(4 * fontScale), h: rowH,
        type: "deleteRecord",
        recordId: rec.id,
      });

      curY += rowH;
    }

    curY = dataContentY + dataContainerH;

    // === 分页控制（固定在表格底部下方） ===
    curY += Math.round(8 * fontScale);
    ctx.textAlign = "center";
    ctx.font = `${Math.round(14 * fontScale)}px arial`;

    // 上一页
    if (currentPage > 1) {
      ctx.fillStyle = "#4af";
      ctx.fillText(t("gameData.prevPage"), cx - Math.round(70 * fontScale), curY);
      const prevW = ctx.measureText(t("gameData.prevPage")).width + Math.round(12 * fontScale);
      gameDataHitAreas.push({
        x: cx - Math.round(70 * fontScale) - prevW / 2, w: prevW,
        y: curY - Math.round(20 * fontScale), h: Math.round(24 * fontScale),
        type: "prevPage",
      });
    }

    // 页码
    ctx.fillStyle = "#aaa";
    const pageInfo = t("gameData.pageInfo", { P: currentPage, T: totalPages });
    ctx.fillText(pageInfo, cx, curY);

    // 下一页
    if (currentPage < totalPages) {
      ctx.fillStyle = "#4af";
      ctx.fillText(t("gameData.nextPage"), cx + Math.round(70 * fontScale), curY);
      const nextW = ctx.measureText(t("gameData.nextPage")).width + Math.round(12 * fontScale);
      gameDataHitAreas.push({
        x: cx + Math.round(70 * fontScale) - nextW / 2, w: nextW,
        y: curY - Math.round(20 * fontScale), h: Math.round(24 * fontScale),
        type: "nextPage",
      });
    }
  }

  // === 底部：删除全部数据（无数据时隐藏） ===
  if (allRecords.length > 0) {
    const bottomBtnY = height - Math.round(24 * fontScale);
    ctx.textAlign = "center";

    if (!deleteConfirmVisible) {
    ctx.fillStyle = "#f66";
    ctx.font = `${Math.round(14 * fontScale)}px arial`;
    ctx.fillText(t("gameData.deleteAll"), cx, bottomBtnY);
    const delAllW = ctx.measureText(t("gameData.deleteAll")).width + Math.round(16 * fontScale);
    gameDataHitAreas.push({
      x: cx - delAllW / 2, w: delAllW,
      y: bottomBtnY - Math.round(22 * fontScale), h: Math.round(26 * fontScale),
      type: "deleteAll",
    });
  } else {
    // 确认对话框 — 圆角卡片 + 半透明遮罩 + 按钮样式
    // 半透明遮罩
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    const dlgW = Math.round(280 * fontScale);
    const dlgH = Math.round(140 * fontScale);
    const dlgX = cx - dlgW / 2;
    const dlgY = height / 2 - dlgH / 2;
    const radius = Math.round(12 * fontScale);

    // 卡片背景
    ctx.fillStyle = "rgba(30, 30, 50, 0.95)";
    ctx.beginPath();
    ctx.moveTo(dlgX + radius, dlgY);
    ctx.lineTo(dlgX + dlgW - radius, dlgY);
    ctx.quadraticCurveTo(dlgX + dlgW, dlgY, dlgX + dlgW, dlgY + radius);
    ctx.lineTo(dlgX + dlgW, dlgY + dlgH - radius);
    ctx.quadraticCurveTo(dlgX + dlgW, dlgY + dlgH, dlgX + dlgW - radius, dlgY + dlgH);
    ctx.lineTo(dlgX + radius, dlgY + dlgH);
    ctx.quadraticCurveTo(dlgX, dlgY + dlgH, dlgX, dlgY + dlgH - radius);
    ctx.lineTo(dlgX, dlgY + radius);
    ctx.quadraticCurveTo(dlgX, dlgY, dlgX + radius, dlgY);
    ctx.closePath();
    ctx.fill();

    // 边框
    ctx.strokeStyle = "rgba(255, 100, 100, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 顶部警告色条
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dlgX + radius, dlgY);
    ctx.lineTo(dlgX + dlgW - radius, dlgY);
    ctx.quadraticCurveTo(dlgX + dlgW, dlgY, dlgX + dlgW, dlgY + radius);
    ctx.lineTo(dlgX + dlgW, dlgY + radius);
    ctx.lineTo(dlgX, dlgY + radius);
    ctx.lineTo(dlgX, dlgY + radius);
    ctx.quadraticCurveTo(dlgX, dlgY, dlgX + radius, dlgY);
    ctx.closePath();
    ctx.clip();
    const barH = Math.round(4 * fontScale);
    const barGrad = ctx.createLinearGradient(dlgX, dlgY, dlgX + dlgW, dlgY);
    barGrad.addColorStop(0, "#f66");
    barGrad.addColorStop(1, "#f90");
    ctx.fillStyle = barGrad;
    ctx.fillRect(dlgX, dlgY, dlgW, barH + radius);
    ctx.restore();

    // 提示文字
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(14 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.fillText(
      pendingDeleteRecordId !== null ? t("gameData.deleteRecordConfirm") : t("gameData.deleteAllConfirm"),
      cx, dlgY + Math.round(52 * fontScale)
    );

    // 按钮区域
    const btnW = Math.round(90 * fontScale);
    const btnH = Math.round(32 * fontScale);
    const btnY = dlgY + dlgH - Math.round(46 * fontScale);
    const btnGap = Math.round(20 * fontScale);
    const confirmX = cx - btnW - btnGap / 2;
    const cancelX = cx + btnGap / 2;

    // 确认按钮 — 红色填充
    ctx.fillStyle = "#c44";
    ctx.beginPath();
    const btnR = Math.round(6 * fontScale);
    ctx.moveTo(confirmX + btnR, btnY);
    ctx.lineTo(confirmX + btnW - btnR, btnY);
    ctx.quadraticCurveTo(confirmX + btnW, btnY, confirmX + btnW, btnY + btnR);
    ctx.lineTo(confirmX + btnW, btnY + btnH - btnR);
    ctx.quadraticCurveTo(confirmX + btnW, btnY + btnH, confirmX + btnW - btnR, btnY + btnH);
    ctx.lineTo(confirmX + btnR, btnY + btnH);
    ctx.quadraticCurveTo(confirmX, btnY + btnH, confirmX, btnY + btnH - btnR);
    ctx.lineTo(confirmX, btnY + btnR);
    ctx.quadraticCurveTo(confirmX, btnY, confirmX + btnR, btnY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(13 * fontScale)}px arial`;
    ctx.fillText(t("gameData.confirm"), confirmX + btnW / 2, btnY + btnH / 2 + Math.round(5 * fontScale));
    gameDataHitAreas.push({
      x: confirmX, w: btnW,
      y: btnY, h: btnH,
      type: "confirm",
    });

    // 取消按钮 — 边框样式
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cancelX + btnR, btnY);
    ctx.lineTo(cancelX + btnW - btnR, btnY);
    ctx.quadraticCurveTo(cancelX + btnW, btnY, cancelX + btnW, btnY + btnR);
    ctx.lineTo(cancelX + btnW, btnY + btnH - btnR);
    ctx.quadraticCurveTo(cancelX + btnW, btnY + btnH, cancelX + btnW - btnR, btnY + btnH);
    ctx.lineTo(cancelX + btnR, btnY + btnH);
    ctx.quadraticCurveTo(cancelX, btnY + btnH, cancelX, btnY + btnH - btnR);
    ctx.lineTo(cancelX, btnY + btnR);
    ctx.quadraticCurveTo(cancelX, btnY, cancelX + btnR, btnY);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#ccc";
    ctx.font = `${Math.round(13 * fontScale)}px arial`;
    ctx.fillText(t("gameData.cancel"), cancelX + btnW / 2, btnY + btnH / 2 + Math.round(5 * fontScale));
    gameDataHitAreas.push({
      x: cancelX, w: btnW,
      y: btnY, h: btnH,
      type: "cancel",
    });
  }
  } // end if allRecords.length > 0

  // === Tooltip 绘制（鼠标悬停在 info 图标上） ===
  tooltipVisible = false;
  if (mouseX >= 0 && mouseY >= 0) {
    for (const icon of infoIconAreas) {
      const dx = mouseX - icon.x;
      const dy = mouseY - icon.y;
      if (dx * dx + dy * dy <= icon.r * icon.r) {
        tooltipText = icon.desc;
        tooltipX = mouseX;
        tooltipY = mouseY;
        tooltipVisible = true;
        break;
      }
    }
  }

  if (tooltipVisible) {
    const tipFontSize = Math.round(12 * fontScale);
    ctx.font = `${tipFontSize}px arial`;
    const tipLines = tooltipText.split("\n");
    const tipLineH = Math.round(16 * fontScale);
    let maxLineW = 0;
    for (const line of tipLines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineW) maxLineW = w;
    }
    const tipW = maxLineW + Math.round(16 * fontScale);
    const tipH = tipLines.length * tipLineH + Math.round(8 * fontScale);
    let tipX = tooltipX + Math.round(10 * fontScale);
    let tipY = tooltipY - tipH - Math.round(4 * fontScale);
    if (tipX + tipW > width) tipX = width - tipW - Math.round(4 * fontScale);
    if (tipY < 0) tipY = tooltipY + Math.round(16 * fontScale);

    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(tipX, tipY, tipW, tipH);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(tipX, tipY, tipW, tipH);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    for (let i = 0; i < tipLines.length; i++) {
      ctx.fillText(tipLines[i], tipX + Math.round(8 * fontScale), tipY + Math.round(14 * fontScale) + i * tipLineH);
    }
  }

  ctx.restore();
}

// 处理游戏数据页面的点击事件
function handleGameDataClick(clickX: number, clickY: number): string | null {
  for (const area of gameDataHitAreas) {
    if (clickX >= area.x && clickX < area.x + area.w &&
        clickY >= area.y && clickY < area.y + area.h) {
      switch (area.type) {
        case "back":
          closeGameData();
          return "back";
        case "deleteOne":
          if (area.achievementId) {
            deleteAchievement(area.achievementId);
          }
          return "deleteOne";
        case "deleteRecord":
          if (area.recordId !== undefined) {
            pendingDeleteRecordId = area.recordId;
            deleteConfirmVisible = true;
          }
          return "deleteRecord";
        case "deleteAll":
          pendingDeleteRecordId = null;
          deleteConfirmVisible = true;
          return "deleteAll";
        case "confirm":
          if (pendingDeleteRecordId !== null) {
            deleteRecord(pendingDeleteRecordId);
          } else {
            resetAllData();
          }
          deleteConfirmVisible = false;
          pendingDeleteRecordId = null;
          return "confirm";
        case "cancel":
          deleteConfirmVisible = false;
          pendingDeleteRecordId = null;
          return "cancel";
        case "prevPage":
          if (currentPage > 1) currentPage--;
          return "prevPage";
        case "nextPage":
          currentPage++;
          return "nextPage";
      }
    }
  }
  return null;
}

export { paintBg, paintLogo, loading, drawPause, drawGameOver, drawSettings, getSettingsBtnArea, getGameDataBtnArea, handleSettingsClick, isGameDataOpen, openGameData, closeGameData, drawGameData, handleGameDataClick, getPauseBackBtnArea, getGameOverBackBtnArea, setMousePosition, addScoreEffect, drawScoreEffects, clearScoreEffects, addDamageEffect, drawDamageEffects, clearDamageEffects, resetGameOverAnim };
