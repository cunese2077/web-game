// 等级系统单测：经验曲线、升级、满级封顶、经验奖励
import { describe, it, expect, beforeEach } from "vitest";
import {
  getLevel,
  getExp,
  getExpToNext,
  getTotalExp,
  addExp,
  resetLevel,
  getExpReward,
} from "../src/level.js";
import { levelConfig } from "../src/config.js";

beforeEach(() => {
  resetLevel();
});

describe("经验曲线", () => {
  it("Lv1→2 所需经验为 levelConfig.base（第 17 轮调整后 220）", () => {
    expect(levelConfig.base).toBe(220);
    expect(getExpToNext()).toBe(220);
  });

  it("经验曲线单调递增", () => {
    let prev = 0;
    for (let lv = 1; lv < 20; lv++) {
      const need = getExpToNext() + 0; // 使用当前等级
      expect(need).toBeGreaterThan(prev);
      prev = need;
      addExp(need); // 精确升一级
    }
    expect(getLevel()).toBe(20);
  });
});

describe("addExp 升级逻辑", () => {
  it("经验不足时不升级", () => {
    const gained = addExp(100);
    expect(gained).toBe(0);
    expect(getLevel()).toBe(1);
    expect(getExp()).toBe(100);
  });

  it("单次大额经验可连升多级", () => {
    const gained = addExp(2000);
    expect(gained).toBeGreaterThan(1);
    expect(getLevel()).toBe(gained + 1);
    expect(getExp()).toBeLessThan(getExpToNext());
  });

  it("总经验累积正确", () => {
    addExp(100);
    addExp(200);
    expect(getTotalExp()).toBe(300);
  });

  it("满级（50）后经验不再累积，addExp 返回 0", () => {
    // 一直加经验直到满级
    for (let i = 0; i < 200 && getLevel() < levelConfig.maxLevel; i++) {
      addExp(5000);
    }
    expect(getLevel()).toBe(levelConfig.maxLevel);
    expect(getExp()).toBe(0);
    expect(addExp(999)).toBe(0);
    expect(getLevel()).toBe(levelConfig.maxLevel);
  });
});

describe("敌机经验奖励", () => {
  it("各类型敌机经验值与配置一致", () => {
    expect(getExpReward("small")).toBe(5);
    expect(getExpReward("medium")).toBe(15);
    expect(getExpReward("elite")).toBe(40);
    expect(getExpReward("big")).toBe(80);
  });
});

describe("resetLevel", () => {
  it("重置后回到 Lv1 / 零经验", () => {
    addExp(2000);
    resetLevel();
    expect(getLevel()).toBe(1);
    expect(getExp()).toBe(0);
    expect(getTotalExp()).toBe(0);
  });
});
