// 节奏基准测试（#6 60fps 改造保护网）
// 目的：锁死武器发射节奏的"时间等价值"。
// 阶段 2 时间化改造中，本文件的断言值【不允许变化】——
// 任何漂移即改造引入了节奏回归（正是上次回退的子弹间隔问题的机器化防护）。
// 帧率换算基准：当前 20fps，1 帧 = 50ms。
import { vi, describe, it, expect, beforeEach } from "vitest";

// mock canvas：node 测试环境无 DOM，武器系统/特效模块顶层 import canvas.js
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

// mock audio：node 环境无 AudioContext；play* 调用次数同时作为"发射事件"观测点
vi.mock("../src/audio.js", () => ({
  playMissile: vi.fn(),
  playMissileHit: vi.fn(),
  playLaser: vi.fn(),
  playLightning: vi.fn(),
}));

import { updateEnergySystem, clearEnergyCooldowns } from "../src/energySystem.js";
import { updateMissileSystem, clearMissiles } from "../src/missileSystem.js";
import { restoreUpgradeState } from "../src/upgrade.js";
import { MISSILE_INTERVAL_MS, LASER_INTERVAL_MS, LIGHTNING_INTERVAL_MS } from "../src/weaponLevels.js";
import { TARGET_DELTA } from "../src/frameTime.js";
import { enemyConfig } from "../src/config.js";
import { playMissile, playMissileHit, playLaser, playLightning } from "../src/audio.js";
import type { WeaponContext, EnemyProxy } from "../src/specialWeaponTypes.js";

// 构造最小 WeaponContext：英雄在画布底部中央，damageEnemy 计数命中
function makeContext(enemies: EnemyProxy[]): WeaponContext & { hits: { id: number; dmg: number }[] } {
  const hits: { id: number; dmg: number }[] = [];
  return {
    heroX: 224, heroY: 660, heroW: 32, heroH: 32,
    heroCx: 240, heroCy: 676,
    enemies,
    firepowerMul: 1,
    damageEnemy: (e, dmg) => { hits.push({ id: e.id, dmg }); },
    slowEnemy: () => undefined,
    hits,
  };
}

// 构造敌机 proxy
function makeEnemy(id: number, x: number, y: number): EnemyProxy {
  return { id, x, y, width: 32, height: 32, die: false, lives: 9999, type: "small" };
}

// 模拟推进 N 帧（每帧调用一次 update，dt 由 frameTime.TARGET_DELTA 决定）
function runFrames(update: (c: WeaponContext) => void, c: WeaponContext, frames: number): void {
  for (let i = 0; i < frames; i++) update(c);
}

// 模拟推进 10 秒所需的帧数（帧率无关：阶段 3 切 60fps 后自动适配）
const FRAMES_FOR_10S = Math.round(10000 / TARGET_DELTA);

beforeEach(() => {
  vi.clearAllMocks();
  clearEnergyCooldowns();
  clearMissiles();
  // 重置升级状态：能量 Lv1 + 导弹 Lv1（其余无）
  restoreUpgradeState({ baseWeapon: 1, homingMissile: 1, energyWeapon: 1, wingman: 0 }, {}, 0, false, false);
});

describe("节奏常量时间等价快照（阶段 2a 已 ms 化：断言值 = 玩家感知时间，永不改变）", () => {
  it("特殊武器发射间隔（ms）", () => {
    expect(MISSILE_INTERVAL_MS).toBe(2000);    // 导弹：2s
    expect(LASER_INTERVAL_MS).toBe(4000);      // 激光：4s
    expect(LIGHTNING_INTERVAL_MS).toBe(4000);  // 闪电：4s
  });

  it("敌机生成冷却", () => {
    expect(enemyConfig.big.coolDownMs).toBe(2000);  // 大型敌机：2s
  });
});

describe("能量武器系统驱动基准（步进 10 秒，帧数由 TARGET_DELTA 推导）", () => {
  it("激光每 4 秒发射一次，10 秒 2 次", () => {
    // 敌机放在英雄正上方激光路径内（保证命中被观测）
    const enemy = makeEnemy(1, 224, 300);  // 中心 (240, 316)，激光半宽内
    const c = makeContext([enemy]);
    runFrames(updateEnergySystem, c, FRAMES_FOR_10S);
    expect(playLaser).toHaveBeenCalledTimes(2);
    // 注：damageEnemy 计数含闪电链命中（两系统独立计时），由闪电用例统一断言
  });

  it("闪电每 4 秒发射一次，10 秒 2 次", () => {
    const enemy = makeEnemy(1, 224, 300);
    const c = makeContext([enemy]);
    runFrames(updateEnergySystem, c, FRAMES_FOR_10S);
    expect(playLightning).toHaveBeenCalledTimes(2);
    // 闪电伤害与激光伤害分离不开（都打同一敌机）→ 总命中 = 激光 2 + 闪电 2
    expect(c.hits.length).toBe(4);
  });
});

describe("导弹系统驱动基准（步进 10 秒，帧数由 TARGET_DELTA 推导）", () => {
  it("导弹每 2 秒发射一组，10 秒 5 组", () => {
    // 敌机放在英雄正上方同列：导弹初始朝上直飞必然命中
    const enemy = makeEnemy(1, 224, 576);  // 中心 (240, 592)，heroCy=676 上方 84px
    const c = makeContext([enemy]);
    runFrames(updateMissileSystem, c, FRAMES_FOR_10S);
    expect(playMissile).toHaveBeenCalledTimes(5);
    // 前 4 组（2s/4s/6s/8s 发射）在 10 秒内命中（~0.65s 飞行）；第 5 组 10s 末发射来不及命中
    expect(playMissileHit).toHaveBeenCalledTimes(4);
    expect(c.hits.length).toBe(4);
  });

  it("无目标时导弹照常发射（发射节奏不依赖敌机存在）", () => {
    const c = makeContext([]);
    runFrames(updateMissileSystem, c, FRAMES_FOR_10S);
    expect(playMissile).toHaveBeenCalledTimes(5);
    expect(playMissileHit).not.toHaveBeenCalled();
  });
});
