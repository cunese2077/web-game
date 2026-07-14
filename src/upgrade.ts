// 升级系统模块 - 管理升级状态、出牌算法、属性计算
import { upgradePool, heroConfig, bulletConfig, buffConfig, getDifficultyConfig, rarityWeights, bossKillRarityBonus } from "./config.js";
import { getDifficulty } from "./settings.js";
import type { UpgradeDef, UpgradeOffer } from "./types.js";

// ========== 升级状态 ==========
// weapons: weaponId → level (1~5)
// passives: passiveId → stack count
let weapons: Map<string, number> = new Map();
let passives: Map<string, number> = new Map();

// 待处理的升级次数（升级时累加，每次选择消耗1次）
let pendingLevelUps: number = 0;

// 当前展示的3个选项
let currentOffers: UpgradeOffer[] = [];
// 当前剩余刷新次数
let rerollsLeft: number = 0;

// BOSS 击杀稀有度加成：击杀 big 敌机时累加，生成选项时消耗
let bossKillBonus: number = 0;

// ========== 基础武器等级效果表 ==========
// 索引 = level - 1（Lv1在index 0）
const BASE_WEAPON_LEVELS: { bulletCount: number; damageBonus: number; fireRateBonus: number; piercing: boolean }[] = [
  { bulletCount: 3, damageBonus: 0,    fireRateBonus: 0,   piercing: false },  // Lv1
  { bulletCount: 3, damageBonus: 0.3,  fireRateBonus: 0,   piercing: false },  // Lv2
  { bulletCount: 4, damageBonus: 0.3,  fireRateBonus: 0,   piercing: false },  // Lv3
  { bulletCount: 4, damageBonus: 0.6,  fireRateBonus: 0.2, piercing: false },  // Lv4
  { bulletCount: 5, damageBonus: 0.6,  fireRateBonus: 0.2, piercing: true  },  // Lv5
];

// ========== 状态管理 ==========

function initUpgrades(): void {
  weapons = new Map();
  passives = new Map();
  // 基础武器初始为 Lv1
  weapons.set("baseWeapon", 1);
  pendingLevelUps = 0;
  currentOffers = [];
  rerollsLeft = 0;
  bossKillBonus = 0;
}

function getWeaponLevel(id: string): number {
  return weapons.get(id) ?? 0;
}

function getPassiveStacks(id: string): number {
  return passives.get(id) ?? 0;
}

function addPendingLevelUps(count: number): void {
  pendingLevelUps += count;
}

function getPendingLevelUps(): number {
  return pendingLevelUps;
}

function getCurrentOffers(): UpgradeOffer[] {
  return currentOffers;
}

function getRerollsLeft(): number {
  return rerollsLeft;
}

// ========== 出牌算法 ==========

