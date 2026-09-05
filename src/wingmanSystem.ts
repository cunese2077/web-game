// 僚机系统（从 specialWeapons.ts 拆出）：僚机绘制 + 子弹发射/碰撞 + 狼群导弹
import { ctx } from "./canvas.js";
import { playMissile, playWingmanHit } from "./audio.js";
import {
  getDamagePassiveMultiplier, getCritChance,
  getFireRatePassiveBonus, getWingmanCount, getWingmanDamageBonus,
  hasBulletStorm, hasAnnihilateSquad, hasWolfPack, hasPrismArray,
} from "./upgrade.js";
import {
  WINGMAN_BASE_DAMAGE, WINGMAN_DAMAGE_GROWTH,
  WINGMAN_INTERVAL, WINGMAN_OFFSET, WINGMAN_BULLET_SPEED,
  LIGHTNING_CHAIN_RANGE,
} from "./weaponLevels.js";
import { addHitFlash, addLightningBolt, generateJaggedLine } from "./weaponEffects.js";
import { pushMissile } from "./missileSystem.js";
import type { WeaponContext } from "./specialWeaponTypes.js";

class WingmanBullet {
  x: number;
  y: number;
  damage: number;
  removable: boolean;
  trail: { x: number; y: number }[];

  constructor(x: number, y: number, damage: number) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.removable = false;
    this.trail = [];
  }

  update(): void {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
    this.y -= WINGMAN_BULLET_SPEED;
    if (this.y < -10) this.removable = true;
  }

  draw(): void {
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

// ========== 状态管理 ==========
const wingmanBullets: WingmanBullet[] = [];
let wingmanCooldowns: number[] = [];  // 动态长度，基于僚机数量
let wingmanMissileCooldown = 0;       // 狼群战术：僚机导弹冷却

// 主更新：僚机绘制 + 射击 + 子弹碰撞（棱镜阵列闪电链）
function updateWingmanSystem(c: WeaponContext): void {
  const allEnemies = c.enemies;
  const wingmanCount = getWingmanCount();
  // 进化：歼灭编队 — 僚机数量 +2
  // 进化：棱镜阵列 — 僚机数量 +1
  const effectiveWingmanCount = wingmanCount + (hasAnnihilateSquad() ? 2 : 0) + (hasPrismArray() ? 1 : 0);
  if (effectiveWingmanCount > 0) {
    const baseDamage = (WINGMAN_BASE_DAMAGE + (wingmanCount - 1) * WINGMAN_DAMAGE_GROWTH) * (1 + getWingmanDamageBonus()) * getDamagePassiveMultiplier() * c.firepowerMul;
    // 进化：歼灭编队 — 僚机伤害 ×2
    const squadMul = hasAnnihilateSquad() ? 2 : 1;
    const effectiveDamage = baseDamage * squadMul;
    const effectiveInterval = Math.max(1, Math.round(WINGMAN_INTERVAL / (1 + getFireRatePassiveBonus())));

    // 确保 cooldowns 数组长度匹配
    while (wingmanCooldowns.length < effectiveWingmanCount) {
      wingmanCooldowns.push(0);
    }

    for (let w = 0; w < effectiveWingmanCount; w++) {
      wingmanCooldowns[w]++;
      // 僚机分布在英雄两侧
      const sideOffset = (w % 2 === 0 ? -1 : 1) * (Math.floor(w / 2) + 1) * WINGMAN_OFFSET;
      const wx = c.heroCx + sideOffset;
      const wy = c.heroCy;

      // 射击
      if (wingmanCooldowns[w] >= effectiveInterval) {
        wingmanCooldowns[w] = 0;
        const bulletCount = hasBulletStorm() ? 2 : 1;
        for (let b = 0; b < bulletCount; b++) {
          const bulletOffsetX = b === 0 ? -3 : 3;
          wingmanBullets.push(new WingmanBullet(wx + bulletOffsetX, wy - c.heroH / 2, effectiveDamage));
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

    // 进化：狼群战术 — 僚机每 60 帧发射追踪小导弹
    if (hasWolfPack()) {
      wingmanMissileCooldown++;
      if (wingmanMissileCooldown >= 60) {
        wingmanMissileCooldown = 0;
        const missileDmg = baseDamage * 0.6;
        const missileExplosion = 30;
        const fireCount = Math.min(effectiveWingmanCount, 2);
        for (let w = 0; w < fireCount; w++) {
          const sideOffset = (w % 2 === 0 ? -1 : 1) * WINGMAN_OFFSET;
          const wx = c.heroCx + sideOffset;
          pushMissile(wx, c.heroY, missileDmg, missileExplosion);
        }
        playMissile();
      }
    }
  }

  // ---- 更新僚机子弹 ----
  for (let i = wingmanBullets.length - 1; i >= 0; i--) {
    const wb = wingmanBullets[i];
    wb.update();
    if (!wb.removable) {
      // 碰撞检测
      for (const e of allEnemies) {
        if (e.die) continue;
        const ecx = e.x + e.width / 2;
        const ecy = e.y + e.height / 2;
        if (Math.abs(wb.x - ecx) < e.width / 2 + 4 && Math.abs(wb.y - ecy) < e.height / 2 + 4) {
          const isCrit = Math.random() < getCritChance();
          const finalDmg = isCrit ? wb.damage * 2.0 : wb.damage;
          c.damageEnemy(e, finalDmg, isCrit, true);
          // 僚机命中闪光 + 专属音效
          addHitFlash(wb.x, wb.y, 10, "#4f8", 8);
          playWingmanHit();
          // 进化：棱镜阵列 — 僚机子弹触发闪电链（1 跳）
          if (hasPrismArray()) {
            let nearestDist = LIGHTNING_CHAIN_RANGE;
            let nearestEnemy: typeof e | null = null;
            for (const e2 of allEnemies) {
              if (e2 === e || e2.die) continue;
              const e2cx = e2.x + e2.width / 2;
              const e2cy = e2.y + e2.height / 2;
              const dist = Math.hypot(e2cx - ecx, e2cy - ecy);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = e2;
              }
            }
            if (nearestEnemy) {
              const chainDmg = wb.damage * 0.5;
              c.damageEnemy(nearestEnemy, chainDmg, false, true);
              const segs = generateJaggedLine(ecx, ecy, nearestEnemy.x + nearestEnemy.width / 2, nearestEnemy.y + nearestEnemy.height / 2);
              addLightningBolt(segs, chainDmg, 0, new Set([nearestEnemy.id]));
            }
          }
          wb.removable = true;
          break;
        }
      }
    }
    if (wb.removable) {
      wingmanBullets.splice(i, 1);
    } else {
      wb.draw();
    }
  }
}

// 清理僚机状态（游戏重置时由门面调用）
function clearWingmans(): void {
  wingmanBullets.length = 0;
  wingmanCooldowns = [];
  wingmanMissileCooldown = 0;
}

export { updateWingmanSystem, clearWingmans };
