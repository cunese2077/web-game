// 游戏配置模块 - 集中管理所有游戏参数，方便调优
import type {
  EnemyConfig,
  BuffConfig,
  DropConfig,
  ItemConfig,
  HeroConfig,
  BulletConfig,
  LevelConfig,
  MoveType,
} from "./types.js";

// ========== 敌机配置 ==========
const enemyConfig: EnemyConfig = {
  // 【小型敌机】快速移动，1HP，得分10，无横向移动
  small: {
    speed: 6,
    hp: 1,
    score: 10,
    spawnWeight: 15,
    move: {
      type: "straight",
    },
  },

  // 【中型敌机】中等速度，HP提升，得分20，正弦摆动
  medium: {
    speed: 4,
    hp: 15,
    score: 20,
    spawnWeight: 5,
    move: {
      type: "sine",
      amplitude: 40,
      frequency: 0.03,
    },
  },

  // 【大型敌机】缓慢移动，高HP，得分100，锯齿形移动
  big: {
    speed: 2,
    hp: 70,
    score: 100,
    spawnProbBase: 0.05,
    spawnProbMax: 0.10,
    cooldownFrames: 40,
    move: {
      type: "zigzag",
      amplitude: 60,
      horizontalSpeed: 1,
    },
  },
};

// ========== Buff 配置 ==========
const buffConfig: BuffConfig = {
  firepower: {
    duration: 200,
    color: "#f80",
    icon: "🔥",
    label: "FIRE",
    damageMultiplier: 2,
  },
  shield: {
    duration: 300,
    color: "#4af",
    icon: "🛡",
    label: "SHLD",
    invincibleFrames: 20,
  },
  spread: {
    duration: 120,
    color: "#f0f",
    icon: "✦",
    label: "SPRD",
    bulletCount: 5,
    spreadAngle: 45,
  },
};

// ========== 道具掉落配置（动态概率系统） ==========
const dropConfig: DropConfig = {
  bigEnemy: {
    shieldBase: 0.30,
    shieldBonus: 0.20,
    healBase: 0.25,
    healBonus: 0.50,
    firepowerBase: 0.12,
    firepowerBonus: -0.04,
  },
  mediumEnemy: {
    shieldBase: 0.08,
    shieldBonus: 0.04,
    firepowerBase: 0.08,
    firepowerBonus: -0.03,
    spreadBase: 0.08,
    spreadBonus: -0.03,
  },
};

// ========== 道具外观配置 ==========
const itemConfig: ItemConfig = {
  size: 30,
  speed: 2,
  types: {
    heal: {
      color: "#f44",
      glow: "#f44",
      label: "+1 HP",
    },
    firepower: {
      color: "#f80",
      glow: "#f80",
      label: "FIRE UP!",
    },
    shield: {
      color: "#4af",
      glow: "#4af",
      label: "SHIELD!",
    },
    spread: {
      color: "#f0f",
      glow: "#f0f",
      label: "SPREAD!",
    },
  },
};

// ========== 玩家战机配置 ==========
const heroConfig: HeroConfig = {
  maxHp: 3,
  invincibleFrames: 40,
  bulletInterval: 3,
  enemySpawnInterval: 8,
};

// ========== 子弹配置 ==========
const bulletConfig: BulletConfig = {
  baseDamage: 1,
  speed: 20,
  horizontalDrift: 3,
  diagonalDrift: 5,
};

