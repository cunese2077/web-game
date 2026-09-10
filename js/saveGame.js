// 中断续玩模块：游戏进行中把可恢复状态快照到 localStorage
// 设计：
//   - 只存"可重建"的进度数据（分数/等级/经验/Build/英雄 HP+位置），运行时实体（敌机/子弹/道具）不存，恢复后空场重开
//   - 保存时机：游戏中每 100 帧（5秒@20fps）自动存 + pagehide/切后台立即存
//   - 失效时机：游戏结束结算、暂停/结算界面返回主页
//   - 版本号防陈旧结构；解析失败静默丢弃（同 settings.ts 容错模式）
import { getGameScore } from "./score.js";
import { getLevel, getExp, getTotalExp } from "./level.js";
import { getPendingLevelUps } from "./upgrade.js";
const STORAGE_KEY = "web-game-save";
const SAVE_VERSION = 1;
// 由 engine 在保存时机调用：收集当前进度（weapons/passives 由 upgrade 模块导出的收集函数提供）
function saveGame(weapons, passives, bossPending, heroX, heroY, heroHp) {
    try {
        const snap = {
            version: SAVE_VERSION,
            savedAt: Date.now(),
            score: getGameScore(),
            level: getLevel(),
            exp: getExp(),
            totalExp: getTotalExp(),
            weapons,
            passives,
            pendingLevelUps: getPendingLevelUps(),
            bossPending,
            hero: { x: heroX, y: heroY, hp: heroHp },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    }
    catch {
        // localStorage 不可用（隐私模式/已满），静默忽略
    }
}
// 读取快照：不存在/版本不符/结构损坏返回 null
function loadGame() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return null;
        const snap = JSON.parse(raw);
        if (snap.version !== SAVE_VERSION)
            return null;
        // 结构防御：关键字段类型校验，损坏即丢弃
        if (typeof snap.score !== "number" || typeof snap.level !== "number" ||
            typeof snap.exp !== "number" || typeof snap.totalExp !== "number" ||
            typeof snap.weapons !== "object" || typeof snap.passives !== "object" ||
            typeof snap.pendingLevelUps !== "number" || typeof snap.bossPending !== "boolean" ||
            typeof snap.hero !== "object" || snap.hero === null)
            return null;
        return snap;
    }
    catch {
        return null;
    }
}
// 删除快照（游戏结束/放弃本局）
function clearSave() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    }
    catch {
        // 静默忽略
    }
}
export { saveGame, loadGame, clearSave };
