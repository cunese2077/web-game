// 特殊武器模块（门面）：实现拆分至子模块，消费方 import 路径不变（沿用 ui/boss/hero 拆分先例）
// - weaponLevels.ts：导弹/能量/僚机等级效果表与常量（upgradeUI 数值单一来源）
// - specialWeaponTypes.ts：EnemyProxy 接口 + WeaponContext 更新上下文
// - weaponEffects.ts：命中闪光/烟花/闪电/激光视觉实体 + 锯齿线生成
// - missileSystem.ts：追踪导弹（含狼群导弹注入）
// - energySystem.ts：激光 + 闪电链
// - wingmanSystem.ts：僚机绘制/子弹/狼群战术
import { getHeroBuffs } from "./hero.js";
import { buffConfig } from "./config.js";
import { PHASE_PLAY, PHASE_BOSS_WARNING, PHASE_BOSS } from "./constants.js";
import { updateMissileSystem, clearMissiles } from "./missileSystem.js";
import { updateEnergySystem, clearEnergyCooldowns } from "./energySystem.js";
import { updateWingmanSystem, clearWingmans } from "./wingmanSystem.js";
import { updateAndDrawWeaponEffects, clearWeaponEffects } from "./weaponEffects.js";
export { MISSILE_LEVELS, ENERGY_LEVELS, WINGMAN_BASE_DAMAGE, WINGMAN_DAMAGE_GROWTH } from "./weaponLevels.js";
// 主更新/绘制：组装共享上下文后分发给各武器系统，最后统一更新视觉特效
function updateAndDrawSpecialWeapons(heroX, heroY, heroW, heroH, curPhase, getEnemies, damageEnemy, slowEnemy) {
    if (curPhase !== PHASE_PLAY && curPhase !== PHASE_BOSS_WARNING && curPhase !== PHASE_BOSS)
        return;
    const buffs = getHeroBuffs();
    const firepowerMul = buffs.firepower > 0 ? buffConfig.firepower.damageMultiplier : 1;
    const ctxData = {
        heroX,
        heroY,
        heroW,
        heroH,
        heroCx: heroX + heroW / 2,
        heroCy: heroY + heroH / 2,
        enemies: getEnemies(),
        firepowerMul,
        damageEnemy,
        slowEnemy,
    };
    updateMissileSystem(ctxData);
    updateEnergySystem(ctxData);
    updateWingmanSystem(ctxData);
    updateAndDrawWeaponEffects();
}
// 清理全部特殊武器状态（游戏重置时调用）
function clearSpecialWeapons() {
    clearMissiles();
    clearEnergyCooldowns();
    clearWingmans();
    clearWeaponEffects();
}
export { updateAndDrawSpecialWeapons, clearSpecialWeapons };
