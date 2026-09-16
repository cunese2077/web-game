// 追踪导弹系统（从 specialWeapons.ts 拆出）：导弹实体 + 发射/追踪/碰撞/爆炸结算
// 狼群战术的僚机导弹经 pushMissile 注入本系统统一更新
import { ctx, width, height } from "./canvas.js";
import { playMissile, playMissileHit } from "./audio.js";
import {
  getWeaponLevel, getDamagePassiveMultiplier, getCritChance,
  getExplosionRadiusBonus, getMultiMissileBonus,
  hasNukeWarhead, hasDoomBarrage, hasWolfPack, hasQuantumAnnihilate,
} from "./upgrade.js";
import { MISSILE_LEVELS, MISSILE_INTERVAL_MS, ENEMY_SLOW_DURATION_MS } from "./weaponLevels.js";
import { addFireworkBurst, addHitFlash } from "./weaponEffects.js";
import { getDt, getDtSec } from "./frameTime.js";
import type { WeaponContext, EnemyProxy } from "./specialWeaponTypes.js";

class HomingMissile {
  x: number;
  y: number;
  damage: number;
  explosionRadius: number;
  hasExplosion: boolean;
  trail: { x: number; y: number }[];
  removable: boolean;
  speedPerSec: number;  // 飞行速度 px/s（帧率无关）
  angle: number;        // 当前飞行角度
  turnRatePerSec: number; // 最大转向角速度 rad/s（帧率无关）

