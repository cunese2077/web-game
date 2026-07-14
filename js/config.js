// ========== 敌机配置 ==========
const enemyConfig = {
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
            show: true, // 统一显示（1HP 时血量条瞬间消失）
            showText: true, // 显示血量数字
            offsetY: -8, // 距敌机顶部向上 8px
            height: 4, // 血量条高度
            colorFull: "#4f4", // 满血：绿色
            colorMid: "#ff0", // 中等：黄色
            colorLow: "#f44", // 低血：红色
            midThreshold: 0.5, // <=50% 转黄
            lowThreshold: 0.25, // <=25% 转红
        },
        // 成长配置：小型敌机保持炮灰定位，不涨HP，略微加速增加躲避难度
        scaling: {
            hpScale: 0, // 不涨 HP（保持一击即杀）
            speedScale: 0.01, // 每级速度 +1%（30级时 6→7.74）
            scoreScale: 0.025, // 每级分数 +2.5%（30级时 10→23）
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
            showText: true, // 显示血量数字
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
            hpScale: 0.06, // 30级时 HP ≈ 52（3.5倍），普通难度适中
            speedScale: 0.008, // 每级速度 +0.8%（30级时 4→5.20）
            scoreScale: 0.10, // 30级时分数 ≈ 122（6倍）
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
            showText: true, // 显示血量数字
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
            hpScale: 0.08, // 30级时 HP ≈ 301（4.3倍），普通难度适中
            speedScale: 0.005, // 每级速度 +0.5%（30级时 2→2.29）
            scoreScale: 0.12, // 30级时分数 ≈ 760（7.6倍）
        },
    },
};
// ========== 敌机受击动效配置（全局，所有敌机共用） ==========
// 控制子弹击中敌机但未击毁时的音效和伤害数字反馈
const hitEffect = {
    soundCoolDown: 6, // 受击音效冷却 6 帧（与子弹射击一致，防抖）
    damageText: {
        show: true, // 显示伤害浮动数字
        fontSize: 18, // 字体大小
        color: "#f44", // 红色文字，醒目
        floatDistance: 30, // 上浮 30 像素
        frames: 25, // 持续 25 帧
        stackOffset: 22, // 堆叠偏移步长 22px（略大于字号 18px，确保不重叠；过大会导致连续命中时频繁跳过显示）
        // 动态防重叠：生成时查找同 x 附近现存动效的当前 y（含上浮进度），
        // 找到与所有现存动效距离 >= stackOffset 的空槽；找不到则跳过本次显示（避免重叠）
    },
};
// ========== 敌机等级成长配置 ==========
// 幂函数指数：控制属性增长曲线的加速程度
// 1.0=线性，1.1=温和加速，1.2=中速加速（推荐，配合升级系统保持后期挑战）
const ENEMY_SCALING_EXPONENT = 1.1;
// 敌机生成比例随等级缩放配置
// 后期小型敌机减少、中型增多，游戏节奏从"躲避大量弱敌"过渡到"对抗少量强敌"
const enemySpawnScaling = {
    smallWeightDecay: 0.025, // 小型敌机出现权重每级 -2.5%（30级时权重从15→4）
    mediumWeightGrowth: 0.02, // 中型敌机出现权重每级 +2%（30级时权重从5→8）
    bigProbGrowth: 0.001, // 大型敌机基础出现概率每级 +0.1%（30级时基础概率从5%→7.9%）
};
// 敌机属性缩放辅助函数
// HP/分数使用幂函数增长：base × (1 + scaleFactor × (level-1)^exponent)
// 速度使用线性增长：base × (1 + speedScale × (level-1))
function getScaledEnemyStat(base, scaleFactor, level, linear = false) {
    if (scaleFactor === 0 || level <= 1)
        return base;
    const multiplier = linear ? (level - 1) : Math.pow(level - 1, ENEMY_SCALING_EXPONENT);
    return base * (1 + scaleFactor * multiplier);
}
// ========== 难度配置 ==========
// 难度只影响敌机强度和道具掉落，玩家属性不变
// 难度越高 → 敌机越强（HP/速度/成长/生成频率），道具越少
// 新增难度只需在此添加一个配置对象 + 对应 i18n 翻译
const difficultyConfig = {
    // 【普通】标准难度，敌机属性无加成，3次刷新机会
    normal: {
        label: "difficulty.normal",
        enemyHpMultiplier: 1.0,
        enemySpeedMultiplier: 1.0,
        enemyScalingMultiplier: 1.0,
        enemySpawnRateMultiplier: 1.0,
        dropRateMultiplier: 1.0,
        upgradeRerolls: 3,
    },
    // 【中等】敌机 HP +30%、速度 +10%、成长系数 ×1.5、生成更频繁、道具略少、2次刷新
    medium: {
        label: "difficulty.medium",
        enemyHpMultiplier: 1.3,
        enemySpeedMultiplier: 1.1,
        enemyScalingMultiplier: 1.5,
        enemySpawnRateMultiplier: 0.85,
        dropRateMultiplier: 0.85,
        upgradeRerolls: 2,
    },
    // 【困难】敌机 HP +60%、速度 +20%、成长系数 ×2.0、生成大幅加快、道具显著减少、1次刷新
    hard: {
        label: "difficulty.hard",
        enemyHpMultiplier: 1.6,
        enemySpeedMultiplier: 1.2,
        enemyScalingMultiplier: 2.0,
        enemySpawnRateMultiplier: 0.65,
        dropRateMultiplier: 0.65,
        upgradeRerolls: 1,
    },
};
function getDifficultyConfig(difficulty) {
    return difficultyConfig[difficulty];
}
// ========== Buff 配置 ==========
const buffConfig = {
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
const dropConfig = {
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
const itemConfig = {
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
const heroConfig = {
    maxHp: 3,
    invincibleFrames: 40,
    bulletInterval: 3,
    enemySpawnInterval: 8,
};
// ========== 子弹配置 ==========
const bulletConfig = {
    baseDamage: 1,
    speed: 20,
    horizontalDrift: 3,
    diagonalDrift: 5,
};
// ========== 等级配置 ==========
// 经验曲线：expToNext(lv) = base + growth × (lv-1)^exponent
// Roguelike 升级选择系统需要更多升级次数（50级满级，约20-25分钟一局）
const levelConfig = {
    base: 300, // 1→2 级所需经验（降低起步门槛）
    growth: 25, // 每级递增基数
    exponent: 1.05, // 轻微加速后期
    maxLevel: 50, // 满级
    expRewards: {
        small: 5, // 小型敌机击毁经验
        medium: 15, // 中型敌机击毁经验
        big: 80, // 大型敌机击毁经验
    },
};
// ========== 动态概率计算函数 ==========
function getDynamicHealDropProb(hpRatio) {
    return dropConfig.bigEnemy.healBase + (1 - hpRatio) * dropConfig.bigEnemy.healBonus;
}
function getDynamicShieldDropProb(hpRatio) {
    return dropConfig.bigEnemy.shieldBase + (1 - hpRatio) * dropConfig.bigEnemy.shieldBonus;
}
function getDynamicBigFirepowerDropProb(hpRatio) {
    return dropConfig.bigEnemy.firepowerBase + (1 - hpRatio) * dropConfig.bigEnemy.firepowerBonus;
}
function getDynamicMediumFirepowerDropProb(hpRatio) {
    return dropConfig.mediumEnemy.firepowerBase + (1 - hpRatio) * dropConfig.mediumEnemy.firepowerBonus;
}
function getDynamicMediumShieldDropProb(hpRatio) {
    return dropConfig.mediumEnemy.shieldBase + (1 - hpRatio) * dropConfig.mediumEnemy.shieldBonus;
}
function getDynamicSpreadDropProb(hpRatio) {
    return dropConfig.mediumEnemy.spreadBase + (1 - hpRatio) * dropConfig.mediumEnemy.spreadBonus;
}
function getDynamicBigEnemySpawnProb(hpRatio) {
    return enemyConfig.big.spawnProbBase + (1 - hpRatio) * (enemyConfig.big.spawnProbMax - enemyConfig.big.spawnProbBase);
}
// ========== 升级池配置 ==========
// P1：基础武器升级 + 4 种被动
// 基础武器每级效果：
//   Lv1: 三路子弹（默认）
//   Lv2: 伤害 +30%
//   Lv3: 四路子弹
//   Lv4: 伤害 +30%, 射速 +20%
//   Lv5: 五路子弹 + 穿透
const upgradePool = [
    {
        id: "baseWeapon",
        type: "weapon",
        rarity: "rare", // 武器升级是核心成长，稀有度高于普通被动
        maxLevel: 5,
        weaponSlot: true,
        prerequisites: [],
        evolutionFrom: null,
        label: "upgrade.baseWeapon",
        descriptions: [
            "upgrade.baseWeapon.desc.1", // Lv1→2: 伤害 +30%
            "upgrade.baseWeapon.desc.2", // Lv2→3: 四路子弹
            "upgrade.baseWeapon.desc.3", // Lv3→4: 伤害+射速提升
            "upgrade.baseWeapon.desc.4", // Lv4→5: 五路+穿透
        ],
        icon: "bullet",
    },
    {
        id: "hpUp",
        type: "passive",
        rarity: "common", // 基础被动，最常见
        maxLevel: 99,
        weaponSlot: false,
        prerequisites: [],
        evolutionFrom: null,
        label: "upgrade.hpUp",
        descriptions: ["upgrade.hpUp.desc"],
        icon: "heart",
    },
    {
        id: "damageUp",
        type: "passive",
        rarity: "rare", // 伤害增幅是核心属性，较少出现
        maxLevel: 99,
        weaponSlot: false,
        prerequisites: [],
        evolutionFrom: null,
        label: "upgrade.damageUp",
        descriptions: ["upgrade.damageUp.desc"],
        icon: "sword",
    },
    {
        id: "fireRateUp",
        type: "passive",
        rarity: "rare", // 射速增幅是核心属性，较少出现
        maxLevel: 99,
        weaponSlot: false,
        prerequisites: [],
        evolutionFrom: null,
        label: "upgrade.fireRateUp",
        descriptions: ["upgrade.fireRateUp.desc"],
        icon: "lightning",
    },
    {
        id: "moveSpeedUp",
        type: "passive",
        rarity: "common", // 移速是辅助属性，常见
        maxLevel: 99,
        weaponSlot: false,
        prerequisites: [],
        evolutionFrom: null,
        label: "upgrade.moveSpeedUp",
        descriptions: ["upgrade.moveSpeedUp.desc"],
        icon: "boot",
    },
    // ========== 史诗 (epic) 道具 ==========
    {
        id: "critChance",
        type: "passive",
        rarity: "epic",
        maxLevel: 5,
        weaponSlot: false,
        prerequisites: [],
        evolutionFrom: null,
        label: "upgrade.critChance",
        descriptions: ["upgrade.critChance.desc"],
        icon: "sword",
    },
    {
        id: "shieldExtend",
        type: "passive",
        rarity: "epic",
        maxLevel: 3,
        weaponSlot: false,
        prerequisites: [],
        evolutionFrom: null,
        label: "upgrade.shieldExtend",
        descriptions: ["upgrade.shieldExtend.desc"],
        icon: "heart",
    },
    // ========== 传说 (legendary) 道具 ==========
    {
        id: "lifeSteal",
        type: "passive",
        rarity: "legendary",
        maxLevel: 3,
        weaponSlot: false,
        prerequisites: [],
        evolutionFrom: null,
        label: "upgrade.lifeSteal",
        descriptions: ["upgrade.lifeSteal.desc"],
        icon: "heart",
    },
];
// 稀有度权重：数值越大出现概率越高
const rarityWeights = {
    common: 50,
    rare: 30,
    epic: 15,
    legendary: 5,
};
// BOSS 击杀加成：每次击杀 big 敌机，epic/legendary 权重增加此值
const bossKillRarityBonus = 15;
export { enemyConfig, enemySpawnScaling, difficultyConfig, buffConfig, dropConfig, itemConfig, heroConfig, bulletConfig, levelConfig, hitEffect, getScaledEnemyStat, getDifficultyConfig, getDynamicHealDropProb, getDynamicShieldDropProb, getDynamicBigFirepowerDropProb, getDynamicMediumFirepowerDropProb, getDynamicMediumShieldDropProb, getDynamicSpreadDropProb, getDynamicBigEnemySpawnProb, upgradePool, rarityWeights, bossKillRarityBonus, };
