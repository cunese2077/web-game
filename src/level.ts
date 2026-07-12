// 等级管理模块（独立于 hero.ts，避免循环依赖）
import { levelConfig } from "./config.js";
import type { LevelBonuses, EnemyType } from "./types.js";

let level: number = 1;
let exp: number = 0;
let totalExp: number = 0;

// 升级所需经验：base + growth × (level - 1)^exponent
function expToNext(lv: number): number {
  if (lv >= levelConfig.maxLevel) return 0;
  return Math.floor(levelConfig.base + levelConfig.growth * Math.pow(lv - 1, levelConfig.exponent));
}

function getLevel(): number {
  return level;
}

function getExp(): number {
  return exp;
}

function getExpToNext(): number {
  return expToNext(level);
}

function getTotalExp(): number {
  return totalExp;
}

// 增加经验，返回升级次数
function addExp(amount: number): number {
  if (level >= levelConfig.maxLevel) return 0;

  totalExp += amount;
  exp += amount;

  let levelsGained: number = 0;
  while (level < levelConfig.maxLevel && exp >= expToNext(level)) {
    exp -= expToNext(level);
    level++;
    levelsGained++;
  }

  // 满级后经验不再累积超过所需
  if (level >= levelConfig.maxLevel) {
    exp = 0;
  }

  return levelsGained;
}

function resetLevel(): void {
  level = 1;
  exp = 0;
  totalExp = 0;
}

// 计算当前等级的属性加成（所有规则从 levelConfig.bonuses 读取，无硬编码）
function getLevelBonuses(): LevelBonuses {
  const lv = level;
  const b = levelConfig.bonuses;

  // HP 加成：统计已达到的等级点数量
  let extraHp: number = 0;
  for (const bonusLv of b.hpBonusLevels) {
    if (lv >= bonusLv) extraHp++;
  }

  // 子弹伤害加成：每级 +perLevel，累计至 maxLevel 级封顶
  const damageLv = Math.min(lv, b.damageBonus.maxLevel);
  const extraDamage: number = damageLv * b.damageBonus.perLevel;

  // 射击间隔减少：仅在 startLevel~endLevel 区间内，每 perLevels 级触发
  let bulletIntervalReduction: number = 0;
  if (lv >= b.bulletInterval.startLevel) {
    const effectiveLv = Math.min(lv, b.bulletInterval.endLevel);
    const triggered = Math.floor((effectiveLv - b.bulletInterval.startLevel + 1) / b.bulletInterval.perLevels);
    bulletIntervalReduction = triggered * b.bulletInterval.reduction;
  }

  // Buff 持续倍率：仅在 startLevel~endLevel 区间内，每 perLevels 级触发
  let buffDurationMultiplier: number = 1;
  if (lv >= b.buffDuration.startLevel) {
    const effectiveLv = Math.min(lv, b.buffDuration.endLevel);
    const triggered = Math.floor((effectiveLv - b.buffDuration.startLevel + 1) / b.buffDuration.perLevels);
    buffDurationMultiplier = Math.pow(b.buffDuration.multiplier, triggered);
  }

  return {
    extraHp,
    extraDamage,
    bulletIntervalReduction,
    buffDurationMultiplier,
  };
}

// 获取敌机经验奖励
function getExpReward(enemyType: EnemyType): number {
  if (enemyType === "big") return levelConfig.expRewards.big;
  if (enemyType === "medium") return levelConfig.expRewards.medium;
  return levelConfig.expRewards.small;
}

export {
  getLevel,
  getExp,
  getExpToNext,
  getTotalExp,
  addExp,
  resetLevel,
  getLevelBonuses,
  getExpReward,
};
