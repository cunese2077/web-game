// BOSS 管理模块（从 boss.ts 拆出）：触发检查/预警/生成/存活查询/重置
import { bossConfig } from "./config.js";
import { Boss } from "./bossEntity.js";
// BOSS 管理状态
let activeBoss = null;
let bossWarningTimer = 0; // 预警倒计时帧数
let triggeredBossLevels = new Set(); // 已触发的 BOSS 等级
let sessionBossKillCount = 0; // 本局击败 BOSS 计数
// 检查是否应触发 BOSS（在升级时调用）
function checkBossTrigger(level) {
    if (level < bossConfig.firstTriggerLevel)
        return false;
    // 检查是否为触发等级
    if ((level - bossConfig.firstTriggerLevel) % bossConfig.triggerInterval !== 0)
        return false;
    // 防止重复触发
    if (triggeredBossLevels.has(level))
        return false;
    triggeredBossLevels.add(level);
    return true;
}
// 开始 BOSS 预警
function startBossWarning() {
    bossWarningTimer = bossConfig.warningFrames;
}
// 预警帧更新，返回 true 表示预警结束，应进入 BOSS 战
function updateBossWarning() {
    if (bossWarningTimer > 0) {
        bossWarningTimer--;
        return bossWarningTimer === 0;
    }
    return false;
}
// 调试用：根据玩家当前等级注册对应的 BOSS 等级到 triggeredBossLevels
// 确保 spawnBoss() 生成的 bossIndex 与玩家等级匹配
function registerDebugBossLevel(level) {
    if (level < bossConfig.firstTriggerLevel)
        return;
    // 计算当前等级对应的 BOSS 触发等级：5,10,15,20,...
    const bossLevel = bossConfig.firstTriggerLevel +
        Math.floor((level - bossConfig.firstTriggerLevel) / bossConfig.triggerInterval) * bossConfig.triggerInterval;
    // 注册所有尚未触发的 BOSS 等级（保证 bossIndex 正确递增）
    for (let lv = bossConfig.firstTriggerLevel; lv <= bossLevel; lv += bossConfig.triggerInterval) {
        triggeredBossLevels.add(lv);
    }
}
// 生成 BOSS
function spawnBoss() {
    // bossIndex = 已触发数量 - 1
    const bossIndex = triggeredBossLevels.size - 1;
    activeBoss = new Boss(bossIndex);
}
// 更新 + 绘制 BOSS
function updateAndDrawBoss() {
    if (activeBoss && activeBoss.alive) {
        activeBoss.update();
        activeBoss.draw();
    }
}
// 获取当前 BOSS（供碰撞检测用）
function getActiveBoss() {
    return activeBoss;
}
// BOSS 是否存活
function isBossAlive() {
    return activeBoss !== null && activeBoss.alive;
}
// 清理 BOSS 状态（游戏重置时调用）
function clearBoss() {
    activeBoss = null;
    bossWarningTimer = 0;
    triggeredBossLevels = new Set();
    sessionBossKillCount = 0;
}
// 获取预警剩余帧数
function getBossWarningTimer() {
    return bossWarningTimer;
}
// 获取本局击败 BOSS 数
function getSessionBossKillCount() {
    return sessionBossKillCount;
}
// BOSS 实体击败回调：累加计数（由 bossEntity 的 _onDefeat 调用）
function incrementSessionBossKillCount() {
    sessionBossKillCount++;
}
export { checkBossTrigger, registerDebugBossLevel, startBossWarning, updateBossWarning, spawnBoss, updateAndDrawBoss, getActiveBoss, isBossAlive, clearBoss, getBossWarningTimer, getSessionBossKillCount, incrementSessionBossKillCount, };
