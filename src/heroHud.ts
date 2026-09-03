// 玩家 HUD 模块（从 hero.ts 拆出）：分数/等级经验/血条/buff 条/属性面板/音效与暂停按钮绘制
// 只读 HeroHudState 状态束（Hero 类结构性兼容），暂停按钮区域经 setPauseBtnArea 回写
import { ctx, width, height, fontScale } from "./canvas.js";
import { t } from "./i18n.js";
import { getGameScore } from "./score.js";
import { getLevel, getExp, getExpToNext } from "./level.js";
import { isSoundEnabled } from "./settings.js";
import { getBulletDamage, getBulletInterval } from "./upgrade.js";
import { buffConfig } from "./config.js";
import { setPauseBtnArea } from "./heroState.js";
import type { BuffState } from "./types.js";

// HUD 绘制所需的玩家状态束（由 Hero 类实例传入）
interface HeroHudState {
  hp: number;
  maxHp: number;
  hpFlash: number;
  buffs: BuffState;
  levelUpAnim: number;
}

// 分数（左上角）
function drawScore(): void {
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(20 * fontScale)}px arial`;
  ctx.fillText(t("hud.score") + getGameScore(), Math.round(10 * fontScale), Math.round(30 * fontScale));
}

// 等级 + 经验条 + 音效开关 + 暂停按钮（右上角）
function drawLevel(): void {
  const lv = getLevel();
  const exp = getExp();
  const expNext = getExpToNext();
  const isMaxLevel = lv >= 50;

  // 等级文字
  ctx.fillStyle = "#fd0";
  ctx.font = `bold ${Math.round(16 * fontScale)}px arial`;
  ctx.textAlign = "right";
  ctx.fillText(t("hud.level") + lv, width - Math.round(10 * fontScale), Math.round(20 * fontScale));

  // 经验条
  const barWidth = Math.round(110 * fontScale);
  const barHeight = Math.round(10 * fontScale);
  const barX = width - barWidth - Math.round(10 * fontScale);
  const barY = Math.round(26 * fontScale);

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const ratio = isMaxLevel ? 1 : (expNext > 0 ? exp / expNext : 0);
  ctx.fillStyle = isMaxLevel ? "#f0f" : "#fd0";
  ctx.fillRect(barX, barY, barWidth * ratio, barHeight);

  ctx.strokeStyle = "#fd0";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // 经验数值
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(9 * fontScale)}px arial`;
  ctx.textAlign = "center";
  if (isMaxLevel) {
    ctx.fillText(t("hud.max"), barX + barWidth / 2, barY + barHeight - Math.round(1 * fontScale));
  } else {
    ctx.fillText(exp + "/" + expNext, barX + barWidth / 2, barY + barHeight - Math.round(1 * fontScale));
  }
  // 音效开关图标
  const sndIconSize = Math.round(22 * fontScale);
  const sndIconX = barX - sndIconSize - Math.round(6 * fontScale);
  const sndIconY = barY + barHeight / 2;
  const sndEnabled = isSoundEnabled();
  const btnW = Math.round(28 * fontScale);
  const btnH = Math.round(22 * fontScale);
  const btnR = Math.round(5 * fontScale);
  const btnX = sndIconX - btnW / 2;
  const btnY = sndIconY - btnH / 2;
  ctx.save();
  ctx.fillStyle = sndEnabled ? "rgba(255,255,255,0.1)" : "rgba(255,60,60,0.08)";
  ctx.beginPath();
  ctx.moveTo(btnX + btnR, btnY);
  ctx.lineTo(btnX + btnW - btnR, btnY);
  ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + btnR, btnR);
  ctx.lineTo(btnX + btnW, btnY + btnH - btnR);
  ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - btnR, btnY + btnH, btnR);
  ctx.lineTo(btnX + btnR, btnY + btnH);
  ctx.arcTo(btnX, btnY + btnH, btnX, btnY + btnH - btnR, btnR);
  ctx.lineTo(btnX, btnY + btnR);
  ctx.arcTo(btnX, btnY, btnX + btnR, btnY, btnR);
  ctx.closePath();
  ctx.fill();
  ctx.font = `${Math.round(16 * fontScale)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = sndEnabled ? "#fff" : "#aaa";
  ctx.fillText("♫", sndIconX, sndIconY + Math.round(1 * fontScale));
  if (!sndEnabled) {
    ctx.strokeStyle = "#f44";
    ctx.lineWidth = Math.round(2 * fontScale);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(btnX + Math.round(3 * fontScale), btnY + Math.round(3 * fontScale));
    ctx.lineTo(btnX + btnW - Math.round(3 * fontScale), btnY + btnH - Math.round(3 * fontScale));
    ctx.stroke();
  }
  ctx.restore();

  // 暂停按钮（音效按钮左侧，远离经验条）
  const pauseBtnX = btnX - btnW - Math.round(6 * fontScale);
  const pauseBtnY = btnY;
  const pauseBtnW = btnW;
  const pauseBtnH = btnH;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(pauseBtnX + btnR, pauseBtnY);
  ctx.lineTo(pauseBtnX + pauseBtnW - btnR, pauseBtnY);
  ctx.arcTo(pauseBtnX + pauseBtnW, pauseBtnY, pauseBtnX + pauseBtnW, pauseBtnY + btnR, btnR);
  ctx.lineTo(pauseBtnX + pauseBtnW, pauseBtnY + pauseBtnH - btnR);
  ctx.arcTo(pauseBtnX + pauseBtnW, pauseBtnY + pauseBtnH, pauseBtnX + pauseBtnW - btnR, pauseBtnY + pauseBtnH, btnR);
  ctx.lineTo(pauseBtnX + btnR, pauseBtnY + pauseBtnH);
  ctx.arcTo(pauseBtnX, pauseBtnY + pauseBtnH, pauseBtnX, pauseBtnY + pauseBtnH - btnR, btnR);
  ctx.lineTo(pauseBtnX, pauseBtnY + btnR);
  ctx.arcTo(pauseBtnX, pauseBtnY, pauseBtnX + btnR, pauseBtnY, btnR);
  ctx.closePath();
  ctx.fill();
  // 双竖线暂停图标
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = Math.round(2.5 * fontScale);
  ctx.lineCap = "round";
  const pauseCenterX = pauseBtnX + pauseBtnW / 2;
  const pauseCenterY = pauseBtnY + pauseBtnH / 2;
  const barLen = Math.round(6 * fontScale);
  const barGap = Math.round(3 * fontScale);
  ctx.beginPath();
  ctx.moveTo(pauseCenterX - barGap, pauseCenterY - barLen);
  ctx.lineTo(pauseCenterX - barGap, pauseCenterY + barLen);
  ctx.moveTo(pauseCenterX + barGap, pauseCenterY - barLen);
  ctx.lineTo(pauseCenterX + barGap, pauseCenterY + barLen);
  ctx.stroke();
  ctx.restore();

  // 记录暂停按钮区域（输入事件排除用）
  setPauseBtnArea({ x: pauseBtnX, y: pauseBtnY, w: pauseBtnW, h: pauseBtnH });

  ctx.textAlign = "left";
}

// 血条（右下角，受击闪白）
function drawHp(h: HeroHudState): void {
  const barWidth = Math.round(150 * fontScale);
  const barHeight = Math.round(12 * fontScale);
  const x = width - barWidth - Math.round(10 * fontScale);
  const y = height - barHeight - Math.round(10 * fontScale);

  if (h.hpFlash > 0) {
    h.hpFlash--;
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(x, y, barWidth, barHeight);

  const ratio = h.hp / h.maxHp;
  if (h.hpFlash > 0 && h.hpFlash % 6 < 3) {
    ctx.fillStyle = "#fff";
  } else {
    ctx.fillStyle = ratio > 0.5 ? "#0f0" : ratio > 0.25 ? "#ff0" : "#f00";
  }
  ctx.fillRect(x, y, barWidth * ratio, barHeight);

  if (h.hpFlash > 0) {
    ctx.shadowColor = "#0f0";
    ctx.shadowBlur = 8;
  }

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.shadowBlur = 0;

  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(12 * fontScale)}px arial`;
  ctx.textAlign = "center";
  ctx.fillText(t("hud.hp") + " " + h.hp + "/" + h.maxHp, x + barWidth / 2, y + barHeight - Math.round(1 * fontScale));
  ctx.textAlign = "left";
}

