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
const levelConfig = {
    base: 450, // 1→2 级所需经验（起步门槛）
    growth: 30, // 每级递增基数（线性：每级 +30）
    exponent: 1.0, // 曲线指数（1.0=线性，前期平稳后期不过陡）
    maxLevel: 30, // 满级
    expRewards: {
        small: 7, // 小型敌机击毁经验
        medium: 20, // 中型敌机击毁经验
        big: 100, // 大型敌机击毁经验
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
export { enemyConfig, buffConfig, dropConfig, itemConfig, heroConfig, bulletConfig, levelConfig, hitEffect, getDynamicHealDropProb, getDynamicShieldDropProb, getDynamicBigFirepowerDropProb, getDynamicMediumFirepowerDropProb, getDynamicMediumShieldDropProb, getDynamicSpreadDropProb, getDynamicBigEnemySpawnProb, };
