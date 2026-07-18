// 等级管理模块（独立于 hero.ts，避免循环依赖）
import { levelConfig } from "./config.js";
let level = 1;
let exp = 0;
let totalExp = 0;
// 升级所需经验：base + growth × (level - 1)^exponent
function expToNext(lv) {
    if (lv >= levelConfig.maxLevel)
        return 0;
    return Math.floor(levelConfig.base + levelConfig.growth * Math.pow(lv - 1, levelConfig.exponent));
}
function getLevel() {
    return level;
}
function getExp() {
    return exp;
}
function getExpToNext() {
    return expToNext(level);
}
function getTotalExp() {
    return totalExp;
}
// 增加经验，返回升级次数
function addExp(amount) {
    if (level >= levelConfig.maxLevel)
        return 0;
    totalExp += amount;
    exp += amount;
    let levelsGained = 0;
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
function resetLevel() {
    level = 1;
    exp = 0;
    totalExp = 0;
}
// 获取敌机经验奖励
function getExpReward(enemyType) {
    if (enemyType === "big")
        return levelConfig.expRewards.big;
    if (enemyType === "elite")
        return levelConfig.expRewards.elite;
    if (enemyType === "medium")
        return levelConfig.expRewards.medium;
    return levelConfig.expRewards.small;
}
export { getLevel, getExp, getExpToNext, getTotalExp, addExp, resetLevel, getExpReward, };