// buff 持续时间条（右下角血条上方）
function drawBuffs(h: HeroHudState): void {
  const barWidth = Math.round(150 * fontScale);
  const barHeight = Math.round(8 * fontScale);
  const baseX = width - barWidth - Math.round(10 * fontScale);
  const baseY = height - Math.round((10 + 12 + 6 + 8) * fontScale);

  const activeBuffs: (keyof BuffState)[] = [];
  if (h.buffs.firepower > 0) activeBuffs.push("firepower");
  if (h.buffs.shield > 0) activeBuffs.push("shield");
  if (h.buffs.spread > 0) activeBuffs.push("spread");

  for (let i = 0; i < activeBuffs.length; i++) {
    const key = activeBuffs[i];
    const cfg = buffConfig[key];
    const y = baseY - i * (barHeight + Math.round(4 * fontScale));
    const ratio = h.buffs[key] / cfg.duration;

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(baseX, y, barWidth, barHeight);

    ctx.fillStyle = cfg.color;
    ctx.fillRect(baseX, y, barWidth * ratio, barHeight);

    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(baseX, y, barWidth, barHeight);

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(8 * fontScale)}px arial`;
    ctx.textAlign = "left";
    ctx.fillText(t(cfg.label), baseX + Math.round(3 * fontScale), y + barHeight - Math.round(1 * fontScale));
    ctx.textAlign = "right";
    ctx.fillText((h.buffs[key] / 20).toFixed(1) + "s", baseX + barWidth - Math.round(3 * fontScale), y + barHeight - Math.round(1 * fontScale));
  }
  ctx.textAlign = "left";
}

// 属性面板（左下角：攻击力/射速）
function drawStats(h: HeroHudState): void {
  const currentDamage = getBulletDamage();
  const hasFirepower = h.buffs.firepower > 0;
  const displayDamage = currentDamage * (hasFirepower ? buffConfig.firepower.damageMultiplier : 1);
  const bulletInterval = getBulletInterval();

  const padding = Math.round(6 * fontScale);
  const lineH = Math.round(14 * fontScale);
  const panelW = Math.round(92 * fontScale);
  const lineCount = 2;
  const panelH = lineCount * lineH + padding * 2;
  const panelX = Math.round(10 * fontScale);
  const panelY = height - panelH - Math.round(10 * fontScale);

  const isLevelUp = h.levelUpAnim > 0;
  const borderColor = isLevelUp ? "#fd0" : "rgba(255,255,255,0.4)";
  const bgAlpha = isLevelUp ? 0.55 : 0.35;

  ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
  ctx.beginPath();
  const r = Math.round(4 * fontScale);
  ctx.moveTo(panelX + r, panelY);
  ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + panelH, r);
  ctx.arcTo(panelX + panelW, panelY + panelH, panelX, panelY + panelH, r);
  ctx.arcTo(panelX, panelY + panelH, panelX, panelY, r);
  ctx.arcTo(panelX, panelY, panelX + panelW, panelY, r);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `bold ${Math.round(11 * fontScale)}px arial`;
  ctx.textAlign = "left";

  let lineY = panelY + padding + Math.round(10 * fontScale);
  const labelX = panelX + padding;
  const valueX = panelX + panelW - padding;

  // ATK
  ctx.textAlign = "left";
  ctx.fillStyle = hasFirepower ? "#f80" : "#fd0";
  ctx.fillText(t("hud.atk"), labelX, lineY);
  ctx.textAlign = "right";
  ctx.fillStyle = hasFirepower ? "#f80" : "#fff";
  ctx.fillText(displayDamage.toFixed(2), valueX, lineY);
  lineY += lineH;

  // RATE
  ctx.textAlign = "left";
  ctx.fillStyle = "#9cf";
  ctx.fillText(t("hud.rate"), labelX, lineY);
  ctx.textAlign = "right";
  ctx.fillStyle = "#fff";
  ctx.fillText(String(bulletInterval), valueX, lineY);

  ctx.textAlign = "left";
}

export { drawScore, drawLevel, drawHp, drawBuffs, drawStats };
