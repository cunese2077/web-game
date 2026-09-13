// BOSS 公共类型（从 boss.ts 拆出）
// Boss 攻击阶段
type BossPhase = 1 | 2 | 3;

// Boss 类型：4种差异化行为循环出现
type BossType = "assault" | "fortress" | "carrier" | "phantom";

// 根据 bossIndex 决定类型（循环：0=突击 1=堡垒 2=母舰 3=幻影）
function getBossType(bossIndex: number): BossType {
  const types: BossType[] = ["assault", "fortress", "carrier", "phantom"];
  // 负数安全取模：bossIndex 异常为 -1 时回退到突击型，避免 undefined
  const idx = ((bossIndex % 4) + 4) % 4;
  return types[idx];
}

export { getBossType };
export type { BossPhase, BossType };
