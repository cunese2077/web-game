// 特殊武器视觉特效模块（从 specialWeapons.ts 拆出）：命中闪光/烟花散开/闪电视觉/激光视觉 + 锯齿线生成
// 各武器系统经 add* 函数注入特效，门面每帧调用 updateAndDrawWeaponEffects 统一更新绘制
// 60fps 改造：特效时长帧制 → ms 制（原帧数 × 50）；烟花粒子移动帧制 → px/s 速度制（原每帧位移 × 20）
import { ctx } from "./canvas.js";
import { getDt, getDtSec } from "./frameTime.js";

// 视觉特效时长（ms，原 20fps 帧数 × 50）
const LASER_VISUAL_DURATION_MS = 800;      // 激光视觉：原 16 帧
const LIGHTNING_VISUAL_DURATION_MS = 1000; // 闪电视觉：原 20 帧
const FIREWORK_DURATION_MS = 1100;         // 烟花散开：原 22 帧
// 烟花粒子物理（原每帧值 × 20 → px/s）
const FIREWORK_GRAVITY_PX_PER_SEC = 3; // 微重力：原 0.15/帧
const FIREWORK_DRAG_PER_FRAME = 0.96;  // 空气阻力：每 50ms 衰减一次的系数

// ========== 命中闪光特效 ==========
// 导弹命中爆炸 / 闪电命中电弧 / 激光命中冲击 的视觉闪光
class HitFlash {
  x: number;
  y: number;
  radius: number;
  color: string;
  timeMs: number;    // 已播放时长（ms）
  durationMs: number; // 总时长（ms）

  constructor(x: number, y: number, radius: number, color: string, durationMs: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.timeMs = 0;
    this.durationMs = durationMs;
  }

  get removable(): boolean {
    return this.timeMs >= this.durationMs;
  }

  update(): void {
    this.timeMs += getDt();
  }

  draw(): void {
    const progress = this.timeMs / this.durationMs;
    const alpha = 1 - progress;
    const currentRadius = this.radius * (0.5 + progress * 1.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = currentRadius * 0.8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ========== 烟花散开特效（导弹命中专属） ==========
// 多个粒子从命中点向四周散开，带拖尾渐隐
class FireworkBurst {
  particles: { x: number; y: number; vx: number; vy: number; color: string; size: number }[];
  timeMs: number;
  durationMs: number;

  constructor(x: number, y: number, radius: number, colors: string[], particleCount: number) {
    this.timeMs = 0;
    this.durationMs = FIREWORK_DURATION_MS;
    this.particles = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.5;
      // 初速度 px/s（原每帧位移 × 20，dt=50 时与原帧逻辑恒等）
      const speed = radius * (0.14 + Math.random() * 0.10) * 20;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
      });
    }
  }

  get removable(): boolean {
    return this.timeMs >= this.durationMs;
  }

  update(): void {
    this.timeMs += getDt();
    const dtSec = getDtSec();
    // 空气阻力：原每帧 ×0.96 → 按 50ms 一次指数衰减（dt=50 时恒等于 ×0.96）
    const drag = Math.pow(FIREWORK_DRAG_PER_FRAME, dtSec * 20);
    for (const p of this.particles) {
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += FIREWORK_GRAVITY_PX_PER_SEC * dtSec;  // 微重力，粒子缓慢下落
      p.vx *= drag;  // 空气阻力
      p.vy *= drag;
    }
  }

