// ========== 全局类型定义 ==========

// --- 游戏阶段常量与类型 ---
export const PHASE_DOWNLOAD = 1 as const;
export const PHASE_READY = 2 as const;
export const PHASE_LOADING = 3 as const;
export const PHASE_PLAY = 4 as const;
export const PHASE_PAUSE = 5 as const;
export const PHASE_GAMEOVER = 6 as const;

export type GamePhase =
  | typeof PHASE_DOWNLOAD
  | typeof PHASE_READY
  | typeof PHASE_LOADING
  | typeof PHASE_PLAY
  | typeof PHASE_PAUSE
  | typeof PHASE_GAMEOVER;

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

// --- 敌机配置 ---
export interface SmallEnemyConfig {
  speed: number;
  hp: number;
  score: number;
  spawnWeight: number;
  move: SmallEnemyMoveConfig;
}

export interface MediumEnemyConfig {
  speed: number;
  hp: number;
  score: number;
  spawnWeight: number;
  move: SineMoveConfig;
}

export interface BigEnemyConfig {
  speed: number;
  hp: number;
  score: number;
  spawnProbBase: number;
  spawnProbMax: number;
  cooldownFrames: number;
  move: ZigzagMoveConfig;
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
  label: string;
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
  label: string;
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

// --- Buff 浮动文字 ---
export interface BuffFloat {
  text: string;
  color: string;
  frame: number;
  maxFrame: number;
}
