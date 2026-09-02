// BOSS 外观绘制模块（从 boss.ts 拆出）：4 种类型差异化外观的纯绘制函数
// 只读 BOSS 状态束 BossBodyState，不修改任何状态
import { ctx, fontScale } from "./canvas.js";
import type { BossPhase, BossType } from "./bossTypes.js";

// 外观绘制所需的 BOSS 状态束（由 bossEntity 的 Boss 类构造传入）
interface BossBodyState {
  x: number;
  y: number;
  bossWidth: number;
  bossHeight: number;
  bossType: BossType;
  attackPhase: BossPhase;
  // 突击型
  isDiving: boolean;
  // 堡垒型
  shieldHp: number;
  shieldMaxHp: number;
  // 幻影型
  teleportFlash: number;
  spiralAngle: number;
}

// 突击型外观：红色流线型 + 尖锐翼
function drawAssaultBody(b: BossBodyState, left: number, top: number): void {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.008);
    ctx.shadowColor = b.attackPhase === 3 ? "#f00" : "#f66";
    ctx.shadowBlur = 14 * pulse;

    // 主体：深红装甲
    ctx.fillStyle = "#411";
    ctx.fillRect(left, top, b.bossWidth, b.bossHeight);

    // 装甲条纹（锐利对角线）
    const stripeH = b.bossHeight / 5;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#922" : "#733";
      ctx.fillRect(left, top + i * stripeH, b.bossWidth, stripeH);
    }

    // 尖锐翼展（前掠翼）
    ctx.fillStyle = "#a33";
    ctx.beginPath();
    ctx.moveTo(left, top + b.bossHeight * 0.2);
    ctx.lineTo(left - b.bossWidth * 0.15, top);
    ctx.lineTo(left, top + b.bossHeight * 0.6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(left + b.bossWidth, top + b.bossHeight * 0.2);
    ctx.lineTo(left + b.bossWidth * 1.15, top);
    ctx.lineTo(left + b.bossWidth, top + b.bossHeight * 0.6);
    ctx.fill();

    // 核心发光（红橙色）
    const coreSize = b.bossWidth * 0.1;
    ctx.fillStyle = b.attackPhase === 3 ? "#ff0" : "#f80";
    ctx.shadowColor = b.attackPhase === 3 ? "#fa0" : "#f80";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(b.x, b.y, coreSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, coreSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 尾焰（底部3个）
    ctx.shadowColor = "#f80";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#f80";
    const engineY = top + b.bossHeight;
    for (const offX of [-0.3, 0, 0.3]) {
      ctx.beginPath();
      ctx.arc(b.x + b.bossWidth * offX, engineY, 2 * fontScale, 0, Math.PI * 2);
      ctx.fill();
    }

    // 俯冲时拖尾
    if (b.isDiving) {
      ctx.fillStyle = `rgba(255, 100, 0, ${0.3 + 0.2 * Math.sin(Date.now() * 0.02)})`;
      ctx.fillRect(left - b.bossWidth * 0.05, top - b.bossHeight, b.bossWidth * 1.1, b.bossHeight);
    }

    // 阶段3狂暴闪烁
    if (b.attackPhase === 3) {
      ctx.fillStyle = `rgba(255, 50, 50, ${0.2 + 0.3 * Math.sin(Date.now() * 0.01)})`;
      ctx.fillRect(left - b.bossWidth * 0.1, top, b.bossWidth * 1.2, b.bossHeight);
    }
  }
// 堡垒型外观：蓝色厚重装甲 + 六边形护盾
function drawFortressBody(b: BossBodyState, left: number, top: number): void {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.004);
    ctx.shadowColor = b.attackPhase === 3 ? "#f0f" : "#48f";
    ctx.shadowBlur = 10 * pulse;

    // 主体：深蓝装甲
    ctx.fillStyle = "#114";
    ctx.fillRect(left, top, b.bossWidth, b.bossHeight);

    // 厚重装甲板（深浅交替）
    const stripeH = b.bossHeight / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#236" : "#348";
      ctx.fillRect(left, top + i * stripeH, b.bossWidth, stripeH);
    }

    // 厚重翼展（矩形突出）
    ctx.fillStyle = "#347";
    ctx.fillRect(left - b.bossWidth * 0.12, top + b.bossHeight * 0.2, b.bossWidth * 0.12, b.bossHeight * 0.6);
    ctx.fillRect(left + b.bossWidth, top + b.bossHeight * 0.2, b.bossWidth * 0.12, b.bossHeight * 0.6);

    // 核心发光（蓝色）
    const coreSize = b.bossWidth * 0.14;
    ctx.fillStyle = b.attackPhase === 3 ? "#f0f" : "#4af";
    ctx.shadowColor = b.attackPhase === 3 ? "#f0f" : "#4af";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(b.x, b.y, coreSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, coreSize * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 护盾光圈（半透明六边形轮廓）
    if (b.shieldHp > 0) {
      const shieldAlpha = 0.3 + 0.15 * (b.shieldHp / b.shieldMaxHp);
      ctx.strokeStyle = `rgba(100, 180, 255, ${shieldAlpha})`;
      ctx.shadowColor = "#4af";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2 + (b.shieldHp / b.shieldMaxHp) * 2;
      ctx.beginPath();
      // 六边形
      const hw = b.bossWidth * 0.6;
      const hh = b.bossHeight * 1.2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
        const px = b.x + Math.cos(angle) * hw;
        const py = b.y + Math.sin(angle) * hh;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 阶段3狂暴闪烁
    if (b.attackPhase === 3) {
      ctx.fillStyle = `rgba(200, 50, 255, ${0.2 + 0.3 * Math.sin(Date.now() * 0.01)})`;
      ctx.fillRect(left - b.bossWidth * 0.1, top, b.bossWidth * 1.2, b.bossHeight);
    }
  }
// 母舰型外观：绿色+机库开口 + 无人机挂架
function drawCarrierBody(b: BossBodyState, left: number, top: number): void {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.006);
    ctx.shadowColor = b.attackPhase === 3 ? "#ff0" : "#4f8";
    ctx.shadowBlur = 10 * pulse;

    // 主体：深绿装甲
    ctx.fillStyle = "#142";
    ctx.fillRect(left, top, b.bossWidth, b.bossHeight);

    // 装甲板
    const stripeH = b.bossHeight / 5;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#253" : "#364";
      ctx.fillRect(left, top + i * stripeH, b.bossWidth, stripeH);
    }

    // 翼展（宽大矩形+圆形挂架）
    ctx.fillStyle = "#354";
    ctx.fillRect(left - b.bossWidth * 0.15, top + b.bossHeight * 0.15, b.bossWidth * 0.15, b.bossHeight * 0.7);
    ctx.fillRect(left + b.bossWidth, top + b.bossHeight * 0.15, b.bossWidth * 0.15, b.bossHeight * 0.7);

    // 无人机挂架点（两侧各2个）
    ctx.fillStyle = "#8f4";
    ctx.shadowColor = "#4f8";
    ctx.shadowBlur = 6;
    for (const offX of [-0.22, -0.08, 0.08, 0.22]) {
      ctx.beginPath();
      ctx.arc(b.x + b.bossWidth * offX, top + b.bossHeight * 0.8, 2.5 * fontScale, 0, Math.PI * 2);
      ctx.fill();
    }

    // 核心发光（绿色）
    const coreSize = b.bossWidth * 0.11;
    ctx.fillStyle = b.attackPhase === 3 ? "#ff0" : "#4f8";
    ctx.shadowColor = b.attackPhase === 3 ? "#fa0" : "#4f8";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(b.x, b.y, coreSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, coreSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 机库开口（底部中央）
    ctx.fillStyle = "#020";
    ctx.fillRect(b.x - b.bossWidth * 0.15, top + b.bossHeight * 0.7, b.bossWidth * 0.3, b.bossHeight * 0.3);
    // 机库绿灯
    ctx.fillStyle = "#4f8";
    ctx.shadowColor = "#4f8";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, top + b.bossHeight * 0.85, 2 * fontScale, 0, Math.PI * 2);
    ctx.fill();

    // 阶段3狂暴闪烁
    if (b.attackPhase === 3) {
      ctx.fillStyle = `rgba(255, 200, 0, ${0.2 + 0.3 * Math.sin(Date.now() * 0.01)})`;
      ctx.fillRect(left - b.bossWidth * 0.1, top, b.bossWidth * 1.2, b.bossHeight);
    }
  }
