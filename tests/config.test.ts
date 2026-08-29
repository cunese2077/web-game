// 数值配置单测：敌机 HP 成长曲线、难度系数、稀有度权重
// 对应 NUMERICAL_BALANCE.md 第 19 轮基线（防止数值回归）
import { describe, it, expect } from "vitest";
import {
  enemyConfig,
  difficultyConfig,
  levelConfig,
  rarityWeights,
  getScaledEnemyStat,
} from "../src/config.js";

describe("敌机 HP 成长曲线（第 19 轮基线）", () => {
  it("Lv1 基础 HP 与配置一致", () => {
    expect(enemyConfig.small.hp).toBe(2);
    expect(enemyConfig.medium.hp).toBe(16);
    expect(enemyConfig.big.hp).toBe(55);
    expect(enemyConfig.elite.hp).toBe(40);
  });

  it("等级 1 时成长函数返回基础值", () => {
    expect(getScaledEnemyStat(16, 0.07, 1)).toBe(16);
  });

  it("成长函数随等级单调递增", () => {
    let prev = 0;
    for (let lv = 1; lv <= 30; lv++) {
      const hp = getScaledEnemyStat(16, 0.07, lv);
      expect(hp).toBeGreaterThanOrEqual(prev);
      prev = hp;
    }
  });

  it("普通难度 Lv30 HP 与文档快照一致（中型≈61 / 大型≈256 / 精英≈170）", () => {
    const medium = getScaledEnemyStat(enemyConfig.medium.hp, enemyConfig.medium.scaling.hpScale, 30);
    const big = getScaledEnemyStat(enemyConfig.big.hp, enemyConfig.big.scaling.hpScale, 30);
    const elite = getScaledEnemyStat(enemyConfig.elite.hp, enemyConfig.elite.scaling.hpScale, 30);
    expect(medium).toBeGreaterThanOrEqual(60);
    expect(medium).toBeLessThanOrEqual(63);
    expect(big).toBeGreaterThanOrEqual(254);
    expect(big).toBeLessThanOrEqual(258);
    expect(elite).toBeGreaterThanOrEqual(168);
    expect(elite).toBeLessThanOrEqual(172);
  });
});

describe("难度系数", () => {
  it("难度只增强敌机：HP 系数 1.0 / 1.4 / 1.8", () => {
    expect(difficultyConfig.normal.enemyHpMultiplier).toBe(1.0);
    expect(difficultyConfig.medium.enemyHpMultiplier).toBe(1.4);
    expect(difficultyConfig.hard.enemyHpMultiplier).toBe(1.8);
  });

  it("中/困难难度成长系数为 1.3 / 1.7（第 16 轮调整后）", () => {
    expect(difficultyConfig.medium.enemyScalingMultiplier).toBe(1.3);
    expect(difficultyConfig.hard.enemyScalingMultiplier).toBe(1.7);
  });

  it("中等难度 Lv1 大型 HP = 55 × 1.4 = 77", () => {
    const hp = enemyConfig.big.hp * difficultyConfig.medium.enemyHpMultiplier;
    expect(hp).toBe(77);
  });
});

describe("稀有度权重", () => {
  it("legendary 权重为 0（只能通过 BOSS 保底出现）", () => {
    expect(rarityWeights.legendary).toBe(0);
  });

  it("权重顺序 common > rare > epic", () => {
    expect(rarityWeights.common).toBeGreaterThan(rarityWeights.rare);
    expect(rarityWeights.rare).toBeGreaterThan(rarityWeights.epic);
  });
});

describe("经验与等级上限", () => {
  it("经验基数 220（第 17 轮），满级 50", () => {
    expect(levelConfig.base).toBe(220);
    expect(levelConfig.maxLevel).toBe(50);
  });
});
