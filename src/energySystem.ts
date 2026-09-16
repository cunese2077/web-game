// 能量武器系统（从 specialWeapons.ts 拆出）：激光（路径范围伤害）+ 闪电链（链式跳跃）
import { playLaser, playLightning } from "./audio.js";
import {
  getWeaponLevel, getDamagePassiveMultiplier, getCritChance,
  getChainEnhanceBonus, getFreezeAddonSlow,
  hasVoidEnergy, hasThunderPierce, hasQuantumAnnihilate,
} from "./upgrade.js";
import {
  ENERGY_LEVELS, LASER_INTERVAL_MS, LIGHTNING_INTERVAL_MS,
  LASER_HIT_HALF_WIDTH, LIGHTNING_CHAIN_RANGE, ENEMY_SLOW_DURATION_MS,
} from "./weaponLevels.js";
import { addHitFlash, addLaserBeam, addLightningBolt, generateJaggedLine } from "./weaponEffects.js";
import { getDt } from "./frameTime.js";
import type { WeaponContext, EnemyProxy } from "./specialWeaponTypes.js";

// ========== 状态管理 ==========
let laserCooldownMs = 0;      // 激光冷却（ms，帧率无关）
let lightningCooldownMs = 0;  // 闪电冷却（ms，帧率无关）

