// 特殊武器类型模块（从 specialWeapons.ts 拆出）：敌机代理接口 + 系统更新上下文
// EnemyProxy 避免对 enemy.ts 的循环依赖；WeaponContext 由门面组装后传给各武器系统

// 敌机代理接口（避免循环依赖）
export interface EnemyProxy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  die: boolean;
  lives: number;
  type: string;
}

// 伤害结算回调：命中敌机时调用（isCrit 控制暴击表现，skipHitSound 合并音效）
export type DamageEnemyFn = (enemy: EnemyProxy, damage: number, isCrit: boolean, skipHitSound?: boolean) => void;

// 减速回调：附加效果（冰冻/EMP）命中时调用
export type SlowEnemyFn = (enemyId: number, factor: number, frames: number) => void;

// 各武器系统共享的更新上下文（由门面每帧组装）
export interface WeaponContext {
  heroX: number;
  heroY: number;
  heroW: number;
  heroH: number;
  heroCx: number;        // 英雄中心 X
  heroCy: number;        // 英雄中心 Y
  enemies: EnemyProxy[];
  firepowerMul: number;  // 火力 buff 乘数（无 buff 时为 1）
  damageEnemy: DamageEnemyFn;
  slowEnemy: SlowEnemyFn;
}
