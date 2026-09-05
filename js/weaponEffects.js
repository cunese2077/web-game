// 特殊武器视觉特效模块（从 specialWeapons.ts 拆出）：命中闪光/烟花散开/闪电视觉/激光视觉 + 锯齿线生成
// 各武器系统经 add* 函数注入特效，门面每帧调用 updateAndDrawWeaponEffects 统一更新绘制
import { ctx } from "./canvas.js";
const LASER_VISUAL_FRAMES = 16;
const LIGHTNING_VISUAL_FRAMES = 20;
// ========== 命中闪光特效 ==========
// 导弹命中爆炸 / 闪电命中电弧 / 激光命中冲击 的视觉闪光
class HitFlash {
    constructor(x, y, radius, color, frames) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.frame = 0;
        this.maxFrame = frames;
    }
    get removable() {
        return this.frame >= this.maxFrame;
    }
    update() {
        this.frame++;
    }
    draw() {
        const progress = this.frame / this.maxFrame;
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
    constructor(x, y, radius, colors, particleCount) {
        this.frame = 0;
        this.maxFrame = 22;
        this.particles = [];
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.5;
            const speed = radius * (0.14 + Math.random() * 0.10);
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
    get removable() {
        return this.frame >= this.maxFrame;
    }
    update() {
        this.frame++;
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // 微重力，粒子缓慢下落
            p.vx *= 0.96; // 空气阻力
            p.vy *= 0.96;
        }
    }
    draw() {
        const progress = this.frame / this.maxFrame;
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
    constructor(segments, damage, slowFactor, hitEnemyIds) {
        this.segments = segments;
        this.frame = 0;
        this.maxFrame = LIGHTNING_VISUAL_FRAMES;
        this.damage = damage;
        this.slowFactor = slowFactor;
        this.hitEnemyIds = hitEnemyIds;
    }
    get removable() {
        return this.frame >= this.maxFrame;
    }
    update() {
        this.frame++;
    }
    draw() {
        const alpha = 1 - this.frame / this.maxFrame;
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
    constructor(x, y, beamLength) {
        this.x = x;
        this.y = y;
        this.beamLength = beamLength;
        this.frame = 0;
        this.maxFrame = LASER_VISUAL_FRAMES;
    }
    get removable() {
        return this.frame >= this.maxFrame;
    }
    update() {
        this.frame++;
    }
    draw() {
        const alpha = 1 - this.frame / this.maxFrame;
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
const lightnings = [];
const laserBeams = [];
const hitFlashes = [];
const fireworkBursts = [];
// ========== 锯齿线生成 ==========
function generateJaggedLine(x1, y1, x2, y2, segments = 4) {
    const result = [];
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
function addHitFlash(x, y, radius, color, frames) {
    hitFlashes.push(new HitFlash(x, y, radius, color, frames));
}
function addFireworkBurst(x, y, radius, colors, particleCount) {
    fireworkBursts.push(new FireworkBurst(x, y, radius, colors, particleCount));
}
function addLightningBolt(segments, damage, slowFactor, hitEnemyIds) {
    lightnings.push(new LightningBolt(segments, damage, slowFactor, hitEnemyIds));
}
function addLaserBeam(x, y, beamLength) {
    laserBeams.push(new LaserBeam(x, y, beamLength));
}
// ========== 统一更新/绘制（门面每帧末尾调用） ==========
function updateAndDrawWeaponEffects() {
    // 闪电视觉效果
    for (let i = lightnings.length - 1; i >= 0; i--) {
        lightnings[i].update();
        if (lightnings[i].removable) {
            lightnings.splice(i, 1);
        }
        else {
            lightnings[i].draw();
        }
    }
    // 激光视觉效果
    for (let i = laserBeams.length - 1; i >= 0; i--) {
        laserBeams[i].update();
        if (laserBeams[i].removable) {
            laserBeams.splice(i, 1);
        }
        else {
            laserBeams[i].draw();
        }
    }
    // 命中闪光
    for (let i = hitFlashes.length - 1; i >= 0; i--) {
        hitFlashes[i].update();
        if (hitFlashes[i].removable) {
            hitFlashes.splice(i, 1);
        }
        else {
            hitFlashes[i].draw();
        }
    }
    // 烟花散开
    for (let i = fireworkBursts.length - 1; i >= 0; i--) {
        fireworkBursts[i].update();
        if (fireworkBursts[i].removable) {
            fireworkBursts.splice(i, 1);
        }
        else {
            fireworkBursts[i].draw();
        }
    }
}
// 清理全部特效状态（游戏重置时由门面调用）
function clearWeaponEffects() {
    lightnings.length = 0;
    laserBeams.length = 0;
    hitFlashes.length = 0;
    fireworkBursts.length = 0;
}
export { generateJaggedLine, addHitFlash, addFireworkBurst, addLightningBolt, addLaserBeam, updateAndDrawWeaponEffects, clearWeaponEffects, };
