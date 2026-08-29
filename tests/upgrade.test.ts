// 升级系统单测：选项生成不变量、传说保底单入口、应用升级、被动公式
import { describe, it, expect, beforeEach } from "vitest";
import {
  initUpgrades,
  getWeaponLevel,
  getPassiveStacks,
  addPendingLevelUps,
  getPendingLevelUps,
  getCurrentOffers,
  getRerollsLeft,
  startUpgradeSelection,
  rerollOffers,
  applyUpgrade,
  triggerBossLegendary,
  getBaseWeaponLevel,
  getBulletCount,
  getBulletDamage,
  getMaxHp,
  getCritChance,
  getDamagePassiveMultiplier,
  getWingmanCount,
} from "../src/upgrade.js";
import { BASE_WEAPON_LEVELS } from "../src/upgrade.js";
import { heroConfig } from "../src/config.js";

beforeEach(() => {
  initUpgrades();
});

describe("初始状态", () => {
  it("基础武器初始 Lv1，其余为 0", () => {
    expect(getWeaponLevel("baseWeapon")).toBe(1);
    expect(getWeaponLevel("homingMissile")).toBe(0);
    expect(getPassiveStacks("damageUp")).toBe(0);
    expect(getPendingLevelUps()).toBe(0);
  });

  it("无待处理升级时 startUpgradeSelection 返回 false", () => {
    expect(startUpgradeSelection()).toBe(false);
  });
});

describe("BASE_WEAPON_LEVELS 等级表", () => {
  it("5 级，子弹数与伤害加成单调不减", () => {
    expect(BASE_WEAPON_LEVELS.length).toBe(5);
    for (let i = 1; i < BASE_WEAPON_LEVELS.length; i++) {
      expect(BASE_WEAPON_LEVELS[i].bulletCount)
        .toBeGreaterThanOrEqual(BASE_WEAPON_LEVELS[i - 1].bulletCount);
      expect(BASE_WEAPON_LEVELS[i].damageBonus)
        .toBeGreaterThanOrEqual(BASE_WEAPON_LEVELS[i - 1].damageBonus);
    }
  });
});

describe("选项生成不变量", () => {
  beforeEach(() => {
    addPendingLevelUps(1);
  });

  it("生成 3 个选项，无重复", () => {
    expect(startUpgradeSelection()).toBe(true);
    const offers = getCurrentOffers();
    expect(offers.length).toBe(3);
    const ids = offers.map(o => o.upgradeId);
    expect(new Set(ids).size).toBe(3);
  });

  it("普通升级不出现 legendary（权重 0 + 过滤）", () => {
    startUpgradeSelection();
    const rarities = getCurrentOffers().map(o => o.def.rarity);
    expect(rarities).not.toContain("legendary");
  });

  it("选项均为可达等级（未满级且满足前置）", () => {
    startUpgradeSelection();
    for (const offer of getCurrentOffers()) {
      expect(offer.nextLevel).toBe(offer.currentLevel + 1);
      expect(offer.def.maxLevel).toBeGreaterThanOrEqual(offer.nextLevel);
    }
  });

  it("普通难度刷新次数为 3，reroll 递减", () => {
    startUpgradeSelection();
    expect(getRerollsLeft()).toBe(3);
    expect(rerollOffers()).toBe(true);
    expect(getRerollsLeft()).toBe(2);
    expect(getCurrentOffers().length).toBe(3);
  });
});

describe("BOSS 传说保底（单入口）", () => {
  it("triggerBossLegendary 后下一次升级必含 legendary", () => {
    triggerBossLegendary();
    addPendingLevelUps(1);
    startUpgradeSelection();
    // 初始状态下仅 bulletStorm（前置 baseWeapon Lv1）满足条件
    const legendary = getCurrentOffers().filter(o => o.def.rarity === "legendary");
    expect(legendary.length).toBeGreaterThanOrEqual(1);
    expect(legendary[0].upgradeId).toBe("bulletStorm");
  });

  it("保底一次性消耗：第二次升级不再出现 legendary", () => {
    triggerBossLegendary();
    addPendingLevelUps(1);
    startUpgradeSelection();
    // 不选择传说，直接再触发下一次升级
    addPendingLevelUps(1);
    startUpgradeSelection();
    const rarities = getCurrentOffers().map(o => o.def.rarity);
    expect(rarities).not.toContain("legendary");
  });
});

describe("applyUpgrade", () => {
  it("应用武器升级：等级 +1", () => {
    const offer = {
      upgradeId: "baseWeapon",
      currentLevel: 1,
      nextLevel: 2,
      isNew: false,
      def: { type: "weapon" },
    } as never;
    applyUpgrade(offer);
    expect(getWeaponLevel("baseWeapon")).toBe(2);
    expect(getBaseWeaponLevel()).toBe(2);
  });

  it("应用被动升级：层数 +1 且公式生效", () => {
    const offer = {
      upgradeId: "damageUp",
      currentLevel: 0,
      nextLevel: 1,
      isNew: true,
      def: { type: "passive" },
    } as never;
    applyUpgrade(offer);
    expect(getPassiveStacks("damageUp")).toBe(1);
    // 伤害增幅每层 +15%
    expect(getDamagePassiveMultiplier()).toBeCloseTo(1.15);
  });
});

describe("被动公式默认值（无被动时）", () => {
  it("子弹数 3、伤害 1、暴击 0、满血 4", () => {
    expect(getBulletCount()).toBe(3);
    // 基础伤害 1 × (1 + Lv1 伤害加成 0) = 1
    expect(getBulletDamage()).toBe(1);
    expect(getCritChance()).toBe(0);
    expect(getMaxHp()).toBe(heroConfig.maxHp);
    expect(getWingmanCount()).toBe(0);
  });
});
