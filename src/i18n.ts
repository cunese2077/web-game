// 国际化模块：集中管理游戏内所有显示文本的多语言翻译
// 默认中文（zh），可通过 setLocale 切换语言
//
// 【设计原则】
// - 所有显示在 canvas 上的文本（HUD、动效、界面）通过 t(key) 获取
// - config.ts 中 buff/item 的 label 字段存 TextKey，绘制时用 t() 转换
// - 数字、符号（+1, -X, ×1.05, 100%）无需翻译，直接拼接
// - 会随代码数值变动的数字必须用 {name} 占位符，由调用方传参 t(key, params)；
//   数值来源为 specialWeapons.ts / upgrade.ts 导出的等级表与常量（单一来源），
//   禁止在三语描述里硬编码伤害/数量等会随平衡调整变动的数值
// - 新增文本时在 TextKey 联合类型和 translations 字典中同步添加
// 三语字典拆分至 locales/zh.ts、en.ts、ja.ts（沿用 ui.ts 门面拆分先例）：
// 本文件保留 TextKey 类型定义与运行时逻辑，消费方 import 路径不变
import { zh } from "./locales/zh.js";
import { en } from "./locales/en.js";
import { ja } from "./locales/ja.js";

// ========== 支持的语言 ==========
export type Locale = "zh" | "en" | "ja";

