// BOSS 类型轮换单测：变形型（shifter）接入 %5 循环后的映射与三姿态默认字段
import { vi, describe, it, expect } from "vitest";

// mock canvas：node 测试环境无 DOM，bossEntity 顶层 import canvas.js（沿用 rhythmBaseline 先例）
vi.mock("../src/canvas.js", () => {
  const noopCtx = new Proxy({}, {
    get: (_t: unknown, p: string | symbol) => {
      if (p === "measureText") return () => ({ width: 0 });
      return () => undefined;
    },
    set: () => true,
  });
  return { ctx: noopCtx, width: 480, height: 720, fontScale: 1 };
});

// mock audio：node 环境无 AudioContext；bossEntity 只需受击/击毁音效
vi.mock("../src/audio.js", () => ({
  playBossHit: vi.fn(),
  playBossDestroy: vi.fn(),
}));

// mock hero：切断 heroEntity→debug→engine 的重型浏览器链（node 无 Image/DOM 事件），
// 仅提供 Boss 构造/弹幕瞄准所需的坐标访问器
vi.mock("../src/hero.js", () => ({
  getHeroX: () => 240,
  getHeroY: () => 660,
}));

import { getBossType } from "../src/bossTypes.js";
import { Boss } from "../src/bossEntity.js";

describe("BOSS 类型轮换（%5 循环，index 4 = 变形型）", () => {
  it("index 0~4 依次映射五种类型（变形型首次出现于 Lv25/bossIndex 4）", () => {
    expect(getBossType(0)).toBe("assault");
    expect(getBossType(1)).toBe("fortress");
    expect(getBossType(2)).toBe("carrier");
    expect(getBossType(3)).toBe("phantom");
    expect(getBossType(4)).toBe("shifter");
    expect(getBossType(9)).toBe("shifter"); // 第二轮循环
  });

  it("负数/异常 index 经安全取模仍映射到合法类型", () => {
    expect(getBossType(-1)).toBe("shifter");  // ((-1 % 5) + 5) % 5 = 4
    expect(getBossType(-5)).toBe("assault");  // -5 % 5 = 0，回退到循环起点
    expect(getBossType(-100)).toBe("assault"); // -100 % 5 = 0（整除）
  });
});

describe("变形型（shifter）三姿态默认字段", () => {
  it("构造后姿态状态有安全默认值（存档恢复不崩溃，stance 初始为 0）", () => {
    const boss = new Boss(4);
    expect(boss.bossType).toBe("shifter");
    expect(boss.stance).toBe(0);
    expect(boss.stanceTimerMs).toBe(0);
    expect(boss.stanceFlashMs).toBe(0);
    // 突击姿态俯冲冷却与护盾上限（堡垒型 20% 的 60% = 12%）
    expect(boss.diveCooldownMs).toBe(6000);
    expect(boss.shieldMaxHp).toBeCloseTo(boss.maxHp * 0.12);
    expect(boss.shieldHp).toBe(0); // 初始无护盾，进入堡垒姿态才获得
    // 血量沿用通用公式（无类型缩放）
    expect(boss.hp).toBe(boss.maxHp);
  });
});
