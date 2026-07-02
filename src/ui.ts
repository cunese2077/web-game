// UI 绘制模块：背景、logo、loading、暂停、游戏结束、得分动效
import { ctx, width, height, fontScale } from "./canvas.js";
import { bg, pause, gameLoad, heroImg } from "./resources.js";
import { PHASE_READY, PHASE_LOADING, PHASE_PLAY, PHASE_GAME_OVER } from "./constants.js";
import { getGameScore, resetGameScore } from "./score.js";
import { getLevel, getTotalExp } from "./level.js";
import { t } from "./i18n.js";
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

  constructor(x: number, y: number, damage: number, fontSize: number, color: string, floatDistance: number, frames: number) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.fontSize = fontSize;
    this.color = color;
    this.floatDistance = floatDistance;
    this.frames = frames;
    this.frame = frames;
    this.removable = false;
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
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = this.color;
    ctx.fillText("-" + this.damage, this.x, floatY);
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
function addDamageEffect(x: number, y: number, damage: number, fontSize: number, color: string, floatDistance: number, frames: number, stackOffset: number): void {
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

  damageEffects.push(new DamageEffectObj(x, startY, damage, fontSize, color, floatDistance, frames));
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

  // ===== 设置按钮：底部居中 =====
  ctx.globalAlpha = 0.7;
  ctx.shadowBlur = 4;
  ctx.shadowColor = "#000";
  ctx.fillStyle = "#ccc";
  ctx.font = `${Math.round(18 * fontScale)}px arial`;
  settingsBtnY = height - Math.round(40 * fontScale);
  ctx.fillText(t("start.settings"), cx, settingsBtnY);
  settingsBtnHitH = Math.round(30 * fontScale);

  ctx.restore();
}

// 设置按钮点击区域（供 engine.ts 判断点击）
let settingsBtnY: number = 0;
let settingsBtnHitH: number = 0;

function getSettingsBtnArea(): { y: number; h: number } {
  return { y: settingsBtnY - settingsBtnHitH, h: settingsBtnHitH };
}

// ========== 设置界面绘制 ==========
import { getSettingItems } from "./settings.js";

// 设置界面各元素的点击区域（供 engine.ts 判断点击）
interface SettingHitArea {
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

      // 记录点击区域
      settingHitAreas.push({
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
        y: curY - lineH * 0.7,
        h: lineH * 0.9,
        type: "toggle",
        itemIndex: i,
        optionIndex: -1,
      });

      curY += lineH * 0.3;

      // 展开时绘制下拉选项列表
      if (isExpanded && item.optionLabels) {
        for (let j = 0; j < item.optionLabels.length; j++) {
          curY += optionLineH;
          const isSelected = j === currentIdx;
          const prefix = isSelected ? "● " : "  ";
          ctx.textAlign = "right";
          ctx.fillStyle = isSelected ? "#ffd700" : "#aaa";
          ctx.font = `${optionFontSize}px arial`;
          ctx.fillText(prefix + t(item.optionLabels[j]), width - Math.round(30 * fontScale), curY);

          settingHitAreas.push({
            y: curY - optionLineH * 0.7,
            h: optionLineH * 0.9,
            type: "option",
            itemIndex: i,
            optionIndex: j,
          });
        }
      }

      curY += lineH * 0.7;
    }
  }

  // 返回按钮
  const backY = curY + Math.round(20 * fontScale);
  ctx.textAlign = "center";
  ctx.fillStyle = "#aaa";
  ctx.font = `${Math.round(18 * fontScale)}px arial`;
  ctx.fillText(t("settings.back"), cx, backY);
  settingHitAreas.push({
    y: backY - Math.round(25 * fontScale),
    h: Math.round(30 * fontScale),
    type: "back",
    itemIndex: -1,
    optionIndex: -1,
  });

  ctx.restore();
}

// 处理设置界面点击
function handleSettingsClick(clickY: number): "option" | "back" | null {
  for (const area of settingHitAreas) {
    if (clickY >= area.y && clickY < area.y + area.h) {
      if (area.type === "back") {
        expandedItem = -1;
        return "back";
      }
      if (area.type === "toggle") {
        const item = getSettingItems()[area.itemIndex];
        if (item.toggle !== undefined) {
          // 开关型：直接切换
          item.onToggle!();
        } else {
          // 下拉型：点击已展开的项则收起，否则展开
          expandedItem = expandedItem === area.itemIndex ? -1 : area.itemIndex;
        }
        return "option";
      }
      if (area.type === "option") {
        // 选中某选项
        const item = getSettingItems()[area.itemIndex];
        item.select!(area.optionIndex);
        expandedItem = -1;
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
function drawPause(): void {
  ctx.drawImage(pause, (width - pause.width) / 2, (height - pause.height) / 2);
}

// 画游戏结束界面
function drawGameOver(): void {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(40 * fontScale)}px arial`;
  ctx.textAlign = "center";
  ctx.fillText(t("gameOver.title"), width / 2, height / 2 - 80);

  ctx.font = `${Math.round(28 * fontScale)}px arial`;
  ctx.fillText(t("gameOver.score") + getGameScore(), width / 2, height / 2 - 30);

  ctx.fillStyle = "#fd0";
  ctx.font = `${Math.round(24 * fontScale)}px arial`;
  ctx.fillText(t("gameOver.level") + getLevel() + t("gameOver.totalExp") + getTotalExp(), width / 2, height / 2 + 10);

  ctx.font = `${Math.round(20 * fontScale)}px arial`;
  ctx.fillStyle = "#ccc";
  ctx.fillText(t("gameOver.restart"), width / 2, height / 2 + 60);

  ctx.textAlign = "left";
}

export { paintBg, paintLogo, loading, drawPause, drawGameOver, drawSettings, getSettingsBtnArea, handleSettingsClick, addScoreEffect, drawScoreEffects, clearScoreEffects, addDamageEffect, drawDamageEffects, clearDamageEffects };
