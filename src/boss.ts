// BOSS 系统模块（门面）：实现拆分至子模块，消费方 import 路径不变（沿用 ui.ts 拆分先例）
// - bossTypes.ts：BossPhase/BossType 类型 + getBossType
// - bossPatterns.ts：弹幕基础形态纯函数（螺旋/圆形/扇形/定向/弹幕雨）
// - bossBody.ts：4 种类型差异化外观绘制（只读 BossBodyState 状态束）
// - bossEntity.ts：Boss 类核心（构造/更新/伤害结算/绘制装配）
// - bossManager.ts：触发/预警/生成/查询等管理状态
import { Boss } from "./bossEntity.js";
import {
  checkBossTrigger,
  registerDebugBossLevel,
  startBossWarning,
  updateBossWarning,
  spawnBoss,
  updateAndDrawBoss,
  getActiveBoss,
  isBossAlive,
  clearBoss,
  getBossWarningTimer,
  getSessionBossKillCount,
} from "./bossManager.js";

export {
  Boss,
  checkBossTrigger,
  registerDebugBossLevel,
  startBossWarning,
  updateBossWarning,
  spawnBoss,
  updateAndDrawBoss,
  getActiveBoss,
  isBossAlive,
  clearBoss,
  getBossWarningTimer,
  getSessionBossKillCount,
};
