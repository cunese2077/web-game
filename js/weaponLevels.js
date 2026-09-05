// 特殊武器等级效果表（从 specialWeapons.ts 拆出）：导弹/能量/僚机数值单一来源
// upgradeUI._descParams 从这里读取占位符数值，改这里描述自动同步（严禁在 i18n 硬编码）
// ========== 武器等级效果表 ==========
// 追踪导弹（每 40 帧发射；第 18 轮：50→40 + 伤害翻倍，让导弹路线有存在感）
// Lv1: 1枚, 伤害6 | Lv2: 1枚, 伤害9 | Lv3: 2枚, 伤害13 | Lv4: 2枚, 伤害17 | Lv5: 3枚, 伤害22+爆炸
export const MISSILE_LEVELS = [
    { count: 1, damage: 6, explosionRadius: 0 },
    { count: 1, damage: 9, explosionRadius: 0 },
    { count: 2, damage: 13, explosionRadius: 0 },
    { count: 2, damage: 17, explosionRadius: 20 },
    { count: 3, damage: 22, explosionRadius: 35 },
];
export const MISSILE_INTERVAL = 40;
// 能量武器（激光+闪电合体，每 80 帧发激光，每 80 帧发闪电链；第 18 轮：100→80 + 伤害提升）
// Lv1: 激光12/射400, 链1/伤6 | Lv2: 链+1/伤9 | Lv3: 激光17/射500 | Lv4: 链3/伤14, 激光22/射600 | Lv5: 全屏激光30+链17
export const ENERGY_LEVELS = [
    { laserDamage: 12, laserLength: 400, lightningDamage: 6, chains: 1 }, // Lv1: 400px 射程
    { laserDamage: 12, laserLength: 400, lightningDamage: 9, chains: 2 }, // Lv2: chain +1
    { laserDamage: 17, laserLength: 500, lightningDamage: 11, chains: 2 }, // Lv3: laser dmg +5
    { laserDamage: 22, laserLength: 600, lightningDamage: 14, chains: 3 }, // Lv4: chain +1, longer laser
    { laserDamage: 30, laserLength: -1, lightningDamage: 17, chains: 3 }, // Lv5: full screen + chain 3
];
export const LASER_INTERVAL = 80;
export const LIGHTNING_INTERVAL = 80;
export const LASER_HIT_HALF_WIDTH = 18;
export const LIGHTNING_CHAIN_RANGE = 120;
// 僚机（基于被动叠加，每 6 帧射击）
// 伤害公式：基础 0.8 + (数量-1) × 成长 0.3（第 18 轮调整）
export const WINGMAN_BASE_DAMAGE = 0.8;
export const WINGMAN_DAMAGE_GROWTH = 0.3;
export const WINGMAN_INTERVAL = 6;
export const WINGMAN_OFFSET = 25;
export const WINGMAN_BULLET_SPEED = 12;
