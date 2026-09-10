// 分数管理模块（独立于 hero.ts，避免循环依赖）
let gameScore = 0;
function getGameScore() {
    return gameScore;
}
function resetGameScore() {
    gameScore = 0;
}
function addGameScore(score) {
    gameScore += score;
}
// 中断续玩：从快照恢复分数
function restoreGameScore(savedScore) {
    gameScore = Math.max(0, savedScore);
}
export { getGameScore, resetGameScore, addGameScore, restoreGameScore };