  draw(): void {
    const progress = this.timeMs / this.durationMs;
    const alpha = 1 - progress;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = alpha * (0.6 + Math.random() * 0.4);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ========== 闪电视觉效果 ==========
class LightningBolt {
  segments: { x1: number; y1: number; x2: number; y2: number }[];
  timeMs: number;
  durationMs: number;
  damage: number;
  slowFactor: number;
  hitEnemyIds: Set<number>;

  constructor(
    segments: { x1: number; y1: number; x2: number; y2: number }[],
    damage: number,
    slowFactor: number,
    hitEnemyIds: Set<number>
  ) {
    this.segments = segments;
    this.timeMs = 0;
    this.durationMs = LIGHTNING_VISUAL_DURATION_MS;
    this.damage = damage;
    this.slowFactor = slowFactor;
    this.hitEnemyIds = hitEnemyIds;
  }

  get removable(): boolean {
    return this.timeMs >= this.durationMs;
  }

  update(): void {
    this.timeMs += getDt();
  }

  draw(): void {
    const alpha = 1 - this.timeMs / this.durationMs;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 外层发光：宽+蓝紫色
    ctx.strokeStyle = "#48f";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#48f";
    ctx.shadowBlur = 16;
    for (const seg of this.segments) {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    // 中层亮线：白色
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#8cf";
    ctx.shadowBlur = 10;
    for (const seg of this.segments) {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ========== 激光视觉效果 ==========
class LaserBeam {
  x: number;
  y: number;
  beamLength: number;
  timeMs: number;
  durationMs: number;

  constructor(x: number, y: number, beamLength: number) {
    this.x = x;
    this.y = y;
    this.beamLength = beamLength;
    this.timeMs = 0;
    this.durationMs = LASER_VISUAL_DURATION_MS;
  }

  get removable(): boolean {
    return this.timeMs >= this.durationMs;
  }

  update(): void {
    this.timeMs += getDt();
  }

  draw(): void {
    const alpha = 1 - this.timeMs / this.durationMs;
    const endY = this.y - this.beamLength;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 最外层：宽幅散射光晕
    ctx.strokeStyle = "#48f";
    ctx.lineWidth = 14;
    ctx.shadowColor = "#48f";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, endY);
    ctx.stroke();
    // 中层：青蓝色主光束
    ctx.strokeStyle = "#8cf";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#8cf";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, endY);
    ctx.stroke();
    // 内层：白色亮线
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, endY);
    ctx.stroke();
    ctx.restore();
  }
}

// ========== 状态管理 ==========
const lightnings: LightningBolt[] = [];
const laserBeams: LaserBeam[] = [];
const hitFlashes: HitFlash[] = [];
const fireworkBursts: FireworkBurst[] = [];

// ========== 锯齿线生成 ==========

function generateJaggedLine(x1: number, y1: number, x2: number, y2: number, segments: number = 4): { x1: number; y1: number; x2: number; y2: number }[] {
  const result: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / len;
  const perpY = dx / len;

  let prevX = x1;
  let prevY = y1;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    let px = x1 + dx * t;
    let py = y1 + dy * t;
    if (i < segments) {
      const offset = (Math.random() - 0.5) * len * 0.15;
      px += perpX * offset;
      py += perpY * offset;
    }
    result.push({ x1: prevX, y1: prevY, x2: px, y2: py });
    prevX = px;
    prevY = py;
  }
  return result;
}

// ========== 注入接口（各武器系统调用） ==========

function addHitFlash(x: number, y: number, radius: number, color: string, durationMs: number): void {
  hitFlashes.push(new HitFlash(x, y, radius, color, durationMs));
}

function addFireworkBurst(x: number, y: number, radius: number, colors: string[], particleCount: number): void {
  fireworkBursts.push(new FireworkBurst(x, y, radius, colors, particleCount));
}

function addLightningBolt(segments: { x1: number; y1: number; x2: number; y2: number }[], damage: number, slowFactor: number, hitEnemyIds: Set<number>): void {
  lightnings.push(new LightningBolt(segments, damage, slowFactor, hitEnemyIds));
}

function addLaserBeam(x: number, y: number, beamLength: number): void {
  laserBeams.push(new LaserBeam(x, y, beamLength));
}

// ========== 统一更新/绘制（门面每帧末尾调用） ==========

function updateAndDrawWeaponEffects(): void {
  // 闪电视觉效果
  for (let i = lightnings.length - 1; i >= 0; i--) {
    lightnings[i].update();
    if (lightnings[i].removable) {
      lightnings.splice(i, 1);
    } else {
      lightnings[i].draw();
    }
  }

  // 激光视觉效果
  for (let i = laserBeams.length - 1; i >= 0; i--) {
    laserBeams[i].update();
    if (laserBeams[i].removable) {
      laserBeams.splice(i, 1);
    } else {
      laserBeams[i].draw();
    }
  }

  // 命中闪光
  for (let i = hitFlashes.length - 1; i >= 0; i--) {
    hitFlashes[i].update();
    if (hitFlashes[i].removable) {
      hitFlashes.splice(i, 1);
    } else {
      hitFlashes[i].draw();
    }
  }

  // 烟花散开
  for (let i = fireworkBursts.length - 1; i >= 0; i--) {
    fireworkBursts[i].update();
    if (fireworkBursts[i].removable) {
      fireworkBursts.splice(i, 1);
    } else {
      fireworkBursts[i].draw();
    }
  }
}

// 清理全部特效状态（游戏重置时由门面调用）
function clearWeaponEffects(): void {
  lightnings.length = 0;
  laserBeams.length = 0;
  hitFlashes.length = 0;
  fireworkBursts.length = 0;
}

export {
  generateJaggedLine,
  addHitFlash,
  addFireworkBurst,
  addLightningBolt,
  addLaserBeam,
  updateAndDrawWeaponEffects,
  clearWeaponEffects,
};
