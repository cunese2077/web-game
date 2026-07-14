// 等级管理模块（独立于 hero.ts，避免循环依赖）
import { levelConfig } from "./config.js";
import type { EnemyType } from "./types.js";

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
  getExpReward,
};
