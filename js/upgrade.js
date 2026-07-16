// 升级系统模块 - 管理升级状态、出牌算法、属性计算
import { upgradePool, heroConfig, bulletConfig, buffConfig, getDifficultyConfig, rarityWeights, bossKillRarityBonus } from "./config.js";
import { getDifficulty } from "./settings.js";
import { getLevel } from "./level.js";
// ========== 升级状态 ==========
// weapons: weaponId → level (1~5)
// passives: passiveId → stack count
let weapons = new Map();
let passives = new Map();
// 待处理的升级次数（升级时累加，每次选择消耗1次）
let pendingLevelUps = 0;
// 当前展示的3个选项
let currentOffers = [];
// 当前剩余刷新次数
let rerollsLeft = 0;
// BOSS 击杀稀有度加成：击杀 big 敌机时累加，生成选项时消耗
let bossKillBonus = 0;
// 传说保底标记：下次升级选项保证至少 1 个传说道具
let bossLegendaryPending = false;
// 等级里程碑：到达这些等级时触发传说保底
const LEGENDARY_MILESTONES = [10, 20, 30];
// 已触发过的里程碑集合，避免重复触发
let triggeredMilestones = new Set();
// ========== 基础武器等级效果表 ==========
// 索引 = level - 1（Lv1在index 0）
const BASE_WEAPON_LEVELS = [
    { bulletCount: 3, damageBonus: 0, fireRateBonus: 0, piercing: false }, // Lv1
    { bulletCount: 3, damageBonus: 0.3, fireRateBonus: 0, piercing: false }, // Lv2
    { bulletCount: 4, damageBonus: 0.3, fireRateBonus: 0, piercing: false }, // Lv3
    { bulletCount: 4, damageBonus: 0.6, fireRateBonus: 0.2, piercing: false }, // Lv4
    { bulletCount: 5, damageBonus: 0.6, fireRateBonus: 0.2, piercing: false }, // Lv5
];
// ========== 状态管理 ==========
function initUpgrades() {
    weapons = new Map();
    passives = new Map();
    // 基础武器初始为 Lv1
    weapons.set("baseWeapon", 1);
    pendingLevelUps = 0;
    currentOffers = [];
    rerollsLeft = 0;
    bossKillBonus = 0;
    bossLegendaryPending = false;
    triggeredMilestones = new Set();
}
function getWeaponLevel(id) {
    return weapons.get(id) ?? 0;
}
function getPassiveStacks(id) {
    return passives.get(id) ?? 0;
}
function addPendingLevelUps(count) {
    pendingLevelUps += count;
}
function getPendingLevelUps() {
    return pendingLevelUps;
}
function getCurrentOffers() {
    return currentOffers;
}
function getRerollsLeft() {
    return rerollsLeft;
}
// ========== 出牌算法 ==========
// 收集当前所有可选项
function collectAvailableOffers() {
    const available = [];
    for (const def of upgradePool) {
        const currentLevel = def.type === "weapon"
            ? (weapons.get(def.id) ?? 0)
            : (passives.get(def.id) ?? 0);
        // 已达最大等级则跳过
        if (currentLevel >= def.maxLevel)
            continue;
        // 前置条件检查
        if (def.prerequisites.length > 0) {
            const allMet = def.prerequisites.every(preId => {
                const preDef = upgradePool.find(d => d.id === preId);
                if (!preDef)
                    return false;
                const preLevel = preDef.type === "weapon"
                    ? (weapons.get(preId) ?? 0)
                    : (passives.get(preId) ?? 0);
                const requiredLevel = def.prereqLevels[preId] ?? 1;
                return preLevel >= requiredLevel;
            });
            if (!allMet)
                continue;
        }
        available.push({
            upgradeId: def.id,
            currentLevel,
            nextLevel: currentLevel + 1,
            isNew: currentLevel === 0,
            def,
        });
    }
    return available;
}
// 从可选项中加权随机抽取 n 个（不重复）
// 权重越大出现概率越高：common(50) > rare(30) > epic(15)
// legendary 权重为 0，不能通过加权随机出现，只能通过 BOSS 保底机制获取
// BOSS 击杀加成仅对 epic 生效
function weightedRandomPick(offers, n) {
    // 计算每个选项的权重
    const weights = offers.map(o => {
        const base = rarityWeights[o.def.rarity] ?? 10;
        // BOSS 击杀加成仅对 epic 生效
        const bonus = o.def.rarity === "epic" ? bossKillBonus : 0;
        return base + bonus;
    });
    const result = [];
    const remaining = [...offers];
    const remainingWeights = [...weights];
    for (let k = 0; k < n && remaining.length > 0; k++) {
        const totalWeight = remainingWeights.reduce((sum, w) => sum + w, 0);
        let rand = Math.random() * totalWeight;
        let selectedIdx = 0;
        for (let i = 0; i < remaining.length; i++) {
            rand -= remainingWeights[i];
            if (rand <= 0) {
                selectedIdx = i;
                break;
            }
        }
        result.push(remaining[selectedIdx]);
        // 移除已选项，避免重复
        remaining.splice(selectedIdx, 1);
        remainingWeights.splice(selectedIdx, 1);
    }
    return result;
}
// 生成一组新选项（3 选 1）
function generateOffers() {
    const available = collectAvailableOffers();
    if (available.length === 0)
        return [];
    const result = [];
    // 检查 BOSS 传说保底
    const hasLegendaryGuarantee = consumeBossLegendary();
    if (hasLegendaryGuarantee) {
        // 筛选满足前置条件的传说道具
        const legendaryOffers = available.filter(o => o.def.rarity === "legendary");
        if (legendaryOffers.length > 0) {
            // 均匀随机选一个传说道具（legendary 权重为 0，不能用加权随机）
            const idx = Math.floor(Math.random() * legendaryOffers.length);
            result.push(legendaryOffers[idx]);
        }
    }
    // 填充剩余槽位
    const remainingSlots = 3 - result.length;
    if (remainingSlots > 0) {
        // 移除已选项
        const remaining = available.filter(o => !result.some(r => r.upgradeId === o.upgradeId));
        // 保证至少 1 个武器类选项（如果传说保底未覆盖且仍有武器可选）
        const weaponOffers = remaining.filter(o => o.def.type === "weapon");
        const otherOffers = remaining.filter(o => o.def.type !== "weapon");
        if (result.length === 0 && weaponOffers.length > 0 && otherOffers.length >= 2) {
            // 1 武器 + 2 其他
            const pickedWeapon = weightedRandomPick(weaponOffers, 1);
            const pickedOther = weightedRandomPick(otherOffers, 2);
            result.push(...pickedWeapon, ...pickedOther);
        }
        else if (remaining.length >= remainingSlots) {
            const picked = weightedRandomPick(remaining, remainingSlots);
            result.push(...picked);
        }
        else {
            result.push(...remaining);
        }
    }
    // 最终洗牌，避免武器总在第一个
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
// 进入升级选择状态，返回是否成功生成选项
function startUpgradeSelection() {
    if (pendingLevelUps <= 0)
        return false;
    // 检查等级里程碑：到达 10/20/30 级时触发传说保底
    const level = getLevel();
    for (const milestone of LEGENDARY_MILESTONES) {
        if (level >= milestone && !triggeredMilestones.has(milestone)) {
            triggeredMilestones.add(milestone);
            triggerBossLegendary();
        }
    }
    const diffConfig = getDifficultyConfig(getDifficulty());
    rerollsLeft = diffConfig.upgradeRerolls;
    currentOffers = generateOffers();
    // 生成选项后消耗 BOSS 击杀加成
    bossKillBonus = 0;
    return currentOffers.length > 0;
}
// 刷新选项
function rerollOffers() {
    if (rerollsLeft <= 0)
        return false;
    rerollsLeft--;
    currentOffers = generateOffers();
    return true;
}
// 应用升级选择
function applyUpgrade(offer) {
    const { upgradeId, def } = offer;
    if (def.type === "weapon") {
        weapons.set(upgradeId, (weapons.get(upgradeId) ?? 0) + 1);
    }
    else {
        passives.set(upgradeId, (passives.get(upgradeId) ?? 0) + 1);
    }
    // 消耗一次待处理升级
    pendingLevelUps--;
    // 如果还有待处理升级，生成新的选项
    if (pendingLevelUps > 0) {
        const diffConfig = getDifficultyConfig(getDifficulty());
        rerollsLeft = diffConfig.upgradeRerolls;
        currentOffers = generateOffers();
    }
    else {
        currentOffers = [];
        rerollsLeft = 0;
    }
}
// ========== 属性计算 ==========
// 基础武器当前等级
function getBaseWeaponLevel() {
    return weapons.get("baseWeapon") ?? 1;
}
// 子弹数量
function getBulletCount() {
    const lv = getBaseWeaponLevel();
    const idx = Math.min(lv, BASE_WEAPON_LEVELS.length) - 1;
    return BASE_WEAPON_LEVELS[idx].bulletCount;
}
// 基础武器伤害加成（乘法，如 0.3 = +30%）
function getBaseWeaponDamageBonus() {
    const lv = getBaseWeaponLevel();
    const idx = Math.min(lv, BASE_WEAPON_LEVELS.length) - 1;
    return BASE_WEAPON_LEVELS[idx].damageBonus;
}
// 基础武器射速加成（乘法，如 0.2 = +20%）
function getBaseWeaponFireRateBonus() {
    const lv = getBaseWeaponLevel();
    const idx = Math.min(lv, BASE_WEAPON_LEVELS.length) - 1;
    return BASE_WEAPON_LEVELS[idx].fireRateBonus;
}
// 穿透弹（机炮专属）
function hasPiercingItem() {
    return getPassiveStacks("piercing") > 0;
}
// 是否穿透
function hasPiercing() {
    return hasPiercingItem();
}
// 额外 HP（来自 hpUp 被动）
function getExtraHp() {
    return getPassiveStacks("hpUp");
}
// 伤害增幅被动总乘数（如3层 = 1 + 0.15*3 = 1.45）
function getDamagePassiveMultiplier() {
    return 1 + getPassiveStacks("damageUp") * 0.15;
}
// 射速被动总加成（加法，如2层 = 0.10*2 = 0.20）
function getFireRatePassiveBonus() {
    return getPassiveStacks("fireRateUp") * 0.10;
}
// 移速被动总加成
function getMoveSpeedBonus() {
    return getPassiveStacks("moveSpeedUp") * 0.08;
}
// 暴击率（来自 critChance 被动）
function getCritChance() {
    return getPassiveStacks("critChance") * 0.08;
}
// 护甲减伤（每层减少1点伤害，最低造成1点伤害）
function getArmorReduction() {
    return getPassiveStacks("armor");
}
// 僚机数量（机炮专属，每层+1架）
function getWingmanCount() {
    return getPassiveStacks("wingmanItem");
}
// 爆炸范围加成（导弹专属，每层+50%）
function getExplosionRadiusBonus() {
    return getPassiveStacks("explosionRadius") * 0.5;
}
// 多重导弹（导弹专属，每层+1枚）
function getMultiMissileBonus() {
    return getPassiveStacks("multiMissile");
}
// 链式强化（能量专属，每层+1跳）
function getChainEnhanceBonus() {
    return getPassiveStacks("chainEnhance");
}
// 冰冻附加（能量专属，每层减速+10%）
function getFreezeAddonSlow() {
    return getPassiveStacks("freezeAddon") * 0.1;
}
// 弹幕风暴（机炮传说，子弹数×2）
function hasBulletStorm() {
    return getPassiveStacks("bulletStorm") > 0;
}
// 核弹头（导弹传说，爆炸×3+伤害×2）
function hasNukeWarhead() {
    return getPassiveStacks("nukeWarhead") > 0;
}
// 虚空能量（能量传说，全屏穿透+无限链）
function hasVoidEnergy() {
    return getPassiveStacks("voidEnergy") > 0;
}
// BOSS 击杀加成：击杀 big 敌机时调用
function addBossKillBonus() {
    bossKillBonus += bossKillRarityBonus;
}
// BOSS 传说保底：击杀 big 敌机时标记，下次升级选项保证至少 1 个传说道具
function triggerBossLegendary() {
    bossLegendaryPending = true;
}
// 检查并消耗 BOSS 传说保底标记
function consumeBossLegendary() {
    if (bossLegendaryPending) {
        bossLegendaryPending = false;
        return true;
    }
    return false;
}
// 当前射击间隔（帧数）
function getBulletInterval() {
    // 基础武器射速加成 + 被动射速加成
    const totalFireRateBonus = getBaseWeaponFireRateBonus() + getFireRatePassiveBonus();
    const baseInterval = heroConfig.bulletInterval;
    // 射速加成减少射击间隔：interval = base / (1 + bonus)
    return Math.max(1, Math.round(baseInterval / (1 + totalFireRateBonus)));
}
// 当前子弹伤害（单发，不含火力buff）
function getBulletDamage() {
    const baseDamage = bulletConfig.baseDamage;
    const weaponDamageBonus = getBaseWeaponDamageBonus();
    // 伤害 = base × (1 + 武器伤害加成) × 被动伤害乘数
    return baseDamage * (1 + weaponDamageBonus) * getDamagePassiveMultiplier();
}
// 当前子弹伤害（含火力buff）
function getBulletDamageWithBuff(firepowerActive) {
    const baseDamage = getBulletDamage();
    return baseDamage * (firepowerActive ? buffConfig.firepower.damageMultiplier : 1);
}
// 当前最大HP
function getMaxHp() {
    return heroConfig.maxHp + getExtraHp();
}
export { initUpgrades, getWeaponLevel, getPassiveStacks, addPendingLevelUps, getPendingLevelUps, getCurrentOffers, getRerollsLeft, startUpgradeSelection, rerollOffers, applyUpgrade, addBossKillBonus, getBaseWeaponLevel, getBulletCount, getBaseWeaponDamageBonus, getBaseWeaponFireRateBonus, hasPiercing, hasPiercingItem, getExtraHp, getDamagePassiveMultiplier, getFireRatePassiveBonus, getMoveSpeedBonus, getCritChance, getArmorReduction, getWingmanCount, getExplosionRadiusBonus, getMultiMissileBonus, getChainEnhanceBonus, getFreezeAddonSlow, hasBulletStorm, hasNukeWarhead, hasVoidEnergy, getBulletInterval, getBulletDamage, getBulletDamageWithBuff, getMaxHp, };