// ========== 等级配置 ==========
// 所有等级成长相关参数集中在此，修改本对象即可调整整个等级系统
//
// 【经验曲线】expToNext(lv) = base + growth × (lv-1)^exponent
//   - base:      1→2 级所需经验（起步门槛），值越大前期升级越慢
//   - growth:    每级递增基数，值越大后期升级越慢
//   - exponent:  曲线指数，1.0=线性（平稳），1.5=超线性（后期陡峭）
//   - 当前采用线性增长（exponent=1.0），满级约 15 分钟
//
// 【等级奖励】bonuses 对象控制各等级段的属性加成：
//   - hpBonusLevels:    达到任一指定等级时 maxHp +1
//   - damageBonus:      每级增加 perLevel 伤害，累计至 maxLevel 级封顶
//   - bulletInterval:   每 perLevels 级减少 reduction 射击间隔，区间内生效
//   - buffDuration:     每 perLevels 级乘以 multiplier，区间内生效
const levelConfig: LevelConfig = {
  base: 450,       // 1→2 级所需经验（起步门槛）
  growth: 30,      // 每级递增基数（线性：每级 +30）
  exponent: 1.0,   // 曲线指数（1.0=线性，前期平稳后期不过陡）
  maxLevel: 30,    // 满级
  expRewards: {
    small: 7,      // 小型敌机击毁经验
    medium: 20,    // 中型敌机击毁经验
    big: 100,      // 大型敌机击毁经验
  },
  // 等级奖励配置 —— 修改此处可调整各等级段的属性加成
  bonuses: {
    // HP 加成等级点：达到任一等级时 maxHp +1（满级共 +10 HP）
    hpBonusLevels: [2, 4, 7, 10, 13, 17, 20, 23, 27, 30],
    // 子弹伤害加成：1~10 级每级 +0.15（10 级时累计 +1.5）
    damageBonus: {
      perLevel: 0.15,
      maxLevel: 10,
    },
    // 射击间隔减少：11~20 级每 2 级 -0.15（下限 1 帧）
    bulletInterval: {
      perLevels: 2,
      reduction: 0.15,
      startLevel: 11,
      endLevel: 20,
    },
    // Buff 持续倍率：21~30 级每 3 级 ×1.05（累计 ×1.15）
    buffDuration: {
      perLevels: 3,
      multiplier: 1.05,
      startLevel: 21,
      endLevel: 30,
    },
  },
};

// ========== 动态概率计算函数 ==========

function getDynamicHealDropProb(hpRatio: number): number {
  return dropConfig.bigEnemy.healBase + (1 - hpRatio) * dropConfig.bigEnemy.healBonus;
}

function getDynamicShieldDropProb(hpRatio: number): number {
  return dropConfig.bigEnemy.shieldBase + (1 - hpRatio) * dropConfig.bigEnemy.shieldBonus;
}

function getDynamicBigFirepowerDropProb(hpRatio: number): number {
  return dropConfig.bigEnemy.firepowerBase + (1 - hpRatio) * dropConfig.bigEnemy.firepowerBonus;
}

function getDynamicMediumFirepowerDropProb(hpRatio: number): number {
  return dropConfig.mediumEnemy.firepowerBase + (1 - hpRatio) * dropConfig.mediumEnemy.firepowerBonus;
}

function getDynamicMediumShieldDropProb(hpRatio: number): number {
  return dropConfig.mediumEnemy.shieldBase + (1 - hpRatio) * dropConfig.mediumEnemy.shieldBonus;
}

function getDynamicSpreadDropProb(hpRatio: number): number {
  return dropConfig.mediumEnemy.spreadBase + (1 - hpRatio) * dropConfig.mediumEnemy.spreadBonus;
}

function getDynamicBigEnemySpawnProb(hpRatio: number): number {
  return enemyConfig.big.spawnProbBase + (1 - hpRatio) * (enemyConfig.big.spawnProbMax - enemyConfig.big.spawnProbBase);
}

export {
  enemyConfig,
  buffConfig,
  dropConfig,
  itemConfig,
  heroConfig,
  bulletConfig,
  levelConfig,
  getDynamicHealDropProb,
  getDynamicShieldDropProb,
  getDynamicBigFirepowerDropProb,
  getDynamicMediumFirepowerDropProb,
  getDynamicMediumShieldDropProb,
  getDynamicSpreadDropProb,
  getDynamicBigEnemySpawnProb,
};
