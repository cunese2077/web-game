// 游戏配置模块 - 集中管理所有游戏参数，方便调优

// ========== 敌机配置 ==========
const enemyConfig = {
  // 【小型敌机】快速移动，1HP，得分10
  small: {
    speed: 6,         // 下落速度（像素/帧）
    hp: 1,            // 生命值（实际代码中 lifes=2，这里仅作参考）
    score: 10,        // 击败得分
    spawnWeight: 15,  // 出现权重（相对于随机数20的阈值）
  },

  // 【中型敌机】中等速度，HP提升，得分20
  medium: {
    speed: 4,         // 下落速度（像素/帧）
    hp: 15,           // 生命值（调整后：15HP，需3轮普通子弹或2轮双倍火力）
    score: 20,        // 击败得分
    spawnWeight: 5,   // 出现权重
  },

  // 【大型敌机】缓慢移动，高HP，得分100
  big: {
    speed: 2,         // 下落速度（像素/帧）
    hp: 70,           // 生命值（调整后：70HP，对抗双倍火力）
    score: 100,       // 击败得分
    spawnProbBase: 0.05,        // 基础出现概率（5%）
    spawnProbMax: 0.10,         // 最大出现概率（10%，血量低时）
    cooldownFrames: 40,         // 连续生成冷却帧数（~2秒）
  },
};

// ========== Buff 配置 ==========
const buffConfig = {
  // 【双倍火力】子弹伤害 ×2
  firepower: {
    duration: 200,    // 持续帧数（调整后：~10秒，原15秒）
    color: "#f80",    // UI 颜色（橙色）
    icon: "🔥",       // Buff 图标
    label: "FIRE",    // UI 显示文字
    damageMultiplier: 2,  // 伤害倍率
  },

  // 【护盾】抵消 1 次伤害
  shield: {
    duration: 300,    // 持续帧数（调整后：~15秒，原30秒）
    color: "#4af",    // UI 颜色（蓝色）
    icon: "🛡",       // Buff 图标
    label: "SHLD",    // UI 显示文字
    invincibleFrames: 20,  // 护盾触发后的短暂无敌帧数
  },

  // 【散弹】子弹从 3 发变 5 发
  spread: {
    duration: 120,    // 持续帧数（调整后：~6秒，原10秒）
    color: "#f0f",    // UI 颜色（紫色）
    icon: "✦",        // Buff 图标
    label: "SPRD",    // UI 显示文字
    bulletCount: 5,   // 子弹数量
    spreadAngle: 45,  // 斜射角度（度）
  },
};

// ========== 道具掉落配置（动态概率系统） ==========
// 所有道具掉落概率都会根据玩家血量动态调整
// hpRatio: 1.0（满血）→ 0.0（空血）
// 血量低时：保护型道具（回血、护盾）概率↑，攻击型道具概率↓
// 血量高时：攻击型道具（火力、散弹）概率↑，保护型道具概率↓
const dropConfig = {
  // 【大型敌机掉落】
  bigEnemy: {
    // 护盾道具：血量低时概率更高（满血30% → 空血50%）
    // 方案四调整：大幅提升护盾出现频率，确保防御道具充足
    shieldBase: 0.30,      // 满血时的基础概率（30%，原12%）
    shieldBonus: 0.20,     // 空血时额外加成（+20%，最高50%，原+13%）

    // 回血道具：血量低时概率更高（满血25% → 空血75%）
    healBase: 0.25,        // 满血时的基础概率（25%）
    healBonus: 0.50,       // 空血时额外加成（+50%，最高75%）

    // 双倍火力：血量高时概率更高（满血12% → 空血8%）
    firepowerBase: 0.12,   // 满血时的基础概率（12%）
    firepowerBonus: -0.04, // 空血时减少（-4%，最低8%）
    // 注：负数 Bonus 表示血量低时概率降低

    // 满血时总掉落概率：30% + 25% + 12% = 67%
    // 空血时总掉落概率：50% + 75% + 8% = 133%（超过100%，但逐个判断不会重复掉落）
  },

  // 【中型敌机掉落】（方案四新增护盾掉落）
  mediumEnemy: {
    // 护盾道具：血量低时概率更高（满血8% → 空血12%）
    // 新增：中型敌机也能掉落护盾，增加护盾来源多样性
    shieldBase: 0.08,      // 满血时的基础概率（8%）
    shieldBonus: 0.04,     // 空血时额外加成（+4%，最高12%）

    // 双倍火力：血量高时概率更高（满血8% → 空血5%）
    firepowerBase: 0.08,   // 满血时的基础概率（8%）
    firepowerBonus: -0.03, // 空血时减少（-3%，最低5%）

    // 散弹：血量高时概率更高（满血8% → 空血5%）
    spreadBase: 0.08,      // 满血时的基础概率（8%）
    spreadBonus: -0.03,    // 空血时减少（-3%，最低5%）

    // 满血时总掉落概率：8% + 8% + 8% = 24%
    // 空血时总掉落概率：12% + 5% + 5% = 22%
  },

  // 小型敌机不掉落道具
};

// ========== 道具外观配置 ==========
const itemConfig = {
  size: 30,      // 道具基础大小（像素）
  speed: 2,      // 下落速度（像素/帧）

  // 各道具类型定义
  types: {
    // 【回血道具】恢复 1 HP
    heal: {
      color: "#f44",       // 主颜色（红色心形）
      glow: "#f44",        // 外发光颜色
      label: "+1 HP",      // 拾取时浮动文字
    },
    // 【双倍火力】
    firepower: {
      color: "#f80",       // 主颜色（橙色火焰）
      glow: "#f80",        // 外发光颜色
      label: "FIRE UP!",   // 拾取时浮动文字
    },
    // 【护盾】
    shield: {
      color: "#4af",       // 主颜色（蓝色盾牌）
      glow: "#4af",        // 外发光颜色
      label: "SHIELD!",    // 拾取时浮动文字
    },
    // 【散弹】
    spread: {
      color: "#f0f",       // 主颜色（紫色星形）
      glow: "#f0f",        // 外发光颜色
      label: "SPREAD!",    // 拾取时浮动文字
    },
  },
};

