// 游戏配置模块 - 集中管理所有游戏参数，方便调优
import type {
  EnemyConfig,
  EnemySpawnScalingConfig,
  DifficultyConfig,
  BuffConfig,
  DropConfig,
  ItemConfig,
  HeroConfig,
  BulletConfig,
  LevelConfig,
  MoveType,
  HitEffectConfig,
} from "./types.js";

import type { Difficulty } from "./types.js";

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
    hpBar: {
      show: true,          // 统一显示（1HP 时血量条瞬间消失）
      showText: true,      // 显示血量数字
      offsetY: -8,         // 距敌机顶部向上 8px
      height: 4,           // 血量条高度
      colorFull: "#4f4",   // 满血：绿色
      colorMid: "#ff0",    // 中等：黄色
      colorLow: "#f44",    // 低血：红色
      midThreshold: 0.5,   // <=50% 转黄
      lowThreshold: 0.25,  // <=25% 转红
    },
    // 成长配置：小型敌机保持炮灰定位，不涨HP，略微加速增加躲避难度
    scaling: {
      hpScale: 0,           // 不涨 HP（保持一击即杀）
      speedScale: 0.01,     // 每级速度 +1%（30级时 6→7.74）
      scoreScale: 0.025,    // 每级分数 +2.5%（30级时 10→23）
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
    hpBar: {
      show: true,
      showText: true,      // 显示血量数字
      offsetY: -8,
      height: 4,
      colorFull: "#4f4",
      colorMid: "#ff0",
      colorLow: "#f44",
      midThreshold: 0.5,
      lowThreshold: 0.25,
    },
    // 成长配置：中型敌机HP和分数稳步增长，保持中期挑战
    scaling: {
      hpScale: 0.035,       // 30级时 HP ≈ 36（2.4倍）
      speedScale: 0.006,    // 每级速度 +0.6%（30级时 4→4.70）
      scoreScale: 0.035,    // 30级时分数 ≈ 48（2.4倍）
    },
  },

  // 【大型敌机】缓慢移动，高HP，得分100，锯齿形移动
  big: {
    speed: 2,
    hp: 70,
    score: 100,
    spawnProbBase: 0.05,
    spawnProbMax: 0.10,
    coolDownFrames: 40,
    move: {
      type: "zigzag",
      amplitude: 60,
      horizontalSpeed: 1,
    },
    hpBar: {
      show: true,
      showText: true,      // 显示血量数字
      offsetY: -8,
      height: 4,
      colorFull: "#4f4",
      colorMid: "#ff0",
      colorLow: "#f44",
      midThreshold: 0.5,
      lowThreshold: 0.25,
    },
    // 成长配置：大型敌机HP增长最快，后期保持压迫感
    scaling: {
      hpScale: 0.045,       // 30级时 HP ≈ 198（2.8倍）
      speedScale: 0.004,    // 每级速度 +0.4%（30级时 2→2.23）
      scoreScale: 0.04,     // 30级时分数 ≈ 264（2.6倍）
    },
  },
};

// ========== 敌机受击动效配置（全局，所有敌机共用） ==========
// 控制子弹击中敌机但未击毁时的音效和伤害数字反馈
const hitEffect: HitEffectConfig = {
  soundCoolDown: 6,            // 受击音效冷却 6 帧（与子弹射击一致，防抖）
  damageText: {
    show: true,                // 显示伤害浮动数字
    fontSize: 18,              // 字体大小
    color: "#f44",             // 红色文字，醒目
    floatDistance: 30,         // 上浮 30 像素
    frames: 25,                // 持续 25 帧
    stackOffset: 22,           // 堆叠偏移步长 22px（略大于字号 18px，确保不重叠；过大会导致连续命中时频繁跳过显示）
                               // 动态防重叠：生成时查找同 x 附近现存动效的当前 y（含上浮进度），
                               // 找到与所有现存动效距离 >= stackOffset 的空槽；找不到则跳过本次显示（避免重叠）
  },
};

// ========== 敌机等级成长配置 ==========
// 幂函数指数：控制属性增长曲线的加速程度
// 1.0=线性，1.1=温和加速（推荐，适合30级满级的游戏），1.3=较快加速
const ENEMY_SCALING_EXPONENT: number = 1.1;

