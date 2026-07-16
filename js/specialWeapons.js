// 特殊武器模块 - 管理追踪导弹、能量武器（激光+闪电）、僚机
import { ctx, width, height } from "./canvas.js";
import { getWeaponLevel, getDamagePassiveMultiplier, getCritChance, getFireRatePassiveBonus, getExplosionRadiusBonus, getMultiMissileBonus, getChainEnhanceBonus, getFreezeAddonSlow, hasNukeWarhead, hasVoidEnergy, getWingmanCount, hasBulletStorm } from "./upgrade.js";
import { getHeroBuffs } from "./hero.js";
import { buffConfig } from "./config.js";
import { PHASE_PLAY } from "./constants.js";
import { playLaser, playLightning, playMissile, playMissileHit, playWingmanHit } from "./audio.js";
// ========== 武器等级效果表 ==========
// 追踪导弹（每 60 帧发射）
// Lv1: 1枚, 伤害3 | Lv2: 1枚, 伤害4 | Lv3: 2枚, 伤害5 | Lv4: 2枚, 伤害7 | Lv5: 3枚, 伤害8+爆炸
const MISSILE_LEVELS = [
    { count: 1, damage: 3, explosionRadius: 0 },
    { count: 1, damage: 4, explosionRadius: 0 },
    { count: 2, damage: 5, explosionRadius: 0 },
    { count: 2, damage: 7, explosionRadius: 20 },
    { count: 3, damage: 8, explosionRadius: 35 },
];
const MISSILE_INTERVAL = 60;
// 能量武器（激光+闪电合体，每 120 帧发激光，每 120 帧发闪电链）
// Lv1: 激光8/射400, 链1/伤4 | Lv2: 链+1 | Lv3: 激光+3/射500 | Lv4: 链+2/射600 | Lv5: 全屏+链3
const ENERGY_LEVELS = [
    { laserDamage: 8, laserLength: 400, lightningDamage: 4, chains: 1 }, // Lv1: 400px 射程
    { laserDamage: 8, laserLength: 400, lightningDamage: 6, chains: 2 }, // Lv2: chain +1
    { laserDamage: 11, laserLength: 500, lightningDamage: 7, chains: 2 }, // Lv3: laser dmg +3
    { laserDamage: 14, laserLength: 600, lightningDamage: 9, chains: 3 }, // Lv4: chain +2, longer laser
    { laserDamage: 20, laserLength: -1, lightningDamage: 10, chains: 3 }, // Lv5: full screen + chain 3
];
const LASER_INTERVAL = 120;
const LIGHTNING_INTERVAL = 120;
const LASER_HIT_HALF_WIDTH = 18;
const LASER_VISUAL_FRAMES = 16;
const LIGHTNING_CHAIN_RANGE = 120;
const LIGHTNING_VISUAL_FRAMES = 20;
// 僚机（基于被动叠加，每 6 帧射击）
const WINGMAN_INTERVAL = 6;
const WINGMAN_OFFSET = 25;
const WINGMAN_BULLET_SPEED = 12;
// ========== 实体类 ==========
class HomingMissile {
    constructor(x, y, damage, explosionRadius) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.explosionRadius = explosionRadius;
        this.hasExplosion = explosionRadius > 0;
        this.trail = [];
        this.removable = false;
        this.speed = 8;
        this.angle = -Math.PI / 2; // 初始朝上
        this.turnRate = 0.15; // 每帧最大转向 ~8.6°
    }
    update(enemies) {
        // 记录拖尾
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10)
            this.trail.shift();
        // 寻找最近敌机
        let target = null;
        let minDist = Infinity;
        for (const e of enemies) {
            if (e.die)
                continue;
            const dx = e.x + e.width / 2 - this.x;
            const dy = e.y + e.height / 2 - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                target = e;
            }
        }
        if (target) {
            // 渐进转向：计算目标角度，限制每帧转向量
            const targetAngle = Math.atan2(target.y + target.height / 2 - this.y, target.x + target.width / 2 - this.x);
            let diff = targetAngle - this.angle;
            // 归一化到 [-π, π]
            while (diff > Math.PI)
                diff -= Math.PI * 2;
            while (diff < -Math.PI)
                diff += Math.PI * 2;
            // 限制转向速率
            if (diff > this.turnRate)
                diff = this.turnRate;
            if (diff < -this.turnRate)
                diff = -this.turnRate;
            this.angle += diff;
        }
        else {
            // 无目标：渐进转向朝上
            let diff = -Math.PI / 2 - this.angle;
            while (diff > Math.PI)
                diff -= Math.PI * 2;
            while (diff < -Math.PI)
                diff += Math.PI * 2;
            if (Math.abs(diff) > 0.02) {
                this.angle += diff > 0 ? 0.05 : -0.05;
            }
        }
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        // 出界检测
        if (this.y < -20 || this.y > height + 20 || this.x < -20 || this.x > width + 20) {
            this.removable = true;
        }
        return target;
    }
    draw() {
        // 拖尾：渐变橙色拖尾
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = (i + 1) / this.trail.length * 0.6;
            const radius = 2 + (i / this.trail.length) * 3;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = "#f80";
            ctx.shadowColor = "#f60";
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        // 导弹本体：更大的发光弹头
        ctx.save();
        ctx.fillStyle = "#ff4";
        ctx.shadowColor = "#f80";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
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
class WingmanBullet {
    constructor(x, y, damage) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.removable = false;
        this.trail = [];
    }
    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5)
            this.trail.shift();
        this.y -= WINGMAN_BULLET_SPEED;
        if (this.y < -10)
            this.removable = true;
    }
    draw() {
        // 拖尾
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = (i + 1) / this.trail.length * 0.4;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = "#4f8";
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        // 子弹本体：更大更亮
        ctx.save();
        ctx.fillStyle = "#afa";
        ctx.shadowColor = "#4f8";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
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
// ========== 状态管理 ==========
const missiles = [];
const lightnings = [];
const laserBeams = [];
const wingmanBullets = [];
const hitFlashes = [];
const fireworkBursts = [];
let missileCooldown = 0;
let laserCooldown = 0;
let lightningCooldown = 0;
let wingmanCooldowns = []; // 动态长度，基于僚机数量
function clearSpecialWeapons() {
    missiles.length = 0;
    lightnings.length = 0;
    laserBeams.length = 0;
    wingmanBullets.length = 0;
    hitFlashes.length = 0;
    fireworkBursts.length = 0;
    missileCooldown = 0;
    laserCooldown = 0;
    lightningCooldown = 0;
    wingmanCooldowns = [];
}
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
// ========== 主更新/绘制 ==========
function updateAndDrawSpecialWeapons(heroX, heroY, heroW, heroH, curPhase, getEnemies, damageEnemy, slowEnemy) {
    if (curPhase !== PHASE_PLAY)
        return;
    const allEnemies = getEnemies();
    const buffs = getHeroBuffs();
    const firepowerMul = buffs.firepower > 0 ? buffConfig.firepower.damageMultiplier : 1;
    const heroCx = heroX + heroW / 2;
    const heroCy = heroY + heroH / 2;
    // ---- 追踪导弹 ----
    const missileLv = getWeaponLevel("homingMissile");
    if (missileLv > 0) {
        missileCooldown++;
        const idx = Math.min(missileLv, MISSILE_LEVELS.length) - 1;
        const cfg = MISSILE_LEVELS[idx];
        if (missileCooldown >= MISSILE_INTERVAL) {
            missileCooldown = 0;
            const baseDamage = cfg.damage * getDamagePassiveMultiplier() * firepowerMul;
            // 专属道具：核弹头
            const nukeMul = hasNukeWarhead() ? 2 : 1;
            const finalDamage = baseDamage * nukeMul;
            // 专属道具：爆炸范围
            const explosionRadius = cfg.explosionRadius * (1 + getExplosionRadiusBonus()) * (hasNukeWarhead() ? 3 : 1);
            // 专属道具：多重导弹
            const totalMissiles = cfg.count + getMultiMissileBonus();
            for (let i = 0; i < totalMissiles; i++) {
                const offsetX = (i - (totalMissiles - 1) / 2) * 15;
                missiles.push(new HomingMissile(heroCx + offsetX, heroY, finalDamage, explosionRadius));
            }
            playMissile();
        }
    }
    // 更新导弹
    for (let i = missiles.length - 1; i >= 0; i--) {
        const ms = missiles[i];
        const target = ms.update(allEnemies);
        // 碰撞检测
        if (!ms.removable) {
            for (const e of allEnemies) {
                if (e.die)
                    continue;
                const ecx = e.x + e.width / 2;
                const ecy = e.y + e.height / 2;
                const dx = ms.x - ecx;
                const dy = ms.y - ecy;
                if (Math.sqrt(dx * dx + dy * dy) < e.width / 2 + 5) {
                    // 命中
                    const isCrit = Math.random() < getCritChance();
                    const finalDmg = isCrit ? ms.damage * 2.0 : ms.damage;
                    damageEnemy(e, finalDmg, isCrit, true);
                    // 命中烟花散开特效：橙/黄/红多色粒子从命中点爆开
                    const burstRadius = ms.hasExplosion ? ms.explosionRadius : 25;
                    fireworkBursts.push(new FireworkBurst(ms.x, ms.y, burstRadius, ["#f80", "#ff4", "#f44", "#fa0"], 16));
                    // 命中爆炸音效
                    playMissileHit();
                    // 爆炸范围伤害
                    if (ms.hasExplosion && ms.explosionRadius > 0) {
                        for (const e2 of allEnemies) {
                            if (e2.die || e2.id === e.id)
                                continue;
                            const dx2 = ms.x - (e2.x + e2.width / 2);
                            const dy2 = ms.y - (e2.y + e2.height / 2);
                            if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < ms.explosionRadius) {
                                const aoeDmg = finalDmg * 0.5;
                                const aoeCrit = Math.random() < getCritChance();
                                damageEnemy(e2, aoeCrit ? aoeDmg * 2 : aoeDmg, aoeCrit, true);
                            }
                        }
                    }
                    ms.removable = true;
                    break;
                }
            }
        }
        if (ms.removable) {
            missiles.splice(i, 1);
        }
        else {
            ms.draw();
        }
    }
    // ---- 能量武器（激光+闪电） ----
    const energyLv = getWeaponLevel("energyWeapon");
    if (energyLv > 0) {
        const idx = Math.min(energyLv, ENERGY_LEVELS.length) - 1;
        const cfg = ENERGY_LEVELS[idx];
        // 专属道具：虚空能量 - 影响 chain range
        const effectiveChainRange = hasVoidEnergy() ? 999 : LIGHTNING_CHAIN_RANGE;
        // 激光部分（每 180 帧）
        laserCooldown++;
        if (laserCooldown >= LASER_INTERVAL) {
            laserCooldown = 0;
            // 专属道具：虚空能量 - 全屏激光
            const effectiveLaserLength = hasVoidEnergy() ? -1 : cfg.laserLength;
            const baseDamage = cfg.laserDamage * getDamagePassiveMultiplier() * firepowerMul;
            const beamLen = effectiveLaserLength === -1 ? heroCy + 20 : effectiveLaserLength;
            // 扫描激光路径上所有敌机，造成伤害
            const beamTop = heroCy - beamLen;
            for (const e of allEnemies) {
                if (e.die)
                    continue;
                const ecx = e.x + e.width / 2;
                const ecy = e.y + e.height / 2;
                // 检测 x 轴重叠（敌机中心在激光半宽范围内）
                if (Math.abs(ecx - heroCx) < LASER_HIT_HALF_WIDTH + e.width / 2) {
                    // 检测 y 轴范围（敌机在激光射程内）
                    if (ecy >= beamTop && ecy <= heroCy) {
                        const isCrit = Math.random() < getCritChance();
                        const finalDmg = isCrit ? baseDamage * 2.0 : baseDamage;
                        damageEnemy(e, finalDmg, isCrit, true);
                        // 激光命中冲击闪光
                        hitFlashes.push(new HitFlash(ecx, ecy, 12, "#8cf", 8));
                        // 专属道具：冰冻附加
                        const freezeSlow = getFreezeAddonSlow();
                        if (freezeSlow > 0) {
                            slowEnemy(e.id, freezeSlow, 60);
                        }
                    }
                }
            }
            // 创建激光视觉实体
            laserBeams.push(new LaserBeam(heroCx, heroCy, beamLen));
            playLaser();
        }
        // 闪电部分（每 120 帧）
        lightningCooldown++;
        if (lightningCooldown >= LIGHTNING_INTERVAL) {
            lightningCooldown = 0;
            // 找最近敌机
            let target = null;
            let minDist = Infinity;
            for (const e of allEnemies) {
                if (e.die)
                    continue;
                const dx = (e.x + e.width / 2) - heroCx;
                const dy = (e.y + e.height / 2) - heroCy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    target = e;
                }
            }
            if (target) {
                const baseDamage = cfg.lightningDamage * getDamagePassiveMultiplier() * firepowerMul;
                const isCrit = Math.random() < getCritChance();
                const finalDmg = isCrit ? baseDamage * 2.0 : baseDamage;
                damageEnemy(target, finalDmg, isCrit, true);
                // 闪电链首个目标命中闪光
                const tx = target.x + target.width / 2;
                const ty = target.y + target.height / 2;
                hitFlashes.push(new HitFlash(tx, ty, 16, "#48f", 8));
                // 专属道具：冰冻附加
                const freezeSlow = getFreezeAddonSlow();
                if (freezeSlow > 0) {
                    slowEnemy(target.id, freezeSlow, 60);
                }
                const hitIds = new Set([target.id]);
                const allSegments = [];
                // 初始线段：英雄→首个目标
                allSegments.push(...generateJaggedLine(heroCx, heroCy, tx, ty));
                // 链式跳跃
                let lastX = tx;
                let lastY = ty;
                // 专属道具：链式强化
                const totalChains = cfg.chains + getChainEnhanceBonus();
                for (let c = 0; c < totalChains; c++) {
                    let nextTarget = null;
                    let nextDist = Infinity;
                    for (const e of allEnemies) {
                        if (e.die || hitIds.has(e.id))
                            continue;
                        const dx = (e.x + e.width / 2) - lastX;
                        const dy = (e.y + e.height / 2) - lastY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < effectiveChainRange && dist < nextDist) {
                            nextDist = dist;
                            nextTarget = e;
                        }
                    }
                    if (!nextTarget)
                        break;
                    const nx = nextTarget.x + nextTarget.width / 2;
                    const ny = nextTarget.y + nextTarget.height / 2;
                    const chainDmg = finalDmg * 0.7; // 链式伤害衰减
                    const chainCrit = Math.random() < getCritChance();
                    damageEnemy(nextTarget, chainCrit ? chainDmg * 2.0 : chainDmg, chainCrit, true);
                    // 链式跳跃命中闪光
                    hitFlashes.push(new HitFlash(nx, ny, 10, "#48f", 6));
                    // 专属道具：冰冻附加
                    if (freezeSlow > 0) {
                        slowEnemy(nextTarget.id, freezeSlow, 60);
                    }
                    hitIds.add(nextTarget.id);
                    allSegments.push(...generateJaggedLine(lastX, lastY, nx, ny));
                    lastX = nx;
                    lastY = ny;
                }
                lightnings.push(new LightningBolt(allSegments, finalDmg, 0, hitIds));
                playLightning();
            }
        }
    }
    // 更新闪电视觉效果
    for (let i = lightnings.length - 1; i >= 0; i--) {
        lightnings[i].update();
        if (lightnings[i].removable) {
            lightnings.splice(i, 1);
        }
        else {
            lightnings[i].draw();
        }
    }
    // 更新激光视觉效果
    for (let i = laserBeams.length - 1; i >= 0; i--) {
        laserBeams[i].update();
        if (laserBeams[i].removable) {
            laserBeams.splice(i, 1);
        }
        else {
            laserBeams[i].draw();
        }
    }
    // ---- 僚机（基于被动叠加） ----
    const wingmanCount = getWingmanCount();
    if (wingmanCount > 0) {
        const baseDamage = (1 + (wingmanCount - 1) * 0.5) * getDamagePassiveMultiplier() * firepowerMul;
        const effectiveInterval = Math.max(1, Math.round(WINGMAN_INTERVAL / (1 + getFireRatePassiveBonus())));
        // 确保 cooldowns 数组长度匹配
        while (wingmanCooldowns.length < wingmanCount) {
            wingmanCooldowns.push(0);
        }
        for (let w = 0; w < wingmanCount; w++) {
            wingmanCooldowns[w]++;
            // 僚机分布在英雄两侧
            const sideOffset = (w % 2 === 0 ? -1 : 1) * (Math.floor(w / 2) + 1) * WINGMAN_OFFSET;
            const wx = heroCx + sideOffset;
            const wy = heroCy;
            // 射击
            if (wingmanCooldowns[w] >= effectiveInterval) {
                wingmanCooldowns[w] = 0;
                const bulletCount = hasBulletStorm() ? 2 : 1;
                for (let b = 0; b < bulletCount; b++) {
                    const bulletOffsetX = b === 0 ? -3 : 3;
                    wingmanBullets.push(new WingmanBullet(wx + bulletOffsetX, wy - heroH / 2, baseDamage));
                }
            }
            // 绘制僚机（小三角形飞船）
            ctx.save();
            ctx.fillStyle = "#4f8";
            ctx.shadowColor = "#4f8";
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.moveTo(wx, wy - 8);
            ctx.lineTo(wx + 6, wy + 4);
            ctx.lineTo(wx - 6, wy + 4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
    // 更新僚机子弹
    for (let i = wingmanBullets.length - 1; i >= 0; i--) {
        const wb = wingmanBullets[i];
        wb.update();
        if (!wb.removable) {
            // 碰撞检测
            for (const e of allEnemies) {
                if (e.die)
                    continue;
                const ecx = e.x + e.width / 2;
                const ecy = e.y + e.height / 2;
                if (Math.abs(wb.x - ecx) < e.width / 2 + 4 && Math.abs(wb.y - ecy) < e.height / 2 + 4) {
                    const isCrit = Math.random() < getCritChance();
                    const finalDmg = isCrit ? wb.damage * 2.0 : wb.damage;
                    damageEnemy(e, finalDmg, isCrit, true);
                    // 僚机命中闪光 + 专属音效
                    hitFlashes.push(new HitFlash(wb.x, wb.y, 10, "#4f8", 8));
                    playWingmanHit();
                    wb.removable = true;
                    break;
                }
            }
        }
        if (wb.removable) {
            wingmanBullets.splice(i, 1);
        }
        else {
            wb.draw();
        }
    }
    // 更新/绘制命中闪光
    for (let i = hitFlashes.length - 1; i >= 0; i--) {
        hitFlashes[i].update();
        if (hitFlashes[i].removable) {
            hitFlashes.splice(i, 1);
        }
        else {
            hitFlashes[i].draw();
        }
    }
    // 更新/绘制烟花散开
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
export { updateAndDrawSpecialWeapons, clearSpecialWeapons, };
