const STORAGE_KEY = "webgame_achievement";
const ACHIEVEMENT_DEFS = [
    { id: "first_game", label: "achievement.firstGame",
        tiers: [
            { threshold: 1, desc: "achievement.firstGame.bronze" },
            { threshold: 3, desc: "achievement.firstGame.silver" },
            { threshold: 5, desc: "achievement.firstGame.gold" },
        ],
        getStat: (s) => s.totalGames },
    { id: "score", label: "achievement.score",
        tiers: [
            { threshold: 1000, desc: "achievement.score.bronze" },
            { threshold: 5000, desc: "achievement.score.silver" },
            { threshold: 10000, desc: "achievement.score.gold" },
        ],
        getStat: (s) => s.highestScore },
    { id: "level", label: "achievement.level",
        tiers: [
            { threshold: 10, desc: "achievement.level.bronze" },
            { threshold: 20, desc: "achievement.level.silver" },
            { threshold: 30, desc: "achievement.level.gold" },
        ],
        getStat: (s) => s.highestLevel },
    { id: "boss_kill", label: "achievement.bossKill",
        tiers: [
            { threshold: 1, desc: "achievement.bossKill.bronze" },
            { threshold: 5, desc: "achievement.bossKill.silver" },
            { threshold: 10, desc: "achievement.bossKill.gold" },
        ],
        getStat: (s) => s.totalBossKills },
    { id: "kills", label: "achievement.kills",
        tiers: [
            { threshold: 100, desc: "achievement.kills.bronze" },
            { threshold: 500, desc: "achievement.kills.silver" },
            { threshold: 1000, desc: "achievement.kills.gold" },
        ],
        getStat: (s) => s.totalKills },
    { id: "games", label: "achievement.games",
        tiers: [
            { threshold: 10, desc: "achievement.games.bronze" },
            { threshold: 25, desc: "achievement.games.silver" },
            { threshold: 50, desc: "achievement.games.gold" },
        ],
        getStat: (s) => s.totalGames },
    { id: "no_damage", label: "achievement.noDamage",
        tiers: [
            { threshold: 1, desc: "achievement.noDamage.bronze" },
            { threshold: 3, desc: "achievement.noDamage.silver" },
            { threshold: 5, desc: "achievement.noDamage.gold" },
        ],
        getStat: (s) => s.noDamageGames },
    { id: "hard_clear", label: "achievement.hardClear",
        tiers: [
            { threshold: 1, desc: "achievement.hardClear.bronze" },
            { threshold: 3, desc: "achievement.hardClear.silver" },
            { threshold: 5, desc: "achievement.hardClear.gold" },
        ],
        getStat: (s) => s.hardGames },
    { id: "single_kills", label: "achievement.singleKills",
        tiers: [
            { threshold: 50, desc: "achievement.singleKills.bronze" },
            { threshold: 100, desc: "achievement.singleKills.silver" },
            { threshold: 200, desc: "achievement.singleKills.gold" },
        ],
        getStat: (s) => s.highestKills },
];
// ========== 数据存储 ==========
let records = [];
// 成就分档等级：Record<achievementId, tier(0-3)>
let achievements = {};
let lastGame = {
    score: 0, level: 0, kills: 0, bossKills: 0,
    difficulty: "normal", damageTaken: 0, newAchievementTiers: [],
};
// ========== 派生统计计算 ==========
function computeStats() {
    let totalKills = 0, totalBossKills = 0, totalScore = 0, highestLevel = 0, highestScore = 0;
    let hardGames = 0, noDamageGames = 0, highestKills = 0;
    for (const r of records) {
        totalKills += r.kills;
        totalBossKills += r.bossKills;
        totalScore += r.score;
        if (r.level > highestLevel)
            highestLevel = r.level;
        if (r.score > highestScore)
            highestScore = r.score;
        if (r.kills > highestKills)
            highestKills = r.kills;
        if (r.difficulty === "hard")
            hardGames++;
        if (r.damageTaken === 0)
            noDamageGames++;
    }
    return { totalGames: records.length, totalKills, totalBossKills, totalScore, highestLevel, highestScore, hardGames, noDamageGames, highestKills };
}
// 计算成就当前档位（0=未解锁, 1=铜, 2=银, 3=金）
function computeTier(def, stats) {
    const stat = def.getStat(stats);
    let tier = 0;
    for (let i = 0; i < def.tiers.length; i++) {
        if (stat >= def.tiers[i].threshold) {
            tier = i + 1;
        }
    }
    return tier;
}
// ========== localStorage 读写 ==========
function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.records)) {
                records = parsed.records;
                // 迁移：旧版 achievements 为 Record<string, boolean>，新版为 Record<string, number>
                if (parsed.achievements) {
                    const ach = parsed.achievements;
                    for (const key of Object.keys(ach)) {
                        // 旧版 boolean true → 铜档(1)
                        achievements[key] = typeof ach[key] === "boolean" ? (ach[key] ? 1 : 0) : ach[key];
                    }
                }
                // 迁移旧版记录：没有 difficulty/damageTaken 字段
                for (const r of records) {
                    if (!r.difficulty)
                        r.difficulty = "normal";
                    if (r.damageTaken === undefined)
                        r.damageTaken = -1; // 未知，不计入无伤
                }
            }
            else if (typeof parsed.totalGames === "number") {
                // 旧版格式迁移
                records = [{
                        id: Date.now() - 1,
                        score: parsed.highestScore || 0,
                        level: parsed.highestLevel || 0,
                        kills: parsed.totalKills || 0,
                        bossKills: parsed.totalBossKills || 0,
                        timestamp: Date.now() - 1,
                        difficulty: "normal",
                        damageTaken: -1,
                    }];
                if (parsed.achievements) {
                    for (const key of Object.keys(parsed.achievements)) {
                        achievements[key] = parsed.achievements[key] ? 1 : 0;
                    }
                }
                saveData();
            }
        }
    }
    catch {
        records = [];
        achievements = {};
    }
}
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, achievements }));
    }
    catch {
        // 静默忽略
    }
}
// ========== 成就重算（删除记录后调用） ==========
function recalcAchievements() {
    const stats = computeStats();
    for (const def of ACHIEVEMENT_DEFS) {
        const currentTier = achievements[def.id] || 0;
        const actualTier = computeTier(def, stats);
        if (currentTier > actualTier) {
            achievements[def.id] = actualTier;
        }
    }
}
// ========== 公开 API ==========
// 游戏结束时添加记录，返回本局新解锁的成就档位
function recordGameEnd(score, level, kills, bossKills, difficulty, damageTaken) {
    const record = {
        id: Date.now(),
        score, level, kills, bossKills,
        timestamp: Date.now(),
        difficulty,
        damageTaken,
    };
    records.push(record);
    // 检查新解锁的成就档位
    const stats = computeStats();
    const newTiers = [];
    for (const def of ACHIEVEMENT_DEFS) {
        const oldTier = achievements[def.id] || 0;
        const newTier = computeTier(def, stats);
        if (newTier > oldTier) {
            achievements[def.id] = newTier;
            newTiers.push({ id: def.id, tier: newTier });
        }
    }
    lastGame = { score, level, kills, bossKills, difficulty, damageTaken, newAchievementTiers: newTiers };
    saveData();
    return newTiers.map(t => t.id);
}
// 获取派生统计数据
function getStats() {
    return computeStats();
}
// 获取本局游戏数据
function getLastGame() {
    return lastGame;
}
// 获取成就定义列表
function getAchievementDefs() {
    return ACHIEVEMENT_DEFS;
}
// 获取成就档位（0=未解锁, 1=铜, 2=银, 3=金）
function getAchievementTier(id) {
    const stored = achievements[id] || 0;
    const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
    if (!def)
        return 0;
    return Math.min(stored, def.tiers.length);
}
// 是否已解锁指定成就（铜档及以上）
function isUnlocked(id) {
    return (achievements[id] || 0) >= 1;
}
// 获取所有对局记录（按时间倒序）
function getRecords() {
    return [...records].reverse();
}
// 删除指定对局记录，自动重算统计和成就
function deleteRecord(id) {
    records = records.filter(r => r.id !== id);
    recalcAchievements();
    saveData();
}
// 删除全部对局记录和成就
function resetAllData() {
    records = [];
    achievements = {};
    lastGame = { score: 0, level: 0, kills: 0, bossKills: 0, difficulty: "normal", damageTaken: 0, newAchievementTiers: [] };
    saveData();
}
// 删除指定成就（仅重置解锁状态）
function deleteAchievement(id) {
    if (achievements[id]) {
        delete achievements[id];
        saveData();
    }
}
// 初始化加载
loadData();
recalcAchievements();
saveData();
export { recordGameEnd, getStats, getLastGame, getAchievementDefs, getAchievementTier, isUnlocked, deleteAchievement, resetAllData, getRecords, deleteRecord, };
