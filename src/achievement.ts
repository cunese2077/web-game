// 成就统计模块：按对局记录存储，统计数据从记录派生，删除记录时自动重算
import type { TextKey } from "./i18n.js";

const STORAGE_KEY = "webgame_achievement";

// 单局游戏记录
export interface GameRecord {
  id: number;           // 唯一 ID（时间戳）
  score: number;        // 本局得分
  level: number;        // 本局等级
  kills: number;        // 本局击杀数
  bossKills: number;    // 本局击败BOSS数
  timestamp: number;    // 游戏结束时间戳
}

// 派生统计数据（从 records 计算，不单独存储）
interface DerivedStats {
  totalGames: number;
  totalKills: number;
  totalBossKills: number;
  totalScore: number;
  highestLevel: number;
  highestScore: number;
}

// 持久化数据结构
interface PersistentData {
  records: GameRecord[];
  achievements: Record<string, boolean>;
}

// 成就定义
interface AchievementDef {
  id: string;
  label: TextKey;
  desc: TextKey;
  condition: (stats: DerivedStats) => boolean;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_game", label: "achievement.firstGame", desc: "achievement.firstGame.desc", condition: (s) => s.totalGames >= 1 },
  { id: "score_1000", label: "achievement.score1000", desc: "achievement.score1000.desc", condition: (s) => s.highestScore >= 1000 },
  { id: "score_5000", label: "achievement.score5000", desc: "achievement.score5000.desc", condition: (s) => s.highestScore >= 5000 },
  { id: "level_10", label: "achievement.level10", desc: "achievement.level10.desc", condition: (s) => s.highestLevel >= 10 },
  { id: "level_20", label: "achievement.level20", desc: "achievement.level20.desc", condition: (s) => s.highestLevel >= 20 },
  { id: "boss_kill_1", label: "achievement.bossKill1", desc: "achievement.bossKill1.desc", condition: (s) => s.totalBossKills >= 1 },
  { id: "boss_kill_5", label: "achievement.bossKill5", desc: "achievement.bossKill5.desc", condition: (s) => s.totalBossKills >= 5 },
  { id: "kills_100", label: "achievement.kills100", desc: "achievement.kills100.desc", condition: (s) => s.totalKills >= 100 },
  { id: "kills_500", label: "achievement.kills500", desc: "achievement.kills500.desc", condition: (s) => s.totalKills >= 500 },
  { id: "games_10", label: "achievement.games10", desc: "achievement.games10.desc", condition: (s) => s.totalGames >= 10 },
];

// ========== 数据存储 ==========
let records: GameRecord[] = [];
let achievements: Record<string, boolean> = {};

// 本局游戏数据（recordGameEnd 时填充，供 UI 显示本局统计）
interface LastGameData {
  score: number;
  level: number;
  kills: number;
  bossKills: number;
  newAchievementIds: string[];
}
let lastGame: LastGameData = { score: 0, level: 0, kills: 0, bossKills: 0, newAchievementIds: [] };

// ========== 派生统计计算 ==========
function computeStats(): DerivedStats {
  let totalKills = 0, totalBossKills = 0, totalScore = 0, highestLevel = 0, highestScore = 0;
  for (const r of records) {
    totalKills += r.kills;
    totalBossKills += r.bossKills;
    totalScore += r.score;
    if (r.level > highestLevel) highestLevel = r.level;
    if (r.score > highestScore) highestScore = r.score;
  }
  return { totalGames: records.length, totalKills, totalBossKills, totalScore, highestLevel, highestScore };
}

// ========== localStorage 读写 ==========
function loadData(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.records)) {
        // 新版格式：{ records, achievements }
        records = parsed.records;
        achievements = parsed.achievements || {};
      } else if (typeof parsed.totalGames === "number") {
        // 旧版格式迁移：{ totalGames, totalKills, ... achievements }
        // 将旧版累积统计转为一条合成记录，保留成就数据
        records = [{
          id: Date.now() - 1,
          score: parsed.highestScore || 0,
          level: parsed.highestLevel || 0,
          kills: parsed.totalKills || 0,
          bossKills: parsed.totalBossKills || 0,
          timestamp: Date.now() - 1,
        }];
        achievements = parsed.achievements || {};
        // 立即保存为新格式
        saveData();
      }
    }
  } catch {
    records = [];
    achievements = {};
  }
}

function saveData(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, achievements }));
  } catch {
    // 静默忽略
  }
}

// ========== 成就重算（删除记录后调用） ==========
function recalcAchievements(): void {
  const stats = computeStats();
  // 遍历所有成就，条件不满足的取消解锁，条件满足的保持解锁
  for (const def of ACHIEVEMENT_DEFS) {
    if (achievements[def.id] && !def.condition(stats)) {
      delete achievements[def.id];
    }
  }
}

// ========== 公开 API ==========

// 游戏结束时添加记录，返回本局新解锁的成就 ID
function recordGameEnd(score: number, level: number, kills: number, bossKills: number): string[] {
  const record: GameRecord = {
    id: Date.now(),
    score, level, kills, bossKills,
    timestamp: Date.now(),
  };
  records.push(record);

  // 检查新解锁的成就
  const stats = computeStats();
  const newUnlocked: string[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (!achievements[def.id] && def.condition(stats)) {
      achievements[def.id] = true;
      newUnlocked.push(def.id);
    }
  }

  lastGame = { score, level, kills, bossKills, newAchievementIds: newUnlocked };
  saveData();
  return newUnlocked;
}

// 获取派生统计数据
function getStats(): DerivedStats {
  return computeStats();
}

// 获取本局游戏数据
function getLastGame(): Readonly<LastGameData> {
  return lastGame;
}

// 获取成就定义列表
function getAchievementDefs(): Readonly<AchievementDef[]> {
  return ACHIEVEMENT_DEFS;
}

// 是否已解锁指定成就
function isUnlocked(id: string): boolean {
  return !!achievements[id];
}

// 获取所有对局记录（按时间倒序）
function getRecords(): Readonly<GameRecord[]> {
  return [...records].reverse();
}

// 删除指定对局记录，自动重算统计和成就
function deleteRecord(id: number): void {
  records = records.filter(r => r.id !== id);
  recalcAchievements();
  saveData();
}

// 删除全部对局记录和成就
function resetAllData(): void {
  records = [];
  achievements = {};
  lastGame = { score: 0, level: 0, kills: 0, bossKills: 0, newAchievementIds: [] };
  saveData();
}

// 删除指定成就（仅重置解锁状态）
function deleteAchievement(id: string): void {
  if (achievements[id]) {
    delete achievements[id];
    saveData();
  }
}

// 初始化加载
loadData();

export {
  recordGameEnd,
  getStats,
  getLastGame,
  getAchievementDefs,
  isUnlocked,
  deleteAchievement,
  resetAllData,
  getRecords,
  deleteRecord,
};
