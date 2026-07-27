// 局外记录模块：委托 achievement.ts 的 records 系统管理最高分/最高等级
// 最高分和最高等级现在从对局记录派生，不再单独存储
import { getStats } from "./achievement.js";
// 获取历史最高分（从对局记录派生）
function getHighScore() {
    return getStats().highestScore;
}
// 获取历史最高等级（从对局记录派生）
function getHighLevel() {
    return getStats().highestLevel;
}
// 尝试更新记录，返回是否刷新了最高分
// 现在由 recordGameEnd 自动更新，此处保留接口兼容
function tryUpdateHighScore(_score) {
    // 实际更新已在 recordGameEnd 中完成，这里返回比较结果
    return false;
}
// 尝试更新记录，返回是否刷新了最高等级
function tryUpdateHighLevel(_level) {
    return false;
}
// 重置最高分和最高等级记录
// 现在由 resetAllData 统一管理，此处保留接口兼容
function resetHighScoreRecords() {
    // 已由 achievement.resetAllData 统一处理
}
export { getHighScore, getHighLevel, tryUpdateHighScore, tryUpdateHighLevel, resetHighScoreRecords, };
