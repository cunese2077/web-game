// 玩家特效模块（从 hero.ts 拆出）：护盾光环/进化光环/buff 飘字/治疗/升级特效绘制
// 只读 HeroFxState 状态束（buff 飘字数组原地更新），帧递减由 Hero.draw 主循环驱动
import { ctx, fontScale } from "./canvas.js";
import { heroImg } from "./resources.js";
import { t } from "./i18n.js";
import { getLevel } from "./level.js";
import type { BuffFloat } from "./types.js";

// 特效绘制所需的玩家状态束（由 Hero 类实例传入）
interface HeroFxState {
  x: number;
  y: number;
  count: number;
  buffFloats: BuffFloat[];
  healAnim: number;
  levelUpAnim: number;
}

// 护盾 buff 光环：蓝色脉冲圆环
function drawShieldAura(h: HeroFxState): void {
  const cx = h.x + heroImg[0].width / 2;
  const cy = h.y + heroImg[0].height / 2;
  const radius = Math.max(heroImg[0].width, heroImg[0].height) * 0.6;
  const alpha = 0.3 + Math.sin(h.count * 0.15) * 0.15;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#4af";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#4af";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.restore();
}

// 进化光环：紫色脉冲光环 + 旋转粒子
function drawEvolutionAura(h: HeroFxState): void {
  const cx = h.x + heroImg[0].width / 2;
  const cy = h.y + heroImg[0].height / 2;
  const radius = Math.max(heroImg[0].width, heroImg[0].height) * 0.65;
  const alpha = 0.35 + Math.sin(h.count * 0.12) * 0.2;

  ctx.save();
  // 外层紫色脉冲环
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#c6f";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#c6f";
  ctx.shadowBlur = 12;
  ctx.stroke();

  // 3 个旋转小光点
  const particleRadius = radius + 4;
  const speed = h.count * 0.06;
  for (let i = 0; i < 3; i++) {
    const angle = speed + (Math.PI * 2 / 3) * i;
    const px = cx + Math.cos(angle) * particleRadius;
    const py = cy + Math.sin(angle) * particleRadius;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#e8f";
    ctx.shadowColor = "#c6f";
    ctx.shadowBlur = 8;
    ctx.fill();
  }
  ctx.restore();
}

// buff 飘字：拾取时上浮淡出
function drawBuffFloats(h: HeroFxState): void {
  const heroCx = h.x + heroImg[0].width / 2;
  const heroCy = h.y + heroImg[0].height / 2;

  for (let i = h.buffFloats.length - 1; i >= 0; i--) {
    const bf = h.buffFloats[i];
    bf.frame--;
    if (bf.frame <= 0) {
      h.buffFloats.splice(i, 1);
      continue;
    }
    const progress = 1 - bf.frame / bf.maxFrame;
    const floatY = heroCy - 30 - progress * 50;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = bf.color;
    ctx.font = `bold ${Math.round(24 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.shadowColor = bf.color;
    ctx.shadowBlur = 10;
    ctx.fillText(bf.text, heroCx, floatY);
    ctx.restore();
  }
}

// 治疗特效：绿色上浮文字 + 扩散圆环
function drawHealEffect(h: HeroFxState): void {
  const heroCx = h.x + heroImg[0].width / 2;
  const heroCy = h.y + heroImg[0].height / 2;
  const progress = 1 - h.healAnim / 30;

  const floatY = heroCy - 40 - progress * 50;
  const alpha = 1 - progress;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#0f0";
  ctx.font = `bold ${Math.round(28 * fontScale)}px arial`;
  ctx.textAlign = "center";
  ctx.shadowColor = "#0f0";
  ctx.shadowBlur = 12;
  ctx.fillText(t("effect.heal"), heroCx, floatY);
  ctx.restore();

  const ringRadius = 20 + progress * 60;
  const ringAlpha = (1 - progress) * 0.5;
  ctx.save();
  ctx.globalAlpha = ringAlpha;
  ctx.beginPath();
  ctx.arc(heroCx, heroCy, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#0f0";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

// 升级特效：金色上浮文字 + 扩散圆环
function drawLevelUpEffect(h: HeroFxState): void {
  const lv = getLevel();
  const heroCx = h.x + heroImg[0].width / 2;
  const heroCy = h.y + heroImg[0].height / 2;
  const progress = 1 - h.levelUpAnim / 60;

  const floatY = heroCy - 60 - progress * 80;
  const alpha = 1 - progress;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fd0";
  ctx.font = `bold ${Math.round(32 * fontScale)}px arial`;
  ctx.textAlign = "center";
  ctx.shadowColor = "#fd0";
  ctx.shadowBlur = 16;
  ctx.fillText(t("effect.levelUp") + lv, heroCx, floatY);
  ctx.restore();

  const ringRadius = 20 + progress * 80;
  const ringAlpha = (1 - progress) * 0.6;
  ctx.save();
  ctx.globalAlpha = ringAlpha;
  ctx.beginPath();
  ctx.arc(heroCx, heroCy, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#fd0";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#fd0";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();
}

export { drawShieldAura, drawEvolutionAura, drawBuffFloats, drawHealEffect, drawLevelUpEffect };
