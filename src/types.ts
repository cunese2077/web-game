// ========== 全局类型定义 ==========
import type { TextKey } from "./i18n.js";


// --- 游戏阶段常量与类型 ---
export const PHASE_DOWNLOAD = 1 as const;
export const PHASE_READY = 2 as const;
export const PHASE_LOADING = 3 as const;
export const PHASE_PLAY = 4 as const;
export const PHASE_PAUSE = 5 as const;
export const PHASE_GAME_OVER = 6 as const;
export const PHASE_LEVEL_UP = 7 as const;

export type GamePhase =
  | typeof PHASE_DOWNLOAD
  | typeof PHASE_READY
  | typeof PHASE_LOADING
  | typeof PHASE_PLAY
  | typeof PHASE_PAUSE
  | typeof PHASE_GAME_OVER
  | typeof PHASE_LEVEL_UP;

// --- 敌机类型 ---
export type EnemyType = "small" | "medium" | "big";

// --- 游戏难度 ---
export type Difficulty = "normal" | "medium" | "hard";

// --- 难度配置 ---
export interface DifficultyConfig {
  label: TextKey;                   // 难度名称 i18n key
  enemyHpMultiplier: number;        // 敌机 HP 乘数（1.0=标准）
  enemySpeedMultiplier: number;     // 敌机速度乘数
  enemyScalingMultiplier: number;   // 敌机成长系数乘数（影响后期 HP/分数增长速度）
  enemySpawnRateMultiplier: number;  // 敌机生成间隔乘数（<1=更频繁，>1=更稀疏）
  dropRateMultiplier: number;       // 道具掉落概率乘数
  upgradeRerolls: number;           // 每次升级的刷新次数
}

// --- 移动模式 ---
export type MoveType = "straight" | "sine" | "zigzag";

// --- 敌机移动配置 ---
export interface SmallEnemyMoveConfig {
  type: "straight";
}

export interface SineMoveConfig {
  type: "sine";
  amplitude: number;
  frequency: number;
}

export interface ZigzagMoveConfig {
  type: "zigzag";
  amplitude: number;
  horizontalSpeed: number;
}

export type EnemyMoveConfig = SmallEnemyMoveConfig | SineMoveConfig | ZigzagMoveConfig;

// --- 敌机血量条配置 ---
export interface HpBarConfig {
  show: boolean;          // 是否显示血量条
  showText: boolean;      // 是否显示血量数字（当前HP/最大HP）
  offsetY: number;        // 距敌机顶部偏移（负数=向上）
  height: number;         // 血量条高度
  colorFull: string;      // 满血颜色（ratio > midThreshold）
  colorMid: string;       // 中等血量颜色（lowThreshold < ratio <= midThreshold）
  colorLow: string;       // 低血颜色（ratio <= lowThreshold）
  midThreshold: number;   // 中等血量阈值（比例）
  lowThreshold: number;   // 低血阈值（比例）
}

// --- 伤害浮动动效配置 ---
export interface DamageTextConfig {
  show: boolean;          // 是否显示伤害数字
  fontSize: number;       // 字体大小
  color: string;          // 文字颜色
  floatDistance: number;  // 上浮距离（像素）
  frames: number;         // 持续帧数
  stackOffset: number;    // 堆叠偏移步长（像素）：新动效相对同 x 附近最高现有动效的上方间距
                          // 动态防重叠：生成时查找同 x 附近（fontSize*2 范围内）现存动效的当前 y，
                          // 在最高动效之上再偏移 stackOffset，确保不重叠（含单帧多弹 + 跨帧累积场景）
}

// --- 敌机受击动效配置（全局，所有敌机共用） ---
export interface HitEffectConfig {
  soundCoolDown: number;      // 受击音效冷却帧数（防抖）
  damageText: DamageTextConfig;  // 伤害浮动动效配置
}

// --- 敌机成长配置 ---
// scaleFactor 控制属性随等级的增长速率，公式：base × (1 + scaleFactor × (level-1)^exponent)
// speed 使用线性增长：base × (1 + speedScale × (level-1))
export interface EnemyScalingConfig {
  hpScale: number;     // HP 成长系数（0=不增长）
  speedScale: number;  // 速度成长系数（0=不增长，线性）
  scoreScale: number;  // 分数成长系数（0=不增长）
}

// --- 敌机生成缩放配置 ---
export interface EnemySpawnScalingConfig {
  smallWeightDecay: number;    // 小型敌机出现权重每级衰减率
  mediumWeightGrowth: number;  // 中型敌机出现权重每级增长率
  bigProbGrowth: number;       // 大型敌机基础出现概率每级增长值
}

// --- 敌机配置 ---
export interface SmallEnemyConfig {
  speed: number;
  hp: number;
  score: number;
  spawnWeight: number;
  move: SmallEnemyMoveConfig;
  hpBar: HpBarConfig;
  scaling: EnemyScalingConfig;
}

