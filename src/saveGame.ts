// 中断续玩模块：游戏进行中把可恢复状态快照到 localStorage
// 设计：
//   - 只存"可重建"的进度数据（分数/等级/经验/Build/英雄 HP+位置），运行时实体（敌机/子弹/道具）不存，恢复后空场重开
//   - 保存时机：游戏中每 100 帧（5秒@20fps）自动存 + pagehide/切后台立即存
//   - 失效时机：游戏结束结算、暂停/结算界面返回主页
//   - 版本号防陈旧结构；解析失败静默丢弃（同 settings.ts 容错模式）
import { getGameScore } from "./score.js";
import { getLevel, getExp, getTotalExp } from "./level.js";
import { getPendingLevelUps } from "./upgrade.js";

const STORAGE_KEY = "web-game-save";
// v2：新增 boss 字段（保留中断时的血量/阶段，而非重打）
const SAVE_VERSION = 2;

// BOSS 战中断时的可恢复状态（bossPending=true 时存在）
interface BossSaveState {
  hp: number;          // 中断时剩余血量
  maxHp: number;       // 满血（恢复后重算可能与配置漂移，以存档为准绘制血条比例）
  bossIndex: number;   // 第几个 BOSS（决定类型与强度）
  attackPhase: number; // 攻击阶段（1/2/3）
}

// 快照数据结构（JSON 可序列化）
interface SaveSnapshot {
  version: number;
  savedAt: number;        // Date.now()，供调试
  score: number;
  level: number;
  exp: number;
  totalExp: number;
  weapons: Record<string, number>;    // weaponId → level
  passives: Record<string, number>;   // passiveId → stacks
  pendingLevelUps: number;
  bossPending: boolean;   // 恢复后重打 BOSS（原局在 BOSS 战/预警中）
  boss: BossSaveState | null;  // BOSS 战中断时的状态（预警阶段中断为 null → 从预警重打）
  hero: { x: number; y: number; hp: number };
}

// 由 engine 在保存时机调用：收集当前进度（weapons/passives 由 upgrade 模块导出的收集函数提供）
function saveGame(weapons: Record<string, number>, passives: Record<string, number>, bossPending: boolean, boss: BossSaveState | null, heroX: number, heroY: number, heroHp: number): void {
  try {
    const snap: SaveSnapshot = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      score: getGameScore(),
      level: getLevel(),
      exp: getExp(),
      totalExp: getTotalExp(),
      weapons,
      passives,
      pendingLevelUps: getPendingLevelUps(),
      bossPending,
      boss,
      hero: { x: heroX, y: heroY, hp: heroHp },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // localStorage 不可用（隐私模式/已满），静默忽略
  }
}

// 读取快照：不存在/版本不符/结构损坏返回 null
function loadGame(): SaveSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as SaveSnapshot;
    if (snap.version !== SAVE_VERSION) return null;
    // 结构防御：关键字段类型校验，损坏即丢弃
    if (typeof snap.score !== "number" || typeof snap.level !== "number" ||
        typeof snap.exp !== "number" || typeof snap.totalExp !== "number" ||
        typeof snap.weapons !== "object" || typeof snap.passives !== "object" ||
        typeof snap.pendingLevelUps !== "number" || typeof snap.bossPending !== "boolean" ||
        typeof snap.hero !== "object" || snap.hero === null) return null;
    // boss 可选：bossPending 时应为合法对象
    if (snap.boss !== undefined && snap.boss !== null) {
      const b = snap.boss;
      if (typeof b.hp !== "number" || typeof b.maxHp !== "number" ||
          typeof b.bossIndex !== "number" || typeof b.attackPhase !== "number") return null;
      if (!(b.hp > 0) || !(b.maxHp > 0) || b.bossIndex < 0) return null;
    }
    return snap;
  } catch {
    return null;
  }
}

// 删除快照（游戏结束/放弃本局）
function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 静默忽略
  }
}

export type { SaveSnapshot };
export { saveGame, loadGame, clearSave };
