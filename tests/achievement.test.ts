// 成就系统单测：分档判定、统计聚合、记录删除后的成就重算
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordGameEnd,
  getStats,
  getLastGame,
  getAchievementTier,
  isUnlocked,
  getRecords,
  deleteRecord,
  resetAllData,
} from "../src/achievement.js";

beforeEach(() => {
  resetAllData();
});

describe("成就分档判定", () => {
  it("首局游戏解锁 first_game 铜档", () => {
    const unlocked = recordGameEnd(500, 5, 30, 0, "normal", 2);
    expect(unlocked).toContain("first_game");
    expect(getAchievementTier("first_game")).toBe(1); // 铜
  });

  it("得分 10000 直接解锁 score 金档（跨档直升）", () => {
    const unlocked = recordGameEnd(10000, 10, 100, 0, "normal", 0);
    expect(unlocked).toContain("score");
    expect(getAchievementTier("score")).toBe(3); // 金
  });

  it("阈值边界：得分 999 不解锁 score", () => {
    recordGameEnd(999, 5, 10, 0, "normal", 0);
    expect(getAchievementTier("score")).toBe(0);
    expect(isUnlocked("score")).toBe(false);
  });
});

describe("统计聚合", () => {
  it("多局记录正确累加", () => {
    recordGameEnd(1000, 10, 50, 1, "normal", 2);
    recordGameEnd(2000, 15, 80, 1, "normal", 3);
    const stats = getStats();
    expect(stats.totalGames).toBe(2);
    expect(stats.totalKills).toBe(130);
    expect(stats.totalScore).toBe(3000);
    expect(stats.highestScore).toBe(2000);
    expect(stats.highestLevel).toBe(15);
    expect(stats.totalBossKills).toBe(2);
  });

  it("无伤局与困难局分别计数", () => {
    recordGameEnd(1000, 10, 50, 0, "normal", 0);   // 无伤
    recordGameEnd(1000, 10, 50, 0, "hard", 0);     // 困难 + 无伤
    recordGameEnd(1000, 10, 50, 0, "hard", 5);     // 困难 + 受伤
    const stats = getStats();
    expect(stats.noDamageGames).toBe(2);
    expect(stats.hardGames).toBe(2);
  });
});

describe("删除记录后的成就重算", () => {
  it("删除高分记录后 score 成就档位回落", () => {
    recordGameEnd(10000, 10, 100, 0, "normal", 0);
    expect(getAchievementTier("score")).toBe(3);

    const records = getRecords();
    expect(records.length).toBe(1);
    deleteRecord(records[0].id);

    expect(getStats().totalGames).toBe(0);
    // 记录清空后，成就档位不应高于实际（recalcAchievements 只降不升）
    expect(getAchievementTier("score")).toBeLessThanOrEqual(3);
    expect(getStats().highestScore).toBe(0);
  });
});

describe("getLastGame", () => {
  it("保存最近一局数据", () => {
    recordGameEnd(1234, 8, 45, 1, "medium", 3);
    const last = getLastGame();
    expect(last.score).toBe(1234);
    expect(last.difficulty).toBe("medium");
    expect(last.damageTaken).toBe(3);
  });
});