// 敌机生成比例随等级缩放配置
// 后期小型敌机减少、中型增多，游戏节奏从"躲避大量弱敌"过渡到"对抗少量强敌"
const enemySpawnScaling: EnemySpawnScalingConfig = {
  smallWeightDecay: 0.025,    // 小型敌机出现权重每级 -2.5%（30级时权重从15→4）
  mediumWeightGrowth: 0.02,   // 中型敌机出现权重每级 +2%（30级时权重从5→8）
  bigProbGrowth: 0.001,       // 大型敌机基础出现概率每级 +0.1%（30级时基础概率从5%→7.9%）
};

// 敌机属性缩放辅助函数
// HP/分数使用幂函数增长：base × (1 + scaleFactor × (level-1)^exponent)
// 速度使用线性增长：base × (1 + speedScale × (level-1))
function getScaledEnemyStat(base: number, scaleFactor: number, level: number, linear: boolean = false): number {
  if (scaleFactor === 0 || level <= 1) return base;
  const multiplier = linear ? (level - 1) : Math.pow(level - 1, ENEMY_SCALING_EXPONENT);
  return base * (1 + scaleFactor * multiplier);
}

// ========== 难度配置 ==========
// 难度只影响敌机强度和道具掉落，玩家属性不变
// 难度越高 → 敌机越强（HP/速度/成长/生成频率），道具越少
// 新增难度只需在此添加一个配置对象 + 对应 i18n 翻译
const difficultyConfig: Record<Difficulty, DifficultyConfig> = {
  // 【普通】标准难度，敌机属性无加成
  normal: {
    label: "difficulty.normal",
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    enemyScalingMultiplier: 1.0,
    enemySpawnRateMultiplier: 1.0,
    heroHpBonus: 0,
    damageMultiplier: 1.0,
    dropRateMultiplier: 1.0,
  },
  // 【中等】敌机 HP +60%、速度 +10%、成长系数 ×1.4、生成更频繁、道具略少
  medium: {
    label: "difficulty.medium",
    enemyHpMultiplier: 1.6,
    enemySpeedMultiplier: 1.1,
    enemyScalingMultiplier: 1.4,
    enemySpawnRateMultiplier: 0.85,
    heroHpBonus: 0,
    damageMultiplier: 1.0,
    dropRateMultiplier: 0.85,
  },
  // 【困难】敌机 HP +120%、速度 +20%、成长系数 ×1.8、生成大幅加快、道具显著减少
  hard: {
    label: "difficulty.hard",
    enemyHpMultiplier: 2.2,
    enemySpeedMultiplier: 1.2,
    enemyScalingMultiplier: 1.8,
    enemySpawnRateMultiplier: 0.65,
    heroHpBonus: 0,
    damageMultiplier: 1.0,
    dropRateMultiplier: 0.65,
  },
};

function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return difficultyConfig[difficulty];
}

// ========== Buff 配置 ==========
const buffConfig: BuffConfig = {
  firepower: {
    duration: 200,
    color: "#f80",
    icon: "🔥",
    label: "buff.firepower",
    damageMultiplier: 2,
  },
  shield: {
    duration: 300,
    color: "#4af",
    icon: "🛡",
    label: "buff.shield",
    invincibleFrames: 20,
  },
  spread: {
    duration: 120,
    color: "#f0f",
    icon: "✦",
    label: "buff.spread",
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
      label: "item.heal",
    },
    firepower: {
      color: "#f80",
      glow: "#f80",
      label: "item.firepower",
    },
    shield: {
      color: "#4af",
      glow: "#4af",
      label: "item.shield",
    },
    spread: {
      color: "#f0f",
      glow: "#f0f",
      label: "item.spread",
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
  enemySpawnScaling,
  difficultyConfig,
  buffConfig,
  dropConfig,
  itemConfig,
  heroConfig,
  bulletConfig,
  levelConfig,
  hitEffect,
  getScaledEnemyStat,
  getDifficultyConfig,
  getDynamicHealDropProb,
  getDynamicShieldDropProb,
  getDynamicBigFirepowerDropProb,
  getDynamicMediumFirepowerDropProb,
  getDynamicMediumShieldDropProb,
  getDynamicSpreadDropProb,
  getDynamicBigEnemySpawnProb,
};