// ========== 玩家战机配置 ==========
const heroConfig = {
  maxHp: 3,              // 最大血量
  invincibleFrames: 40,  // 受伤后无敌帧数（~2秒）
  bulletInterval: 3,     // 子弹发射间隔（帧）
  enemySpawnInterval: 8, // 敌机生成间隔（帧）
};

// ========== 子弹配置 ==========
const bulletConfig = {
  baseDamage: 1,         // 基础伤害
  speed: 20,             // 上飞速度（像素/帧）
  horizontalDrift: 3,    // 普通子弹水平偏移（像素/帧）
  diagonalDrift: 5,      // 散弹斜射子弹水平偏移（像素/帧）
};

// ========== 动态概率计算函数 ==========
// 所有函数根据玩家血量比例（hpRatio）计算道具掉落概率
// hpRatio 范围：1.0（满血）→ 0.0（空血）

/**
 * 计算大型敌机回血道具掉落概率
 * @param {number} hpRatio - 玩家血量比例（1.0=满血, 0.0=空血）
 * @returns {number} 回血道具掉落概率（满血25% → 空血75%）
 */
function getDynamicHealDropProb(hpRatio) {
  // 血量低时概率更高：base + (1 - hpRatio) * bonus
  return dropConfig.bigEnemy.healBase + (1 - hpRatio) * dropConfig.bigEnemy.healBonus;
}

/**
 * 计算大型敌机护盾道具掉落概率
 * @param {number} hpRatio - 玩家血量比例（1.0=满血, 0.0=空血）
 * @returns {number} 护盾道具掉落概率（满血30% → 空血50%）
 * 注：方案四大幅提升护盾概率，确保防御道具充足
 */
function getDynamicShieldDropProb(hpRatio) {
  // 血量低时概率更高：base + (1 - hpRatio) * bonus
  return dropConfig.bigEnemy.shieldBase + (1 - hpRatio) * dropConfig.bigEnemy.shieldBonus;
}

/**
 * 计算大型敌机双倍火力道具掉落概率
 * @param {number} hpRatio - 玩家血量比例（1.0=满血, 0.0=空血）
 * @returns {number} 双倍火力道具掉落概率（满血12% → 空血8%）
 */
function getDynamicBigFirepowerDropProb(hpRatio) {
  // 血量高时概率更高（负 bonus）：base + (1 - hpRatio) * bonus
  // hpRatio=1.0（满血）: base + 0 * bonus = base (12%)
  // hpRatio=0.0（空血）: base + 1 * bonus = 12% + (-4%) = 8%
  return dropConfig.bigEnemy.firepowerBase + (1 - hpRatio) * dropConfig.bigEnemy.firepowerBonus;
}

/**
 * 计算中型敌机双倍火力道具掉落概率
 * @param {number} hpRatio - 玩家血量比例（1.0=满血, 0.0=空血）
 * @returns {number} 双倍火力道具掉落概率（满血8% → 空血5%）
 */
function getDynamicMediumFirepowerDropProb(hpRatio) {
  // 血量高时概率更高（负 bonus）
  return dropConfig.mediumEnemy.firepowerBase + (1 - hpRatio) * dropConfig.mediumEnemy.firepowerBonus;
}

/**
 * 计算中型敌机护盾道具掉落概率（方案四新增）
 * @param {number} hpRatio - 玩家血量比例（1.0=满血, 0.0=空血）
 * @returns {number} 护盾道具掉落概率（满血8% → 空血12%）
 * 注：中型敌机新增护盾掉落，增加护盾来源多样性
 */
function getDynamicMediumShieldDropProb(hpRatio) {
  // 血量低时概率更高：base + (1 - hpRatio) * bonus
  return dropConfig.mediumEnemy.shieldBase + (1 - hpRatio) * dropConfig.mediumEnemy.shieldBonus;
}

/**
 * 计算中型敌机散弹道具掉落概率
 * @param {number} hpRatio - 玩家血量比例（1.0=满血, 0.0=空血）
 * @returns {number} 散弹道具掉落概率（满血8% → 空血5%）
 */
function getDynamicSpreadDropProb(hpRatio) {
  // 血量高时概率更高（负 bonus）
  return dropConfig.mediumEnemy.spreadBase + (1 - hpRatio) * dropConfig.mediumEnemy.spreadBonus;
}

/**
 * 计算大型敌机出现概率
 * @param {number} hpRatio - 玩家血量比例（1.0=满血, 0.0=空血）
 * @returns {number} 大型敌机出现概率（满血5% → 空血10%）
 */
function getDynamicBigEnemySpawnProb(hpRatio) {
  // 血量低时出现概率更高
  return enemyConfig.big.spawnProbBase + (1 - hpRatio) * (enemyConfig.big.spawnProbMax - enemyConfig.big.spawnProbBase);
}

export {
  enemyConfig,
  buffConfig,
  dropConfig,
  itemConfig,
  heroConfig,
  bulletConfig,
  // 动态概率函数
  getDynamicHealDropProb,
  getDynamicShieldDropProb,
  getDynamicBigFirepowerDropProb,
  getDynamicMediumFirepowerDropProb,
  getDynamicMediumShieldDropProb,  // 方案四新增：中型敌机护盾概率
  getDynamicSpreadDropProb,
  getDynamicBigEnemySpawnProb,
};