// ========== 文本 key（所有可翻译文本的唯一标识） ==========
export type TextKey =
  // HUD（hero.ts）
  | "hud.score"          // "得分" / "SCORE"
  | "hud.level"          // "等级" / "LV."
  | "hud.max"            // "满级" / "MAX"
  | "hud.hp"             // "生命" / "HP"
  | "hud.atk"            // "攻击" / "ATK"
  | "hud.rate"           // "射速" / "RATE"
  | "hud.buff"           // "增益" / "BUFF"
  // 动效（hero.ts）
  | "effect.heal"        // "+1 生命" / "+1 HP"
  | "effect.levelUp"     // "升级! → " / "LEVEL UP! → "
  // buff 标签（config.ts buffConfig）
  | "buff.firepower"     // "火力" / "FIRE"
  | "buff.shield"        // "护盾" / "SHIELD"
  | "buff.spread"        // "散射" / "SPREAD"
  // 道具拾取浮动文本（config.ts itemConfig）
  | "item.heal"          // "+1 生命" / "+1 HP"
  | "item.firepower"     // "火力提升!" / "FIRE UP!"
  | "item.shield"        // "护盾!" / "SHIELD!"
  | "item.spread"        // "散射!" / "SPREAD!"
  // 游戏结束界面（ui.ts）
  | "gameOver.title"     // "游戏结束" / "GAME OVER"
  | "gameOver.score"     // "得分: " / "SCORE: "
  | "gameOver.level"     // "等级: " / "LEVEL: "
  | "gameOver.totalExp"  // "  |  总经验: " / "  |  TOTAL EXP: "
  | "gameOver.restart"   // "点击重新开始" / "Click to Restart"
  | "gameOver.build"     // "Build 摘要" / "BUILD SUMMARY"
  | "gameOver.weapons"   // "武器" / "WEAPONS"
  | "gameOver.passives"  // "被动" / "PASSIVES"
  | "gameOver.highScore" // "最高分: " / "HIGH SCORE: "
  | "gameOver.highLevel" // "最高等级: " / "HIGH LEVEL: "
  | "gameOver.newRecord" // "新纪录!" / "NEW RECORD!"
  | "pause.backToMain"  // "返回主页" / "BACK TO MAIN"
  // 成就（分级系统：铜/银/金三档）
  | "achievement.firstGame"          // "初次出击" / "FIRST SORTIE"
  | "achievement.firstGame.desc"     // "完成第一局游戏" / "Complete your first game"
  | "achievement.firstGame.bronze"   // "完成 1 局游戏" / "Complete 1 game"
  | "achievement.firstGame.silver"   // "完成 3 局游戏" / "Complete 3 games"
  | "achievement.firstGame.gold"     // "完成 5 局游戏" / "Complete 5 games"
  | "achievement.score"              // "得分达人" / "SCORE MASTER"
  | "achievement.score.bronze"       // "单局得分达到 1000" / "Score 1000 in a single run"
  | "achievement.score.silver"       // "单局得分达到 5000" / "Score 5000 in a single run"
  | "achievement.score.gold"         // "单局得分达到 10000" / "Score 10000 in a single run"
  | "achievement.level"              // "等级攀升" / "LEVEL CLIMBER"
  | "achievement.level.bronze"       // "达到 10 级" / "Reach level 10"
  | "achievement.level.silver"       // "达到 20 级" / "Reach level 20"
  | "achievement.level.gold"         // "达到 30 级（满级）" / "Reach level 30 (MAX)"
  | "achievement.bossKill"           // "BOSS 克星" / "BOSS SLAYER"
  | "achievement.bossKill.bronze"    // "击败 1 个 BOSS" / "Defeat 1 BOSS"
  | "achievement.bossKill.silver"    // "累计击败 5 个 BOSS" / "Defeat 5 BOSSes total"
  | "achievement.bossKill.gold"      // "累计击败 10 个 BOSS" / "Defeat 10 BOSSes total"
  | "achievement.kills"              // "歼敌先锋" / "ENEMY SLAYER"
  | "achievement.kills.bronze"       // "累计击杀 100 架敌机" / "Kill 100 enemies total"
  | "achievement.kills.silver"       // "累计击杀 500 架敌机" / "Kill 500 enemies total"
  | "achievement.kills.gold"         // "累计击杀 1000 架敌机" / "Kill 1000 enemies total"
  | "achievement.games"              // "常客" / "REGULAR"
  | "achievement.games.bronze"       // "完成 10 局游戏" / "Complete 10 games"
  | "achievement.games.silver"       // "完成 25 局游戏" / "Complete 25 games"
  | "achievement.games.gold"         // "完成 50 局游戏" / "Complete 50 games"
  | "achievement.noDamage"           // "无伤通关" / "FLAWLESS"
  | "achievement.noDamage.bronze"    // "无伤通关 1 次" / "Complete 1 run without damage"
  | "achievement.noDamage.silver"    // "无伤通关 3 次" / "Complete 3 runs without damage"
  | "achievement.noDamage.gold"      // "无伤通关 5 次" / "Complete 5 runs without damage"
  | "achievement.hardClear"          // "硬核战士" / "HARDCORE WARRIOR"
  | "achievement.hardClear.bronze"   // "困难模式通关 1 次" / "Clear Hard mode 1 time"
  | "achievement.hardClear.silver"   // "困难模式通关 3 次" / "Clear Hard mode 3 times"
  | "achievement.hardClear.gold"     // "困难模式通关 5 次" / "Clear Hard mode 5 times"
  | "achievement.singleKills"        // "单局歼敌" / "MASSACRE"
  | "achievement.singleKills.bronze" // "单局击杀 50 架敌机" / "Kill 50 enemies in one run"
  | "achievement.singleKills.silver" // "单局击杀 100 架敌机" / "Kill 100 enemies in one run"
  | "achievement.singleKills.gold"   // "单局击杀 200 架敌机" / "Kill 200 enemies in one run"
  | "achievement.tier.bronze"        // "铜" / "BRONZE"
  | "achievement.tier.silver"        // "银" / "SILVER"
  | "achievement.tier.gold"          // "金" / "GOLD"
  | "gameOver.achievements"          // "成就" / "ACHIEVEMENTS"
  | "gameOver.stats"                 // "统计" / "STATS"
  // 开始界面（ui.ts paintLogo）
  | "start.title"        // "飞机大战" / "PLANE WAR"
  | "start.clickToStart" // "点击开始游戏" / "Click to Start"
  | "start.settings"     // "设置" / "SETTINGS"
  | "start.gameData"     // "游戏数据" / "GAME DATA"
  // 资源加载（resources.ts）
  | "load.failed"        // "{count} 张图片加载失败" / "{count} image(s) failed to load"
  // 游戏数据页面
  | "gameData.title"             // "游戏数据" / "GAME DATA"
  | "gameData.highScore"         // "最高分" / "HIGH SCORE"
  | "gameData.highLevel"         // "最高等级" / "HIGH LEVEL"
  | "gameData.totalGames"        // "总局数" / "TOTAL GAMES"
  | "gameData.totalKills"        // "总击杀" / "TOTAL KILLS"
  | "gameData.totalBossKills"    // "总BOSS击败" / "TOTAL BOSS KILLS"
  | "gameData.achievements"      // "成就" / "ACHIEVEMENTS"
  | "gameData.unlocked"          // "已解锁" / "UNLOCKED"
  | "gameData.deleteOne"         // "删除" / "DELETE"
  | "gameData.deleteAll"         // "删除全部数据" / "DELETE ALL DATA"
  | "gameData.deleteAllConfirm"  // "确认删除全部数据？" / "DELETE ALL DATA?"
  | "gameData.deleteRecordConfirm" // "确认删除该对局记录？" / "DELETE THIS RECORD?"
  | "gameData.confirm"           // "确认" / "CONFIRM"
  | "gameData.cancel"            // "取消" / "CANCEL"
  | "gameData.back"              // "返回" / "BACK"
  | "gameData.gameNo"            // "第N局" / "GAME #N"
  | "gameData.prevPage"          // "上一页" / "PREV"
  | "gameData.nextPage"          // "下一页" / "NEXT"
  | "gameData.pageInfo"          // "1/2" / "1/2"
  | "gameData.deleteRecord"      // "删除此局" / "DELETE"
  | "gameData.noData"            // "暂无游戏记录" / "NO RECORDS"
  | "gameData.score"             // "得分" / "SCORE"
  | "gameData.kills"             // "击杀" / "KILLS"
  | "gameData.killsCol"          // "击杀敌机数" / "ENEMY KILLS"（表格列标题）
  | "gameData.bossKillsCol"      // "击杀BOSS数" / "BOSS KILLS"（表格列标题）
  | "gameData.recordTitle"       // "对局记录" / "GAME RECORDS"（表格标题）
  // 设置界面（ui.ts drawSettings）
  | "settings.title"     // "游戏设置" / "SETTINGS"
  | "settings.language"  // "语言" / "LANGUAGE"
  | "settings.lang.zh"   // "中文" / "Chinese"
  | "settings.lang.en"   // "English" / "English"
  | "settings.lang.ja"   // "日本語" / "Japanese"
  | "settings.sound"     // "音效" / "SOUND"
  | "settings.sound.on"  // "开" / "ON"
  | "settings.sound.off" // "关" / "OFF"
  | "settings.back"      // "返回" / "BACK"
  // 难度
  | "settings.difficulty"    // "难度" / "DIFFICULTY"
  | "difficulty.normal"      // "普通" / "NORMAL"
  | "difficulty.medium"      // "中等" / "MEDIUM"
  | "difficulty.hard"        // "困难" / "HARD"
  // 升级选择界面（upgradeUI.ts）
  | "upgrade.title"           // "升级!" / "LEVEL UP!"
  | "upgrade.hint.select"     // "选择任意强化增益" / "CHOOSE A BUFF"
  | "upgrade.hint.random"     // "强化随机出现" / "BUFFS ARE RANDOM"
  | "upgrade.hint.reroll"     // "可免费刷新" / "FREE REROLLS"
  | "upgrade.hint.times"      // "次" / "TIMES"
  | "upgrade.reroll"          // "刷新" / "REROLL"
  | "upgrade.new"             // "新!" / "NEW!"
  | "upgrade.lv"              // "等级" / "LV"
  | "upgrade.maxLevel"        // "满级" / "MAX"
  // 稀有度标签
  | "upgrade.rarity.common"     // "普通" / "COMMON"
  | "upgrade.rarity.rare"       // "精良" / "RARE"
  | "upgrade.rarity.epic"       // "史诗" / "EPIC"
  | "upgrade.rarity.legendary"  // "传说" / "LEGEND"
  | "upgrade.boss"              // "BOSS" / "BOSS"
  // 基础武器升级名称和描述（占位符数值由 upgradeUI 的 _descParams 从 BASE_WEAPON_LEVELS 计算）
  | "upgrade.baseWeapon"              // "基础武器" / "BASE WEAPON"
  | "upgrade.baseWeapon.desc.1"       // "伤害 +{dmgPct}%" / "DMG +{dmgPct}%"
  | "upgrade.baseWeapon.desc.2"       // "{count} 路子弹" / "{count}-Way Shot"
  | "upgrade.baseWeapon.desc.3"       // "伤害 +{dmgPct}%, 射速 +{ratePct}%" / "DMG +{dmgPct}%, RATE +{ratePct}%"
  | "upgrade.baseWeapon.desc.4"       // "{count} 路子弹 + 穿透" / "{count}-Way + Pierce"
  // 被动升级（占位符数值来自 upgrade.ts PASSIVE_VALUES）
  | "upgrade.hpUp"            // "生命强化" / "HP UP"
  | "upgrade.hpUp.desc"       // "最大HP +{hp}" / "Max HP +{hp}"
  | "upgrade.damageUp"        // "伤害增幅" / "DMG UP"
  | "upgrade.damageUp.desc"   // "所有武器伤害 +{pct}%" / "All weapon DMG +{pct}%"
  | "upgrade.fireRateUp"      // "射速提升" / "RATE UP"
  | "upgrade.fireRateUp.desc" // "基础武器射速 +{pct}%" / "Base weapon rate +{pct}%"
  | "upgrade.moveSpeedUp"     // "移速提升" / "MOVE UP"
  | "upgrade.moveSpeedUp.desc" // "移动速度 +{pct}%" / "Move speed +{pct}%"
  | "upgrade.critChance"      // "暴击强化" / "CRIT UP"
  | "upgrade.critChance.desc" // "暴击率 +{pct}%" / "Crit rate +{pct}%"
  // 新武器升级（占位符数值来自 specialWeapons.ts MISSILE_LEVELS / ENERGY_LEVELS / 僚机常量）
  | "upgrade.homingMissile"              // "追踪导弹" / "HOMING MISSILE"
  | "upgrade.homingMissile.desc.1"       // "伤害 +{dmg}" / "Damage +{dmg}"
  | "upgrade.homingMissile.desc.2"       // "{count} 枚导弹" / "{count} Missiles"
  | "upgrade.homingMissile.desc.3"       // "伤害 +{dmg}, 小范围爆炸" / "Damage +{dmg}, Small Explosion"
  | "upgrade.homingMissile.desc.4"       // "{count} 枚导弹, 伤害 {dmg}, 大爆炸" / "{count} Missiles, Dmg {dmg}, Big Explosion"
  | "upgrade.wingman"                    // "僚机" / "WINGMAN"
  | "upgrade.wingman.desc.1"             // "伤害 +{dmg}" / "Damage +{dmg}"
  | "upgrade.wingman.desc.2"             // "僚机 ×{count}" / "Wingman ×{count}"
  | "upgrade.wingman.desc.3"             // "伤害 +{dmg}" / "Damage +{dmg}"
  | "upgrade.wingman.desc.4"             // "伤害 {dmg}, 共享射速" / "Damage {dmg}, Shared Rate"
  | "upgrade.energyWeapon"               // "能量武器" / "ENERGY WEAPON"
  | "upgrade.energyWeapon.desc.1"        // "闪电链 +{chains} 跳" / "Chain +{chains}"
  | "upgrade.energyWeapon.desc.2"        // "激光伤害 +{dmg}" / "Laser Dmg +{dmg}"
  | "upgrade.energyWeapon.desc.3"        // "闪电链 +{chains} 跳, 激光加长" / "Chain +{chains}, Longer Laser"
  | "upgrade.energyWeapon.desc.4"        // "激光全屏穿透, 闪电链 +{chains}" / "Full Laser, Chain +{chains}"
  | "upgrade.armor"            // "护甲" / "ARMOR"
  | "upgrade.armor.desc"       // "受伤 -{amount} 点" / "Damage -{amount}"
  // 武器专属道具（占位符数值来自 upgrade.ts PASSIVE_VALUES）
  | "upgrade.piercing"             // "穿透弹" / "PIERCING"
  | "upgrade.piercing.desc"        // "子弹穿透 1 个敌机" / "Bullets pierce 1 enemy"
  | "upgrade.wingmanItem"          // "僚机强化" / "WINGMAN BOOST"
  | "upgrade.wingmanItem.desc"     // "僚机伤害 +{pct}%" / "Wingman DMG +{pct}%"
  | "upgrade.explosionRadius"      // "爆炸范围" / "EXPLOSION RANGE"
  | "upgrade.explosionRadius.desc" // "爆炸半径 +{pct}%" / "Explosion radius +{pct}%"
  | "upgrade.multiMissile"         // "多重导弹" / "MULTI-MISSILE"
  | "upgrade.multiMissile.desc"    // "+{count} 枚导弹齐射" / "+{count} missile salvo"
  | "upgrade.chainEnhance"         // "链式强化" / "CHAIN ENHANCE"
  | "upgrade.chainEnhance.desc"    // "闪电链 +{count} 跳" / "Lightning chain +{count}"
  | "upgrade.freezeAddon"          // "冰冻附加" / "FREEZE ADDON"
  | "upgrade.freezeAddon.desc"     // "命中减速 30%" / "Slow 30% on hit"
  // BOSS 传说道具
  | "upgrade.bulletStorm"          // "弹幕风暴" / "BULLET STORM"
  | "upgrade.bulletStorm.desc"     // "子弹数 +3, 射速 ×1.3" / "Bullets +3, Fire rate ×1.3"
  | "upgrade.nukeWarhead"          // "核弹头" / "NUKE WARHEAD"
  | "upgrade.nukeWarhead.desc"     // "爆炸 ×3, 伤害 ×2" / "Explosion ×3, Dmg ×2"
  | "upgrade.voidEnergy"           // "虚空能量" / "VOID ENERGY"
  | "upgrade.voidEnergy.desc"      // "激光全屏穿透, 无限链" / "Full laser, Infinite chain"
  // 进化超武
  | "upgrade.doomBarrage"           // "末日弹幕" / "DOOM BARRAGE"
  | "upgrade.doomBarrage.desc"      // "子弹微型爆炸, 导弹 +50% 伤害" / "Bullet micro-explosion, Missile +50% DMG"
  | "upgrade.quantumAnnihilate"     // "量子歼灭" / "QUANTUM ANNIHILATE"
  | "upgrade.quantumAnnihilate.desc" // "导弹 EMP 脉冲, 闪电链无限 +2 跳" / "Missile EMP, Infinite chain +2"
  | "upgrade.annihilateSquad"       // "歼灭编队" / "ANNIHILATE SQUAD"
  | "upgrade.annihilateSquad.desc"  // "僚机 +2, 僚机伤害 ×2, 子弹 +2 路" / "Wingman +2, DMG ×2, Bullets +2"
  | "upgrade.thunderPierce"         // "雷霆穿甲" / "THUNDER PIERCE"
  | "upgrade.thunderPierce.desc"    // "子弹穿透敌机, 激光冷却 -30%" / "Bullets pierce, Laser CD -30%"
  | "upgrade.wolfPack"              // "狼群战术" / "WOLF PACK"
  | "upgrade.wolfPack.desc"         // "僚机发射追踪导弹, 爆炸范围 +50%" / "Wingman fires missiles, Explosion +50%"
  | "upgrade.prismArray"            // "棱镜阵列" / "PRISM ARRAY"
  | "upgrade.prismArray.desc"       // "僚机 +1, 僚机子弹触发闪电链" / "Wingman +1, Bullets chain lightning"
  | "upgrade.evolution"             // "进化" / "EVOLVE"
  | "combat.crit"             // "暴击!" / "CRIT!"
  // BOSS
  | "boss.title"              // "BOSS" / "BOSS"
  | "boss.warning"            // "⚠ BOSS 来袭!" / "⚠ BOSS INCOMING!"
  | "boss.shield"             // "护盾" / "SHIELD"
  | "boss.type.assault"       // "突击型" / "ASSAULT"
  | "boss.type.fortress"      // "堡垒型" / "FORTRESS"
  | "boss.type.carrier"       // "母舰型" / "CARRIER"
  | "boss.type.phantom"       // "幻影型" / "PHANTOM"
  // HTML
  | "html.title"         // "飞机大战网页版"
  | "html.unsupported";  // "您的浏览器不支持canvas绘图!!!" / "Your browser does not support canvas!!!"

// ========== 翻译字典（三语汇总，内容见 locales/） ==========
const translations: Record<Locale, Record<TextKey, string>> = { zh, en, ja };

// ========== 当前语言（默认中文） ==========
let currentLocale: Locale = "zh";

function getLocale(): Locale {
  return currentLocale;
}

function setLocale(locale: Locale): void {
  currentLocale = locale;
}

// 获取翻译文本；params 用于替换文本中的 {name} 占位符（如 "{count} 枚导弹" → "2 枚导弹"）
// 占位符数值由调用方从代码常量计算传入（见 upgradeUI._descParams），确保描述与实际数值同步
function t(key: TextKey, params?: Record<string, string | number>): string {
  let text = translations[currentLocale][key];
  if (params) {
    for (const name of Object.keys(params)) {
      text = text.split("{" + name + "}").join(String(params[name]));
    }
  }
  return text;
}

export { getLocale, setLocale, t };