// 幻影型外观：紫色半透明 + 幻影残影 + 漂浮光环
function drawPhantomBody(b: BossBodyState, left: number, top: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
    ctx.shadowColor = b.attackPhase === 3 ? "#f0f" : "#c8f";
    ctx.shadowBlur = 16 * pulse;

    // === 瞬移残影：在新位置之前留几个半透明残影 ===
    if (b.teleportFlash > 0) {
      const ghostAlpha = (b.teleportFlash / 15) * 0.4;
      // 残影偏移（向左上飘散）
      for (let i = 1; i <= 3; i++) {
        ctx.save();
        ctx.globalAlpha = ghostAlpha * (1 - i * 0.25);
        ctx.fillStyle = "#a8f";
        const gx = left - i * 8;
        const gy = top - i * 4;
        ctx.fillRect(gx, gy, b.bossWidth, b.bossHeight);
        ctx.restore();
      }
    }

    // 主体：深紫半透明装甲（幻影感）
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#214";
    ctx.fillRect(left, top, b.bossWidth, b.bossHeight);

    // 装甲条纹（紫色渐变）
    const stripeH = b.bossHeight / 5;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#426" : "#537";
      ctx.fillRect(left, top + i * stripeH, b.bossWidth, stripeH);
    }
    ctx.globalAlpha = 1;

    // 翼展（半透明尖翼，体现幻影）
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#846";
    ctx.beginPath();
    ctx.moveTo(left, top + b.bossHeight * 0.3);
    ctx.lineTo(left - b.bossWidth * 0.18, top + b.bossHeight * 0.1);
    ctx.lineTo(left - b.bossWidth * 0.05, top + b.bossHeight * 0.7);
    ctx.lineTo(left, top + b.bossHeight * 0.6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(left + b.bossWidth, top + b.bossHeight * 0.3);
    ctx.lineTo(left + b.bossWidth * 1.18, top + b.bossHeight * 0.1);
    ctx.lineTo(left + b.bossWidth * 1.05, top + b.bossHeight * 0.7);
    ctx.lineTo(left + b.bossWidth, top + b.bossHeight * 0.6);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 漂浮光环（旋转的椭圆轮廓）
    ctx.strokeStyle = `rgba(200, 150, 255, ${0.4 + 0.3 * pulse})`;
    ctx.shadowColor = "#c8f";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const auraW = b.bossWidth * 0.7;
    const auraH = b.bossHeight * 0.5;
    ctx.ellipse(b.x, b.y, auraW, auraH, Math.sin(Date.now() * 0.003) * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    // 核心发光（紫色，闪烁更强）
    const coreSize = b.bossWidth * 0.12 * (0.85 + 0.3 * pulse);
    ctx.fillStyle = b.attackPhase === 3 ? "#f0f" : "#c8f";
    ctx.shadowColor = b.attackPhase === 3 ? "#f0f" : "#c8f";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(b.x, b.y, coreSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, coreSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 螺旋弹幕可视化：核心周围旋转的小光点（与 b.spiralAngle 同步）
    ctx.fillStyle = "#e8f";
    ctx.shadowColor = "#c8f";
    ctx.shadowBlur = 6;
    const orbitR = coreSize * 2.2;
    for (let i = 0; i < 3; i++) {
      const a = b.spiralAngle + (Math.PI * 2 / 3) * i;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * orbitR, b.y + Math.sin(a) * orbitR, 2 * fontScale, 0, Math.PI * 2);
      ctx.fill();
    }

    // 阶段3狂暴闪烁（紫色更强）
    if (b.attackPhase === 3) {
      ctx.fillStyle = `rgba(255, 50, 255, ${0.25 + 0.35 * Math.sin(Date.now() * 0.012)})`;
      ctx.fillRect(left - b.bossWidth * 0.1, top, b.bossWidth * 1.2, b.bossHeight);
    }
  }

export { drawAssaultBody, drawFortressBody, drawCarrierBody, drawPhantomBody };
export type { BossBodyState };