// 收集当前所有可选项
function collectAvailableOffers(): UpgradeOffer[] {
  const available: UpgradeOffer[] = [];

  for (const def of upgradePool) {
    const currentLevel = def.type === "weapon"
      ? (weapons.get(def.id) ?? 0)
      : (passives.get(def.id) ?? 0);

    // 已达最大等级则跳过
    if (currentLevel >= def.maxLevel) continue;

    // 前置条件检查
    if (def.prerequisites.length > 0) {
      const allMet = def.prerequisites.every(preId => {
        const preDef = upgradePool.find(d => d.id === preId);
        if (!preDef) return false;
        const preLevel = preDef.type === "weapon"
          ? (weapons.get(preId) ?? 0)
          : (passives.get(preId) ?? 0);
        return preLevel > 0;
      });
      if (!allMet) continue;
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
// 权重越大出现概率越高：common(50) > rare(30) > epic(15) > legendary(5)
// BOSS 击杀加成仅对 epic/legendary 生效
function weightedRandomPick(offers: UpgradeOffer[], n: number): UpgradeOffer[] {
  // 计算每个选项的权重
  const weights: number[] = offers.map(o => {
    const base = rarityWeights[o.def.rarity] ?? 10;
    // BOSS 击杀加成仅对 epic/legendary 生效
    const bonus = (o.def.rarity === "epic" || o.def.rarity === "legendary") ? bossKillBonus : 0;
    return base + bonus;
  });

  const result: UpgradeOffer[] = [];
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
function generateOffers(): UpgradeOffer[] {
  const available = collectAvailableOffers();
  if (available.length === 0) return [];

  // 保证至少 1 个武器类选项（如果有可用的）
  const weaponOffers = available.filter(o => o.def.type === "weapon");
  const otherOffers = available.filter(o => o.def.type !== "weapon");

  const result: UpgradeOffer[] = [];

  if (weaponOffers.length > 0 && otherOffers.length >= 2) {
    // 1 武器 + 2 其他
    const pickedWeapon = weightedRandomPick(weaponOffers, 1);
    const pickedOther = weightedRandomPick(otherOffers, 2);
    result.push(...pickedWeapon, ...pickedOther);
  } else if (available.length >= 3) {
    // 不保证武器（可能全是被动或全是武器）
    const picked = weightedRandomPick(available, 3);
    result.push(...picked);
  } else {
    // 可选项不足3个
    result.push(...available);
  }

  // 最终洗牌，避免武器总在第一个
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// 进入升级选择状态，返回是否成功生成选项
function startUpgradeSelection(): boolean {
  if (pendingLevelUps <= 0) return false;

  const diffConfig = getDifficultyConfig(getDifficulty());
  rerollsLeft = diffConfig.upgradeRerolls;
  currentOffers = generateOffers();
  // 生成选项后消耗 BOSS 击杀加成
  bossKillBonus = 0;
  return currentOffers.length > 0;
}

// 刷新选项
function rerollOffers(): boolean {
  if (rerollsLeft <= 0) return false;
  rerollsLeft--;
  currentOffers = generateOffers();
  return true;
}

// 应用升级选择
function applyUpgrade(offer: UpgradeOffer): void {
  const { upgradeId, def } = offer;

  if (def.type === "weapon") {
    weapons.set(upgradeId, (weapons.get(upgradeId) ?? 0) + 1);
  } else {
    passives.set(upgradeId, (passives.get(upgradeId) ?? 0) + 1);
  }

  // 消耗一次待处理升级
  pendingLevelUps--;

  // 如果还有待处理升级，生成新的选项
  if (pendingLevelUps > 0) {
    const diffConfig = getDifficultyConfig(getDifficulty());
    rerollsLeft = diffConfig.upgradeRerolls;
    currentOffers = generateOffers();
  } else {
    currentOffers = [];
    rerollsLeft = 0;
  }
}

// ========== 属性计算 ==========

// 基础武器当前等级
function getBaseWeaponLevel(): number {
  return weapons.get("baseWeapon") ?? 1;
}

// 子弹数量
function getBulletCount(): number {
  const lv = getBaseWeaponLevel();
  const idx = Math.min(lv, BASE_WEAPON_LEVELS.length) - 1;
  return BASE_WEAPON_LEVELS[idx].bulletCount;
}

// 基础武器伤害加成（乘法，如 0.3 = +30%）
function getBaseWeaponDamageBonus(): number {
  const lv = getBaseWeaponLevel();
  const idx = Math.min(lv, BASE_WEAPON_LEVELS.length) - 1;
  return BASE_WEAPON_LEVELS[idx].damageBonus;
}

// 基础武器射速加成（乘法，如 0.2 = +20%）
function getBaseWeaponFireRateBonus(): number {
  const lv = getBaseWeaponLevel();
  const idx = Math.min(lv, BASE_WEAPON_LEVELS.length) - 1;
  return BASE_WEAPON_LEVELS[idx].fireRateBonus;
}

// 是否穿透
function hasPiercing(): boolean {
  const lv = getBaseWeaponLevel();
  const idx = Math.min(lv, BASE_WEAPON_LEVELS.length) - 1;
  return BASE_WEAPON_LEVELS[idx].piercing;
}

// 额外 HP（来自 hpUp 被动）
function getExtraHp(): number {
  return getPassiveStacks("hpUp");
}

// 伤害增幅被动总乘数（如3层 = 1 + 0.15*3 = 1.45）
function getDamagePassiveMultiplier(): number {
  return 1 + getPassiveStacks("damageUp") * 0.15;
}

// 射速被动总加成（加法，如2层 = 0.10*2 = 0.20）
function getFireRatePassiveBonus(): number {
  return getPassiveStacks("fireRateUp") * 0.10;
}

// 移速被动总加成
function getMoveSpeedBonus(): number {
  return getPassiveStacks("moveSpeedUp") * 0.08;
}

// 暴击率（来自 critChance 被动）
function getCritChance(): number {
  return getPassiveStacks("critChance") * 0.08;
}

// 护盾延长倍率（来自 shieldExtend 被动）
function getShieldExtendMultiplier(): number {
  return 1 + getPassiveStacks("shieldExtend") * 0.3;
}

// 生命汲取概率（来自 lifeSteal 被动，每层 15% 概率回复 1 HP）
function getLifeStealChance(): number {
  return getPassiveStacks("lifeSteal") * 0.15;
}

// BOSS 击杀加成：击杀 big 敌机时调用
function addBossKillBonus(): void {
  bossKillBonus += bossKillRarityBonus;
}

// 当前射击间隔（帧数）
function getBulletInterval(): number {
  // 基础武器射速加成 + 被动射速加成
  const totalFireRateBonus = getBaseWeaponFireRateBonus() + getFireRatePassiveBonus();
  const baseInterval = heroConfig.bulletInterval;
  // 射速加成减少射击间隔：interval = base / (1 + bonus)
  return Math.max(1, Math.round(baseInterval / (1 + totalFireRateBonus)));
}

// 当前子弹伤害（单发，不含火力buff）
function getBulletDamage(): number {
  const baseDamage = bulletConfig.baseDamage;
  const weaponDamageBonus = getBaseWeaponDamageBonus();
  // 伤害 = base × (1 + 武器伤害加成) × 被动伤害乘数
  return baseDamage * (1 + weaponDamageBonus) * getDamagePassiveMultiplier();
}

// 当前子弹伤害（含火力buff）
function getBulletDamageWithBuff(firepowerActive: boolean): number {
  const baseDamage = getBulletDamage();
  return baseDamage * (firepowerActive ? buffConfig.firepower.damageMultiplier : 1);
}

// 当前最大HP
function getMaxHp(): number {
  return heroConfig.maxHp + getExtraHp();
}

export {
  initUpgrades,
  getWeaponLevel,
  getPassiveStacks,
  addPendingLevelUps,
  getPendingLevelUps,
  getCurrentOffers,
  getRerollsLeft,
  startUpgradeSelection,
  rerollOffers,
  applyUpgrade,
  addBossKillBonus,
  getBaseWeaponLevel,
  getBulletCount,
  getBaseWeaponDamageBonus,
  getBaseWeaponFireRateBonus,
  hasPiercing,
  getExtraHp,
  getDamagePassiveMultiplier,
  getFireRatePassiveBonus,
  getMoveSpeedBonus,
  getCritChance,
  getShieldExtendMultiplier,
  getLifeStealChance,
  getBulletInterval,
  getBulletDamage,
  getBulletDamageWithBuff,
  getMaxHp,
};