  constructor(x: number, y: number, damage: number, explosionRadius: number) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.explosionRadius = explosionRadius;
    this.hasExplosion = explosionRadius > 0;
    this.trail = [];
    this.removable = false;
    this.speedPerSec = 160;      // 原 8px/帧 × 20
    this.angle = -Math.PI / 2;   // 初始朝上
    this.turnRatePerSec = 3;     // 原 0.15 rad/帧 × 20（~8.6°/帧）
  }

  update(enemies: EnemyProxy[]): EnemyProxy | null {
    // 记录拖尾
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();

    // 寻找最近敌机
    let target: EnemyProxy | null = null;
    let minDist = Infinity;
    for (const e of enemies) {
      if (e.die) continue;
      const dx = e.x + e.width / 2 - this.x;
      const dy = e.y + e.height / 2 - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        target = e;
      }
    }

    if (target) {
      // 渐进转向：计算目标角度，限制每步转向量（角速度 × dt）
      const targetAngle = Math.atan2(
        target.y + target.height / 2 - this.y,
        target.x + target.width / 2 - this.x
      );
      let diff = targetAngle - this.angle;
      // 归一化到 [-π, π]
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      // 限制转向速率
      const maxTurn = this.turnRatePerSec * getDtSec();
      if (diff > maxTurn) diff = maxTurn;
      if (diff < -maxTurn) diff = -maxTurn;
      this.angle += diff;
    } else {
      // 无目标：渐进转向朝上（1 rad/s，原 0.05/帧）
      let diff = -Math.PI / 2 - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > 0.02) {
        this.angle += (diff > 0 ? 1 : -1) * getDtSec();
      }
    }

    this.x += Math.cos(this.angle) * this.speedPerSec * getDtSec();
    this.y += Math.sin(this.angle) * this.speedPerSec * getDtSec();

    // 出界检测
    if (this.y < -20 || this.y > height + 20 || this.x < -20 || this.x > width + 20) {
      this.removable = true;
    }

    return target;
  }

  draw(): void {
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

// ========== 状态管理 ==========
const missiles: HomingMissile[] = [];
let missileCooldownMs = 0;  // 发射冷却（ms，帧率无关）

// 注入接口：狼群战术僚机导弹由 wingmanSystem 构造后经此加入统一更新
function pushMissile(x: number, y: number, damage: number, explosionRadius: number): void {
  missiles.push(new HomingMissile(x, y, damage, explosionRadius));
}

// 主更新：发射 + 追踪 + 碰撞 + 爆炸范围伤害
function updateMissileSystem(c: WeaponContext): void {
  const allEnemies = c.enemies;

  // ---- 追踪导弹发射 ----
  const missileLv = getWeaponLevel("homingMissile");
  if (missileLv > 0) {
    missileCooldownMs += getDt();
    const idx = Math.min(missileLv, MISSILE_LEVELS.length) - 1;
    const cfg = MISSILE_LEVELS[idx];
    if (missileCooldownMs >= MISSILE_INTERVAL_MS) {
      missileCooldownMs = 0;
      const baseDamage = cfg.damage * getDamagePassiveMultiplier() * c.firepowerMul;
      // 专属道具：核弹头
      const nukeMul = hasNukeWarhead() ? 2 : 1;
      // 进化：末日弹幕 — 导弹伤害 +50%
      const doomMul = hasDoomBarrage() ? 1.5 : 1;
      const finalDamage = baseDamage * nukeMul * doomMul;
      // 专属道具：爆炸范围 + 核弹头保底爆炸
      const baseExplosion = hasNukeWarhead() ? Math.max(cfg.explosionRadius, 25) : cfg.explosionRadius;
      // 进化：末日弹幕 — 爆炸范围 +30%
      const doomExplosionMul = hasDoomBarrage() ? 1.3 : 1;
      // 进化：狼群战术 — 爆炸范围 +50%
      const wolfExplosionMul = hasWolfPack() ? 1.5 : 1;
      const explosionRadius = baseExplosion * (1 + getExplosionRadiusBonus()) * (hasNukeWarhead() ? 3 : 1) * doomExplosionMul * wolfExplosionMul;
      // 专属道具：多重导弹
      const totalMissiles = cfg.count + getMultiMissileBonus();
      for (let i = 0; i < totalMissiles; i++) {
        const offsetX = (i - (totalMissiles - 1) / 2) * 15;
        pushMissile(c.heroCx + offsetX, c.heroY, finalDamage, explosionRadius);
      }
      playMissile();
    }
  }

  // ---- 更新导弹 ----
  for (let i = missiles.length - 1; i >= 0; i--) {
    const ms = missiles[i];
    ms.update(allEnemies);
    // 碰撞检测
    if (!ms.removable) {
      for (const e of allEnemies) {
        if (e.die) continue;
        const ecx = e.x + e.width / 2;
        const ecy = e.y + e.height / 2;
        const dx = ms.x - ecx;
        const dy = ms.y - ecy;
        if (Math.sqrt(dx * dx + dy * dy) < e.width / 2 + 5) {
          // 命中
          const isCrit = Math.random() < getCritChance();
          const finalDmg = isCrit ? ms.damage * 2.0 : ms.damage;
          c.damageEnemy(e, finalDmg, isCrit, true);
          // 命中烟花散开特效：橙/黄/红多色粒子从命中点爆开
          const burstRadius = ms.hasExplosion ? ms.explosionRadius : 25;
          addFireworkBurst(ms.x, ms.y, burstRadius, ["#f80", "#ff4", "#f44", "#fa0"], 16);
          // 命中爆炸音效
          playMissileHit();
          // 爆炸范围伤害
          if (ms.hasExplosion && ms.explosionRadius > 0) {
            for (const e2 of allEnemies) {
              if (e2.die || e2.id === e.id) continue;
              const dx2 = ms.x - (e2.x + e2.width / 2);
              const dy2 = ms.y - (e2.y + e2.height / 2);
              if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < ms.explosionRadius) {
                const aoeDmg = finalDmg * 0.5;
                const aoeCrit = Math.random() < getCritChance();
                c.damageEnemy(e2, aoeCrit ? aoeDmg * 2 : aoeDmg, aoeCrit, true);
              }
            }
          }
          // 进化：量子歼灭 — 导弹命中触发 EMP 脉冲（30px 范围减速 3 秒）
          if (hasQuantumAnnihilate()) {
            const empRadius = 30;
            for (const e2 of allEnemies) {
              if (e2.die) continue;
              const dx2 = ms.x - (e2.x + e2.width / 2);
              const dy2 = ms.y - (e2.y + e2.height / 2);
              if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < empRadius) {
                c.slowEnemy(e2.id, 0.4, ENEMY_SLOW_DURATION_MS);
              }
            }
            // EMP 视觉闪光（ms 制：原 12 帧 × 50）
            addHitFlash(ms.x, ms.y, empRadius, "#4af", 600);
          }
          ms.removable = true;
          break;
        }
      }
    }
    if (ms.removable) {
      missiles.splice(i, 1);
    } else {
      ms.draw();
    }
  }
}

// 清理导弹状态（游戏重置时由门面调用）
function clearMissiles(): void {
  missiles.length = 0;
  missileCooldownMs = 0;
}

export { updateMissileSystem, pushMissile, clearMissiles };