// 主更新：激光 + 闪电链的发射与伤害结算（视觉实体注入 weaponEffects）
function updateEnergySystem(c: WeaponContext): void {
  const allEnemies = c.enemies;
  const energyLv = getWeaponLevel("energyWeapon");
  if (energyLv <= 0) return;

  const idx = Math.min(energyLv, ENERGY_LEVELS.length) - 1;
  const cfg = ENERGY_LEVELS[idx];

  // 专属道具：虚空能量 - 影响 chain range
  // 进化：量子歼灭 - 闪电链范围无限
  const effectiveChainRange = (hasVoidEnergy() || hasQuantumAnnihilate()) ? 999 : LIGHTNING_CHAIN_RANGE;

  // 激光部分（每 LASER_INTERVAL_MS 毫秒）
  // 进化：雷霆穿甲 — 激光冷却 -30%
  const effectiveLaserIntervalMs = hasThunderPierce() ? Math.round(LASER_INTERVAL_MS * 0.7) : LASER_INTERVAL_MS;
  laserCooldownMs += getDt();
  if (laserCooldownMs >= effectiveLaserIntervalMs) {
    laserCooldownMs = 0;
    // 专属道具：虚空能量 - 全屏激光
    const effectiveLaserLength = hasVoidEnergy() ? -1 : cfg.laserLength;
    const baseDamage = cfg.laserDamage * getDamagePassiveMultiplier() * c.firepowerMul;
    const beamLen = effectiveLaserLength === -1 ? c.heroCy + 20 : effectiveLaserLength;
    // 扫描激光路径上所有敌机，造成伤害
    const beamTop = c.heroCy - beamLen;
    for (const e of allEnemies) {
      if (e.die) continue;
      const ecx = e.x + e.width / 2;
      const ecy = e.y + e.height / 2;
      // 检测 x 轴重叠（敌机中心在激光半宽范围内）
      if (Math.abs(ecx - c.heroCx) < LASER_HIT_HALF_WIDTH + e.width / 2) {
        // 检测 y 轴范围（敌机在激光射程内）
        if (ecy >= beamTop && ecy <= c.heroCy) {
          const isCrit = Math.random() < getCritChance();
          const finalDmg = isCrit ? baseDamage * 2.0 : baseDamage;
          c.damageEnemy(e, finalDmg, isCrit, true);
          // 激光命中冲击闪光（ms 制：原 8 帧 × 50）
          addHitFlash(ecx, ecy, 12, "#8cf", 400);
          // 专属道具：冰冻附加
          const freezeSlow = getFreezeAddonSlow();
          if (freezeSlow > 0) {
            c.slowEnemy(e.id, freezeSlow, ENEMY_SLOW_DURATION_MS);
          }
        }
      }
    }
    // 创建激光视觉实体
    addLaserBeam(c.heroCx, c.heroCy, beamLen);
    playLaser();
  }

  // 闪电部分（每 LIGHTNING_INTERVAL_MS 毫秒）
  lightningCooldownMs += getDt();
  if (lightningCooldownMs >= LIGHTNING_INTERVAL_MS) {
    lightningCooldownMs = 0;
    // 找最近敌机
    let target: EnemyProxy | null = null;
    let minDist = Infinity;
    for (const e of allEnemies) {
      if (e.die) continue;
      const dx = (e.x + e.width / 2) - c.heroCx;
      const dy = (e.y + e.height / 2) - c.heroCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        target = e;
      }
    }
    if (target) {
      const baseDamage = cfg.lightningDamage * getDamagePassiveMultiplier() * c.firepowerMul;
      const isCrit = Math.random() < getCritChance();
      const finalDmg = isCrit ? baseDamage * 2.0 : baseDamage;
      c.damageEnemy(target, finalDmg, isCrit, true);
      // 闪电链首个目标命中闪光（ms 制：原 8 帧 × 50）
      const tx = target.x + target.width / 2;
      const ty = target.y + target.height / 2;
      addHitFlash(tx, ty, 16, "#48f", 400);
      // 专属道具：冰冻附加
      const freezeSlow = getFreezeAddonSlow();
      if (freezeSlow > 0) {
        c.slowEnemy(target.id, freezeSlow, ENEMY_SLOW_DURATION_MS);
      }

      const hitIds = new Set<number>([target.id]);
      const allSegments: { x1: number; y1: number; x2: number; y2: number }[] = [];

      // 初始线段：英雄→首个目标
      allSegments.push(...generateJaggedLine(c.heroCx, c.heroCy, tx, ty));

      // 链式跳跃
      let lastX = tx;
      let lastY = ty;
      // 专属道具：链式强化
      // 进化：量子歼灭 — 闪电链 +2 跳
      const totalChains = cfg.chains + getChainEnhanceBonus() + (hasQuantumAnnihilate() ? 2 : 0);
      for (let ch = 0; ch < totalChains; ch++) {
        let nextTarget: EnemyProxy | null = null;
        let nextDist = Infinity;
        for (const e of allEnemies) {
          if (e.die || hitIds.has(e.id)) continue;
          const dx = (e.x + e.width / 2) - lastX;
          const dy = (e.y + e.height / 2) - lastY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < effectiveChainRange && dist < nextDist) {
            nextDist = dist;
            nextTarget = e;
          }
        }
        if (!nextTarget) break;
        const nx = nextTarget.x + nextTarget.width / 2;
        const ny = nextTarget.y + nextTarget.height / 2;
        const chainDmg = finalDmg * 0.7; // 链式伤害衰减
        const chainCrit = Math.random() < getCritChance();
        c.damageEnemy(nextTarget, chainCrit ? chainDmg * 2.0 : chainDmg, chainCrit, true);
        // 链式跳跃命中闪光（ms 制：原 6 帧 × 50）
        addHitFlash(nx, ny, 10, "#48f", 300);
        // 专属道具：冰冻附加
        if (freezeSlow > 0) {
          c.slowEnemy(nextTarget.id, freezeSlow, ENEMY_SLOW_DURATION_MS);
        }
        hitIds.add(nextTarget.id);
        allSegments.push(...generateJaggedLine(lastX, lastY, nx, ny));
        lastX = nx;
        lastY = ny;
      }

      addLightningBolt(allSegments, finalDmg, 0, hitIds);
      playLightning();
    }
  }
}

// 清理能量武器冷却（游戏重置时由门面调用）
function clearEnergyCooldowns(): void {
  laserCooldownMs = 0;
  lightningCooldownMs = 0;
}

export { updateEnergySystem, clearEnergyCooldowns };