export interface MediumEnemyConfig {
  speed: number;
  hp: number;
  score: number;
  spawnWeight: number;
  move: SineMoveConfig;
  hpBar: HpBarConfig;
  scaling: EnemyScalingConfig;
}

export interface BigEnemyConfig {
  speed: number;
  hp: number;
  score: number;
  spawnProbBase: number;
  spawnProbMax: number;
  coolDownFrames: number;
  move: ZigzagMoveConfig;
  hpBar: HpBarConfig;
  scaling: EnemyScalingConfig;
}

export interface EnemyConfig {
  small: SmallEnemyConfig;
  medium: MediumEnemyConfig;
  big: BigEnemyConfig;
}

// --- Buff 类型 ---
export type BuffKey = "firepower" | "shield" | "spread";

export interface BuffEntryConfig {
  duration: number;
  color: string;
  icon: string;
  label: TextKey;   // buff 标签的 i18n key（如 "buff.firepower"），绘制时用 t() 转换
}

export interface FirepowerBuffConfig extends BuffEntryConfig {
  damageMultiplier: number;
}

export interface ShieldBuffConfig extends BuffEntryConfig {
  invincibleFrames: number;
}

export interface SpreadBuffConfig extends BuffEntryConfig {
  bulletCount: number;
  spreadAngle: number;
}

export interface BuffConfig {
  firepower: FirepowerBuffConfig;
  shield: ShieldBuffConfig;
  spread: SpreadBuffConfig;
}

export interface BuffState {
  firepower: number;
  shield: number;
  spread: number;
}

// --- 道具类型 ---
export type ItemType = "heal" | "firepower" | "shield" | "spread";

export interface ItemTypeConfig {
  color: string;
  glow: string;
  label: TextKey;   // 道具浮动文本的 i18n key（如 "item.heal"），绘制时用 t() 转换
}

export interface ItemConfig {
  size: number;
  speed: number;
  types: Record<ItemType, ItemTypeConfig>;
}

// --- 道具掉落配置 ---
export interface BigEnemyDropConfig {
  shieldBase: number;
  shieldBonus: number;
  healBase: number;
  healBonus: number;
  firepowerBase: number;
  firepowerBonus: number;
}

export interface MediumEnemyDropConfig {
  shieldBase: number;
  shieldBonus: number;
  firepowerBase: number;
  firepowerBonus: number;
  spreadBase: number;
  spreadBonus: number;
}

export interface DropConfig {
  bigEnemy: BigEnemyDropConfig;
  mediumEnemy: MediumEnemyDropConfig;
}

// --- 玩家战机配置 ---
export interface HeroConfig {
  maxHp: number;
  invincibleFrames: number;
  bulletInterval: number;
  enemySpawnInterval: number;
}

// --- 子弹配置 ---
export interface BulletConfig {
  baseDamage: number;
  speed: number;
  horizontalDrift: number;
  diagonalDrift: number;
}

// --- 等级配置 ---
export interface LevelConfig {
  base: number;           // 基础升级经验（1→2 级所需）
  growth: number;         // 递增系数（每级经验增量基数）
  exponent: number;       // 经验曲线指数（1.0=线性，1.5=超线性）
  maxLevel: number;       // 满级
  expRewards: {           // 各敌机经验奖励
    small: number;
    medium: number;
    big: number;
  };
}

// --- 升级系统类型 ---
export type UpgradeRarity = "common" | "rare" | "epic" | "legendary";

export type UpgradeType = "weapon" | "passive" | "special";

// 升级定义：描述一种可获取的升级
export interface UpgradeDef {
  id: string;                    // 唯一标识
  type: UpgradeType;
  rarity: UpgradeRarity;
  maxLevel: number;              // 最大等级（武器=5，被动=可叠加/特殊=1）
  weaponSlot: boolean;           // 是否占用武器槽位
  prerequisites: string[];       // 前置升级 id
  evolutionFrom: [string, string] | null;  // 进化来源（两个 Lv5 武器 id）
  label: TextKey;                // 名称 i18n key
  descriptions: TextKey[];       // 各等级描述 i18n key（索引=当前等级-1，升级到下一级时显示）
  icon: string;                  // 图标标识（Canvas 绘制用）
}

// 升级选项：出牌算法生成的一张卡片
export interface UpgradeOffer {
  upgradeId: string;
  currentLevel: number;   // 当前等级（0=尚未获得）
  nextLevel: number;       // 升级后的等级
  isNew: boolean;          // 是否首次获得
  def: UpgradeDef;         // 关联的定义
}

// --- Buff 浮动文字 ---
export interface BuffFloat {
  text: string;
  color: string;
  frame: number;
  maxFrame: number;
}
