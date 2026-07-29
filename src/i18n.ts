// 国际化模块：集中管理游戏内所有显示文本的多语言翻译
// 默认中文（zh），可通过 setLocale 切换语言
//
// 【设计原则】
// - 所有显示在 canvas 上的文本（HUD、动效、界面）通过 t(key) 获取
// - config.ts 中 buff/item 的 label 字段存 TextKey，绘制时用 t() 转换
// - 数字、符号（+1, -X, ×1.05, 100%）无需翻译，直接拼接
// - 新增文本时在 TextKey 联合类型和 translations 字典中同步添加

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
  // 成就
  | "achievement.firstGame"          // "初次出击" / "FIRST SORTIE"
  | "achievement.firstGame.desc"     // "完成第一局游戏" / "Complete your first game"
  | "achievement.score1000"          // "千分先锋" / "SCORE PIONEER"
  | "achievement.score1000.desc"     // "单局得分达到 1000" / "Score 1000 in a single run"
  | "achievement.score5000"          // "得分王者" / "SCORE KING"
  | "achievement.score5000.desc"     // "单局得分达到 5000" / "Score 5000 in a single run"
  | "achievement.level10"            // "成长之路" / "GROWING PATH"
  | "achievement.level10.desc"       // "达到 10 级" / "Reach level 10"
  | "achievement.level20"            // "老兵" / "VETERAN"
  | "achievement.level20.desc"       // "达到 20 级" / "Reach level 20"
  | "achievement.bossKill1"          // "BOSS 猎人" / "BOSS HUNTER"
  | "achievement.bossKill1.desc"     // "击败 1 个 BOSS" / "Defeat 1 BOSS"
  | "achievement.bossKill5"          // "BOSS 克星" / "BOSS SLAYER"
  | "achievement.bossKill5.desc"     // "累计击败 5 个 BOSS" / "Defeat 5 BOSSes total"
  | "achievement.kills100"           // "百斩" / "CENTURION"
  | "achievement.kills100.desc"      // "累计击杀 100 架敌机" / "Kill 100 enemies total"
  | "achievement.kills500"           // "五百斩" / "DEMOLISHER"
  | "achievement.kills500.desc"      // "累计击杀 500 架敌机" / "Kill 500 enemies total"
  | "achievement.games10"            // "常客" / "REGULAR"
  | "achievement.games10.desc"       // "完成 10 局游戏" / "Complete 10 games"
  | "gameOver.achievements"          // "成就" / "ACHIEVEMENTS"
  | "gameOver.stats"                 // "统计" / "STATS"
  // 开始界面（ui.ts paintLogo）
  | "start.title"        // "飞机大战" / "PLANE WAR"
  | "start.clickToStart" // "点击开始游戏" / "Click to Start"
  | "start.settings"     // "设置" / "SETTINGS"
  | "start.gameData"     // "游戏数据" / "GAME DATA"
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
  // 基础武器升级名称和描述
  | "upgrade.baseWeapon"              // "基础武器" / "BASE WEAPON"
  | "upgrade.baseWeapon.desc.1"       // "伤害 +30%" / "DMG +30%"
  | "upgrade.baseWeapon.desc.2"       // "四路子弹" / "4-WAY SHOT"
  | "upgrade.baseWeapon.desc.3"       // "伤害 +30%, 射速 +20%" / "DMG +30%, RATE +20%"
  | "upgrade.baseWeapon.desc.4"       // "五路子弹 + 穿透" / "5-WAY + PIERCE"
  // 被动升级
  | "upgrade.hpUp"            // "生命强化" / "HP UP"
  | "upgrade.hpUp.desc"       // "最大HP +1" / "Max HP +1"
  | "upgrade.damageUp"        // "伤害增幅" / "DMG UP"
  | "upgrade.damageUp.desc"   // "所有武器伤害 +15%" / "All weapon DMG +15%"
  | "upgrade.fireRateUp"      // "射速提升" / "RATE UP"
  | "upgrade.fireRateUp.desc" // "基础武器射速 +10%" / "Base weapon rate +10%"
  | "upgrade.moveSpeedUp"     // "移速提升" / "MOVE UP"
  | "upgrade.moveSpeedUp.desc" // "移动速度 +8%" / "Move speed +8%"
  | "upgrade.critChance"      // "暴击强化" / "CRIT UP"
  | "upgrade.critChance.desc" // "暴击率 +8%" / "Crit rate +8%"
  // 新武器升级
  | "upgrade.homingMissile"              // "追踪导弹" / "HOMING MISSILE"
  | "upgrade.homingMissile.desc.1"       // "伤害 +1" / "DMG +1"
  | "upgrade.homingMissile.desc.2"       // "双枚导弹" / "DUAL MISSILES"
  | "upgrade.homingMissile.desc.3"       // "伤害 +2, 小范围爆炸" / "DMG +2, SMALL EXPLOSION"
  | "upgrade.homingMissile.desc.4"       // "三枚导弹, 伤害 +8, 大爆炸" / "TRIPLE MISSILES, DMG 8, BIG EXPLOSION"
  | "upgrade.wingman"                    // "僚机" / "WINGMAN"
  | "upgrade.wingman.desc.1"             // "伤害 +0.5" / "DMG +0.5"
  | "upgrade.wingman.desc.2"             // "双僚机" / "DUAL WINGMEN"
  | "upgrade.wingman.desc.3"             // "伤害 +0.5" / "DMG +0.5"
  | "upgrade.wingman.desc.4"             // "伤害 3, 共享射速" / "DMG 3, SHARED RATE"
  | "upgrade.energyWeapon"               // "能量武器" / "ENERGY WEAPON"
  | "upgrade.energyWeapon.desc.1"        // "闪电链 +1 跳" / "Chain +1"
  | "upgrade.energyWeapon.desc.2"        // "激光伤害 +3" / "Laser Dmg +3"
  | "upgrade.energyWeapon.desc.3"        // "闪电链 +2 跳, 激光加长" / "Chain +2, Longer Laser"
  | "upgrade.energyWeapon.desc.4"        // "激光全屏穿透, 闪电链 +3" / "Full Laser, Chain +3"
  | "upgrade.armor"            // "护甲" / "ARMOR"
  | "upgrade.armor.desc"       // "受伤 -1 点" / "Damage -1"
  // 武器专属道具
  | "upgrade.piercing"             // "穿透弹" / "PIERCING"
  | "upgrade.piercing.desc"        // "子弹穿透 1 个敌机" / "Bullets pierce 1 enemy"
  | "upgrade.wingmanItem"          // "僚机强化" / "WINGMAN BOOST"
  | "upgrade.wingmanItem.desc"     // "僚机伤害 +30%" / "Wingman DMG +30%"
  | "upgrade.explosionRadius"      // "爆炸范围" / "EXPLOSION RANGE"
  | "upgrade.explosionRadius.desc" // "爆炸半径 +50%" / "Explosion radius +50%"
  | "upgrade.multiMissile"         // "多重导弹" / "MULTI-MISSILE"
  | "upgrade.multiMissile.desc"    // "+1 枚导弹齐射" / "+1 missile salvo"
  | "upgrade.chainEnhance"         // "链式强化" / "CHAIN ENHANCE"
  | "upgrade.chainEnhance.desc"    // "闪电链 +1 跳" / "Lightning chain +1"
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
  | "upgrade.evolution"             // "进化" / "EVOLVE"
  | "combat.crit"             // "暴击!" / "CRIT!"
  // BOSS
  | "boss.title"              // "BOSS" / "BOSS"
  | "boss.warning"            // "⚠ BOSS 来袭!" / "⚠ BOSS INCOMING!"
  | "boss.shield"             // "护盾" / "SHIELD"
  | "boss.type.assault"       // "突击型" / "ASSAULT"
  | "boss.type.fortress"      // "堡垒型" / "FORTRESS"
  | "boss.type.carrier"       // "母舰型" / "CARRIER"
  // HTML
  | "html.title"         // "飞机大战网页版"
  | "html.unsupported";  // "您的浏览器不支持canvas绘图!!!" / "Your browser does not support canvas!!!"

// ========== 翻译字典 ==========
const translations: Record<Locale, Record<TextKey, string>> = {
  zh: {
    "hud.score": "得分:",
    "hud.level": "等级.",
    "hud.max": "满级",
    "hud.hp": "生命",
    "hud.atk": "攻击",
    "hud.rate": "射速",
    "hud.buff": "增益",
    "effect.heal": "+1 生命",
    "effect.levelUp": "升级! → ",
    "buff.firepower": "火力",
    "buff.shield": "护盾",
    "buff.spread": "散射",
    "item.heal": "+1 生命",
    "item.firepower": "火力提升!",
    "item.shield": "护盾!",
    "item.spread": "散射!",
    "gameOver.title": "游戏结束",
    "gameOver.score": "得分: ",
    "gameOver.level": "等级: ",
    "gameOver.totalExp": "  |  总经验: ",
    "gameOver.restart": "点击重新开始",
    "gameOver.build": "Build 摘要",
    "gameOver.weapons": "武器",
    "gameOver.passives": "被动",
    "gameOver.highScore": "历史最高分: ",
    "gameOver.highLevel": "历史最高等级: ",
    "gameOver.newRecord": "新纪录!",
    "achievement.firstGame": "初次出击",
    "achievement.firstGame.desc": "完成第一局游戏",
    "achievement.score1000": "千分先锋",
    "achievement.score1000.desc": "单局得分达到 1000",
    "achievement.score5000": "得分王者",
    "achievement.score5000.desc": "单局得分达到 5000",
    "achievement.level10": "成长之路",
    "achievement.level10.desc": "达到 10 级",
    "achievement.level20": "老兵",
    "achievement.level20.desc": "达到 20 级",
    "achievement.bossKill1": "BOSS 猎人",
    "achievement.bossKill1.desc": "击败 1 个 BOSS",
    "achievement.bossKill5": "BOSS 克星",
    "achievement.bossKill5.desc": "累计击败 5 个 BOSS",
    "achievement.kills100": "百斩",
    "achievement.kills100.desc": "累计击杀 100 架敌机",
    "achievement.kills500": "五百斩",
    "achievement.kills500.desc": "累计击杀 500 架敌机",
    "achievement.games10": "常客",
    "achievement.games10.desc": "完成 10 局游戏",
    "gameOver.achievements": "成就",
    "gameOver.stats": "统计",
    "start.title": "飞机大战",
    "start.clickToStart": "点击开始游戏",
    "start.settings": "设置",
    "start.gameData": "游戏数据",
    "gameData.title": "游戏数据",
    "gameData.highScore": "最高分",
    "gameData.highLevel": "最高等级",
    "gameData.totalGames": "总局数",
    "gameData.totalKills": "总击杀",
    "gameData.totalBossKills": "总BOSS击败",
    "gameData.achievements": "成就",
    "gameData.unlocked": "已解锁",
    "gameData.deleteOne": "删除",
    "gameData.deleteAll": "删除全部数据",
    "gameData.deleteAllConfirm": "确认删除全部数据？",
    "gameData.deleteRecordConfirm": "确认删除该对局记录？",
    "gameData.confirm": "确认",
    "gameData.cancel": "取消",
    "gameData.back": "返回",
    "gameData.gameNo": "第{N}局",
    "gameData.prevPage": "上一页",
    "gameData.nextPage": "下一页",
    "gameData.pageInfo": "{P}/{T}",
    "gameData.deleteRecord": "删除此局",
    "gameData.noData": "暂无游戏记录",
    "gameData.score": "得分",
    "gameData.kills": "击杀",
    "gameData.killsCol": "击杀敌机数",
    "gameData.bossKillsCol": "击杀BOSS数",
    "gameData.recordTitle": "对局记录",
    "settings.title": "游戏设置",
    "settings.language": "语言",
    "settings.lang.zh": "中文",
    "settings.lang.en": "English",
    "settings.lang.ja": "日本語",
    "settings.sound": "音效",
    "settings.sound.on": "开",
    "settings.sound.off": "关",
    "settings.back": "返回",
    "settings.difficulty": "难度",
    "difficulty.normal": "普通",
    "difficulty.medium": "中等",
    "difficulty.hard": "困难",
    "upgrade.title": "升级!",
    "upgrade.hint.select": "选择任意强化增益",
    "upgrade.hint.random": "强化随机出现",
    "upgrade.hint.reroll": "可免费刷新",
    "upgrade.hint.times": "次",
    "upgrade.reroll": "刷新",
    "upgrade.new": "新!",
    "upgrade.lv": "等级",
    "upgrade.maxLevel": "满级",
    "upgrade.rarity.common": "普通",
    "upgrade.rarity.rare": "精良",
    "upgrade.rarity.epic": "史诗",
    "upgrade.rarity.legendary": "传说",
    "upgrade.boss": "BOSS",
    "upgrade.baseWeapon": "基础武器",
    "upgrade.baseWeapon.desc.1": "伤害 +30%",
    "upgrade.baseWeapon.desc.2": "四路子弹",
    "upgrade.baseWeapon.desc.3": "伤害 +30%, 射速 +20%",
    "upgrade.baseWeapon.desc.4": "五路子弹 + 穿透",
    "upgrade.hpUp": "生命强化",
    "upgrade.hpUp.desc": "最大HP +1",
    "upgrade.damageUp": "伤害增幅",
    "upgrade.damageUp.desc": "所有武器伤害 +15%",
    "upgrade.fireRateUp": "射速提升",
    "upgrade.fireRateUp.desc": "基础武器射速 +10%",
    "upgrade.moveSpeedUp": "移速提升",
    "upgrade.moveSpeedUp.desc": "移动速度 +8%",
    "upgrade.critChance": "暴击强化",
    "upgrade.critChance.desc": "暴击率 +8%",
    "upgrade.homingMissile": "追踪导弹",
    "upgrade.homingMissile.desc.1": "伤害 +1",
    "upgrade.homingMissile.desc.2": "双枚导弹",
    "upgrade.homingMissile.desc.3": "伤害 +2, 小范围爆炸",
    "upgrade.homingMissile.desc.4": "三枚导弹, 伤害 +8, 大爆炸",
    "upgrade.wingman": "僚机",
    "upgrade.wingman.desc.1": "伤害 +0.5",
    "upgrade.wingman.desc.2": "双僚机",
    "upgrade.wingman.desc.3": "伤害 +0.5",
    "upgrade.wingman.desc.4": "伤害 3, 共享射速",
    "upgrade.energyWeapon": "能量武器",
    "upgrade.energyWeapon.desc.1": "闪电链 +1 跳",
    "upgrade.energyWeapon.desc.2": "激光伤害 +3",
    "upgrade.energyWeapon.desc.3": "闪电链 +2 跳, 激光加长",
    "upgrade.energyWeapon.desc.4": "激光全屏穿透, 闪电链 +3",
    "upgrade.armor": "护甲",
    "upgrade.armor.desc": "受伤 -1 点",
    "upgrade.piercing": "穿透弹",
    "upgrade.piercing.desc": "子弹穿透 1 个敌机",
    "upgrade.wingmanItem": "僚机强化",
    "upgrade.wingmanItem.desc": "僚机伤害 +30%",
    "upgrade.explosionRadius": "爆炸范围",
    "upgrade.explosionRadius.desc": "爆炸半径 +50%",
    "upgrade.multiMissile": "多重导弹",
    "upgrade.multiMissile.desc": "+1 枚导弹齐射",
    "upgrade.chainEnhance": "链式强化",
    "upgrade.chainEnhance.desc": "闪电链 +1 跳",
    "upgrade.freezeAddon": "冰冻附加",
    "upgrade.freezeAddon.desc": "命中减速 30%",
    "upgrade.bulletStorm": "弹幕风暴",
    "upgrade.bulletStorm.desc": "子弹数 +3, 射速 ×1.3",
    "upgrade.nukeWarhead": "核弹头",
    "upgrade.nukeWarhead.desc": "爆炸 ×3, 伤害 ×2",
    "upgrade.voidEnergy": "虚空能量",
    "upgrade.voidEnergy.desc": "激光全屏穿透, 无限链",
    "upgrade.doomBarrage": "末日弹幕",
    "upgrade.doomBarrage.desc": "子弹命中爆炸, 导弹 +50% 伤害",
    "upgrade.quantumAnnihilate": "量子歼灭",
    "upgrade.quantumAnnihilate.desc": "导弹 EMP 脉冲, 闪电链无限 +2 跳",
    "upgrade.annihilateSquad": "歼灭编队",
    "upgrade.annihilateSquad.desc": "僚机 +2, 伤害 ×2, 子弹 +2 路",
    "upgrade.evolution": "进化",
    "combat.crit": "暴击!",
    "html.title": "飞机大战网页版",
    "html.unsupported": "您的浏览器不支持canvas绘图!!!",
    "boss.title": "BOSS",
    "boss.warning": "⚠ BOSS 来袭!",
    "boss.shield": "护盾",
    "boss.type.assault": "突击型",
    "boss.type.fortress": "堡垒型",
    "boss.type.carrier": "母舰型",
  },
  en: {
    "hud.score": "SCORE:",
    "hud.level": "LV.",
    "hud.max": "MAX",
    "hud.hp": "HP",
    "hud.atk": "ATK",
    "hud.rate": "RATE",
    "hud.buff": "BUFF",
    "effect.heal": "+1 HP",
    "effect.levelUp": "LEVEL UP! → ",
    "buff.firepower": "FIRE",
    "buff.shield": "SHIELD",
    "buff.spread": "SPREAD",
    "item.heal": "+1 HP",
    "item.firepower": "FIRE UP!",
    "item.shield": "SHIELD!",
    "item.spread": "SPREAD!",
    "gameOver.title": "GAME OVER",
    "gameOver.score": "SCORE: ",
    "gameOver.level": "LEVEL: ",
    "gameOver.totalExp": "  |  TOTAL EXP: ",
    "gameOver.restart": "Click to Restart",
    "gameOver.build": "BUILD SUMMARY",
    "gameOver.weapons": "WEAPONS",
    "gameOver.passives": "PASSIVES",
    "gameOver.highScore": "ALL-TIME HIGH SCORE: ",
    "gameOver.highLevel": "ALL-TIME HIGH LEVEL: ",
    "gameOver.newRecord": "NEW RECORD!",
    "achievement.firstGame": "FIRST SORTIE",
    "achievement.firstGame.desc": "Complete your first game",
    "achievement.score1000": "SCORE PIONEER",
    "achievement.score1000.desc": "Score 1000 in a single run",
    "achievement.score5000": "SCORE KING",
    "achievement.score5000.desc": "Score 5000 in a single run",
    "achievement.level10": "GROWING PATH",
    "achievement.level10.desc": "Reach level 10",
    "achievement.level20": "VETERAN",
    "achievement.level20.desc": "Reach level 20",
    "achievement.bossKill1": "BOSS HUNTER",
    "achievement.bossKill1.desc": "Defeat 1 BOSS",
    "achievement.bossKill5": "BOSS SLAYER",
    "achievement.bossKill5.desc": "Defeat 5 BOSSes total",
    "achievement.kills100": "CENTURION",
    "achievement.kills100.desc": "Kill 100 enemies total",
    "achievement.kills500": "DEMOLISHER",
    "achievement.kills500.desc": "Kill 500 enemies total",
    "achievement.games10": "REGULAR",
    "achievement.games10.desc": "Complete 10 games",
    "gameOver.achievements": "ACHIEVEMENTS",
    "gameOver.stats": "STATS",
    "start.title": "PLANE WAR",
    "start.clickToStart": "Click to Start",
    "start.settings": "SETTINGS",
    "start.gameData": "GAME DATA",
    "gameData.title": "GAME DATA",
    "gameData.highScore": "HIGH SCORE",
    "gameData.highLevel": "HIGH LEVEL",
    "gameData.totalGames": "TOTAL GAMES",
    "gameData.totalKills": "TOTAL KILLS",
    "gameData.totalBossKills": "TOTAL BOSS KILLS",
    "gameData.achievements": "ACHIEVEMENTS",
    "gameData.unlocked": "UNLOCKED",
    "gameData.deleteOne": "DELETE",
    "gameData.deleteAll": "DELETE ALL DATA",
    "gameData.deleteAllConfirm": "DELETE ALL DATA?",
    "gameData.deleteRecordConfirm": "DELETE THIS RECORD?",
    "gameData.confirm": "CONFIRM",
    "gameData.cancel": "CANCEL",
    "gameData.back": "BACK",
    "gameData.gameNo": "GAME #{N}",
    "gameData.prevPage": "PREV",
    "gameData.nextPage": "NEXT",
    "gameData.pageInfo": "{P}/{T}",
    "gameData.deleteRecord": "DELETE",
    "gameData.noData": "NO RECORDS",
    "gameData.score": "SCORE",
    "gameData.kills": "KILLS",
    "gameData.killsCol": "ENEMY KILLS",
    "gameData.bossKillsCol": "BOSS KILLS",
    "gameData.recordTitle": "GAME RECORDS",
    "settings.title": "SETTINGS",
    "settings.language": "LANGUAGE",
    "settings.lang.zh": "Chinese",
    "settings.lang.en": "English",
    "settings.lang.ja": "Japanese",
    "settings.sound": "SOUND",
    "settings.sound.on": "ON",
    "settings.sound.off": "OFF",
    "settings.back": "BACK",
    "settings.difficulty": "DIFFICULTY",
    "difficulty.normal": "NORMAL",
    "difficulty.medium": "MEDIUM",
    "difficulty.hard": "HARD",
    "upgrade.title": "LEVEL UP!",
    "upgrade.hint.select": "CHOOSE A BUFF",
    "upgrade.hint.random": "BUFFS ARE RANDOM",
    "upgrade.hint.reroll": "FREE REROLLS",
    "upgrade.hint.times": "times",
    "upgrade.reroll": "REROLL",
    "upgrade.new": "NEW!",
    "upgrade.lv": "LV",
    "upgrade.maxLevel": "MAX",
    "upgrade.rarity.common": "COMMON",
    "upgrade.rarity.rare": "RARE",
    "upgrade.rarity.epic": "EPIC",
    "upgrade.rarity.legendary": "LEGEND",
    "upgrade.boss": "BOSS",
    "upgrade.baseWeapon": "BASE WEAPON",
    "upgrade.baseWeapon.desc.1": "DMG +30%",
    "upgrade.baseWeapon.desc.2": "4-WAY SHOT",
    "upgrade.baseWeapon.desc.3": "DMG +30%, RATE +20%",
    "upgrade.baseWeapon.desc.4": "5-WAY + PIERCE",
    "upgrade.hpUp": "HP UP",
    "upgrade.hpUp.desc": "Max HP +1",
    "upgrade.damageUp": "DMG UP",
    "upgrade.damageUp.desc": "All weapon DMG +15%",
    "upgrade.fireRateUp": "RATE UP",
    "upgrade.fireRateUp.desc": "Base weapon rate +10%",
    "upgrade.moveSpeedUp": "MOVE UP",
    "upgrade.moveSpeedUp.desc": "Move speed +8%",
    "upgrade.critChance": "CRIT UP",
    "upgrade.critChance.desc": "Crit rate +8%",
    "upgrade.homingMissile": "Homing Missile",
    "upgrade.homingMissile.desc.1": "Damage +1",
    "upgrade.homingMissile.desc.2": "Dual Missiles",
    "upgrade.homingMissile.desc.3": "Damage +2, Small Explosion",
    "upgrade.homingMissile.desc.4": "Triple Missiles, Dmg 8, Big Explosion",
    "upgrade.wingman": "Wingman",
    "upgrade.wingman.desc.1": "Damage +0.5",
    "upgrade.wingman.desc.2": "Dual Wingmen",
    "upgrade.wingman.desc.3": "Damage +0.5",
    "upgrade.wingman.desc.4": "Damage 3, Shared Rate",
    "upgrade.energyWeapon": "Energy Weapon",
    "upgrade.energyWeapon.desc.1": "Chain +1",
    "upgrade.energyWeapon.desc.2": "Laser Dmg +3",
    "upgrade.energyWeapon.desc.3": "Chain +2, Longer Laser",
    "upgrade.energyWeapon.desc.4": "Full Laser, Chain +3",
    "upgrade.armor": "ARMOR",
    "upgrade.armor.desc": "Damage -1",
    "upgrade.piercing": "Piercing",
    "upgrade.piercing.desc": "Bullets pierce 1 enemy",
    "upgrade.wingmanItem": "Wingman Boost",
    "upgrade.wingmanItem.desc": "Wingman DMG +30%",
    "upgrade.explosionRadius": "Explosion Range",
    "upgrade.explosionRadius.desc": "Explosion radius +50%",
    "upgrade.multiMissile": "Multi-Missile",
    "upgrade.multiMissile.desc": "+1 missile salvo",
    "upgrade.chainEnhance": "Chain Enhance",
    "upgrade.chainEnhance.desc": "Lightning chain +1",
    "upgrade.freezeAddon": "Freeze Addon",
    "upgrade.freezeAddon.desc": "Slow 30% on hit",
    "upgrade.bulletStorm": "Bullet Storm",
    "upgrade.bulletStorm.desc": "Bullets +3, Fire rate ×1.3",
    "upgrade.nukeWarhead": "Nuke Warhead",
    "upgrade.nukeWarhead.desc": "Explosion ×3, Dmg ×2",
    "upgrade.voidEnergy": "Void Energy",
    "upgrade.voidEnergy.desc": "Full laser, Infinite chain",
    "upgrade.doomBarrage": "Doom Barrage",
    "upgrade.doomBarrage.desc": "Bullet micro-explosion, Missile +50% DMG",
    "upgrade.quantumAnnihilate": "Quantum Annihilate",
    "upgrade.quantumAnnihilate.desc": "Missile EMP pulse, Infinite chain +2",
    "upgrade.annihilateSquad": "Annihilate Squad",
    "upgrade.annihilateSquad.desc": "Wingman +2, DMG ×2, Bullets +2",
    "upgrade.evolution": "EVOLVE",
    "combat.crit": "CRIT!",
    "html.title": "Plane War Web",
    "html.unsupported": "Your browser does not support canvas!!!",
    "boss.title": "BOSS",
    "boss.warning": "⚠ BOSS INCOMING!",
    "boss.shield": "SHIELD",
    "boss.type.assault": "ASSAULT",
    "boss.type.fortress": "FORTRESS",
    "boss.type.carrier": "CARRIER",
  },
  ja: {
    "hud.score": "得点:",
    "hud.level": "レベル.",
    "hud.max": "MAX",
    "hud.hp": "HP",
    "hud.atk": "攻撃",
    "hud.rate": "射速",
    "hud.buff": "バフ",
    "effect.heal": "+1 HP",
    "effect.levelUp": "レベルアップ! → ",
    "buff.firepower": "火力",
    "buff.shield": "シールド",
    "buff.spread": "拡散",
    "item.heal": "+1 HP",
    "item.firepower": "火力アップ!",
    "item.shield": "シールド!",
    "item.spread": "拡散!",
    "gameOver.title": "ゲームオーバー",
    "gameOver.score": "得点: ",
    "gameOver.level": "レベル: ",
    "gameOver.totalExp": "  |  総経験値: ",
    "gameOver.restart": "クリックでリスタート",
    "gameOver.build": "ビルド概要",
    "gameOver.weapons": "ウェポン",
    "gameOver.passives": "パッシブ",
    "gameOver.highScore": "歴代ハイスコア: ",
    "gameOver.highLevel": "歴代最高レベル: ",
    "gameOver.newRecord": "新記録!",
    "achievement.firstGame": "初出撃",
    "achievement.firstGame.desc": "初めてのゲームをクリア",
    "achievement.score1000": "スコアパイオニア",
    "achievement.score1000.desc": "1プレイで1000点達成",
    "achievement.score5000": "スコアキング",
    "achievement.score5000.desc": "1プレイで5000点達成",
    "achievement.level10": "成長の道",
    "achievement.level10.desc": "レベル10に到達",
    "achievement.level20": "ベテラン",
    "achievement.level20.desc": "レベル20に到達",
    "achievement.bossKill1": "BOSSハンター",
    "achievement.bossKill1.desc": "BOSSを1体撃破",
    "achievement.bossKill5": "BOSSスレイヤー",
    "achievement.bossKill5.desc": "BOSSを累計5体撃破",
    "achievement.kills100": "百斬り",
    "achievement.kills100.desc": "敵機を累計100機撃破",
    "achievement.kills500": "五百斬り",
    "achievement.kills500.desc": "敵機を累計500機撃破",
    "achievement.games10": "常連",
    "achievement.games10.desc": "10回ゲームクリア",
    "gameOver.achievements": "実績",
    "gameOver.stats": "統計",
    "start.title": "エアバトル",
    "start.clickToStart": "クリックでスタート",
    "start.settings": "設定",
    "start.gameData": "ゲームデータ",
    "gameData.title": "ゲームデータ",
    "gameData.highScore": "ハイスコア",
    "gameData.highLevel": "最高レベル",
    "gameData.totalGames": "総プレイ数",
    "gameData.totalKills": "総撃破数",
    "gameData.totalBossKills": "総BOSS撃破",
    "gameData.achievements": "実績",
    "gameData.unlocked": "解除済み",
    "gameData.deleteOne": "削除",
    "gameData.deleteAll": "全データ削除",
    "gameData.deleteAllConfirm": "全データを削除しますか？",
    "gameData.deleteRecordConfirm": "この対局記録を削除しますか？",
    "gameData.confirm": "確認",
    "gameData.cancel": "キャンセル",
    "gameData.back": "戻る",
    "gameData.gameNo": "第{N}局",
    "gameData.prevPage": "前へ",
    "gameData.nextPage": "次へ",
    "gameData.pageInfo": "{P}/{T}",
    "gameData.deleteRecord": "削除",
    "gameData.noData": "記録なし",
    "gameData.score": "スコア",
    "gameData.kills": "撃破",
    "gameData.killsCol": "敵機撃破数",
    "gameData.bossKillsCol": "BOSS撃破数",
    "gameData.recordTitle": "対局記録",
    "settings.title": "設定",
    "settings.language": "言語",
    "settings.lang.zh": "中国語",
    "settings.lang.en": "英語",
    "settings.lang.ja": "日本語",
    "settings.sound": "サウンド",
    "settings.sound.on": "オン",
    "settings.sound.off": "オフ",
    "settings.back": "戻る",
    "settings.difficulty": "難易度",
    "difficulty.normal": "普通",
    "difficulty.medium": "中級",
    "difficulty.hard": "ハード",
    "upgrade.title": "レベルアップ!",
    "upgrade.hint.select": "強化を選択",
    "upgrade.hint.random": "ランダム出現",
    "upgrade.hint.reroll": "無料リロール",
    "upgrade.hint.times": "回",
    "upgrade.reroll": "リロール",
    "upgrade.new": "NEW!",
    "upgrade.lv": "Lv",
    "upgrade.maxLevel": "MAX",
    "upgrade.rarity.common": "コモン",
    "upgrade.rarity.rare": "レア",
    "upgrade.rarity.epic": "エピック",
    "upgrade.rarity.legendary": "レジェンド",
    "upgrade.boss": "BOSS",
    "upgrade.baseWeapon": "ベースウェポン",
    "upgrade.baseWeapon.desc.1": "ダメージ +30%",
    "upgrade.baseWeapon.desc.2": "4方向弾",
    "upgrade.baseWeapon.desc.3": "ダメージ +30%, 射速 +20%",
    "upgrade.baseWeapon.desc.4": "5方向弾 + 貫通",
    "upgrade.hpUp": "HPアップ",
    "upgrade.hpUp.desc": "最大HP +1",
    "upgrade.damageUp": "ダメージアップ",
    "upgrade.damageUp.desc": "全武器ダメージ +15%",
    "upgrade.fireRateUp": "射速アップ",
    "upgrade.fireRateUp.desc": "ベース武器の射速 +10%",
    "upgrade.moveSpeedUp": "移動アップ",
    "upgrade.moveSpeedUp.desc": "移動速度 +8%",
    "upgrade.critChance": "クリティカル",
    "upgrade.critChance.desc": "クリティカル率 +8%",
    "upgrade.homingMissile": "追尾ミサイル",
    "upgrade.homingMissile.desc.1": "ダメージ +1",
    "upgrade.homingMissile.desc.2": "ツインミサイル",
    "upgrade.homingMissile.desc.3": "ダメージ +2, 小爆発",
    "upgrade.homingMissile.desc.4": "3発, ダメージ 8, 大爆発",
    "upgrade.wingman": "ウィングマン",
    "upgrade.wingman.desc.1": "ダメージ +0.5",
    "upgrade.wingman.desc.2": "ツインウィングマン",
    "upgrade.wingman.desc.3": "ダメージ +0.5",
    "upgrade.wingman.desc.4": "ダメージ 3, 射速共有",
    "upgrade.energyWeapon": "エネルギーウェポン",
    "upgrade.energyWeapon.desc.1": "チェイン +1",
    "upgrade.energyWeapon.desc.2": "レーザー +3",
    "upgrade.energyWeapon.desc.3": "チェイン +2, ロングレーザー",
    "upgrade.energyWeapon.desc.4": "フルレーザー, チェイン +3",
    "upgrade.armor": "アーマー",
    "upgrade.armor.desc": "被弾 -1",
    "upgrade.piercing": "ビアスリング",
    "upgrade.piercing.desc": "弾が1体貫通",
    "upgrade.wingmanItem": "ウィングマン強化",
    "upgrade.wingmanItem.desc": "ウィングマンダメージ +30%",
    "upgrade.explosionRadius": "爆発範囲",
    "upgrade.explosionRadius.desc": "爆発半径 +50%",
    "upgrade.multiMissile": "マルチミサイル",
    "upgrade.multiMissile.desc": "+1斉射ミサイル",
    "upgrade.chainEnhance": "チェイン強化",
    "upgrade.chainEnhance.desc": "チェイン +1",
    "upgrade.freezeAddon": "フリーズアドオン",
    "upgrade.freezeAddon.desc": "命中時減速 30%",
    "upgrade.bulletStorm": "弾幕ストーム",
    "upgrade.bulletStorm.desc": "弾数 +3, 射速 ×1.3",
    "upgrade.nukeWarhead": "核弾頭",
    "upgrade.nukeWarhead.desc": "爆発 ×3, ダメージ ×2",
    "upgrade.voidEnergy": "ヴォイドエネルギー",
    "upgrade.voidEnergy.desc": "フルレーザー, 無限チェイン",
    "upgrade.doomBarrage": "ドゥームバラージ",
    "upgrade.doomBarrage.desc": "弾着爆発, ミサイル +50% ダメージ",
    "upgrade.quantumAnnihilate": "クアンタムアナイアレイト",
    "upgrade.quantumAnnihilate.desc": "ミサイルEMP, 無限チェイン +2",
    "upgrade.annihilateSquad": "アナイアレイトスクワッド",
    "upgrade.annihilateSquad.desc": "ウィングマン +2, ダメージ ×2, 弾 +2",
    "upgrade.evolution": "進化",
    "combat.crit": "クリティカル!",
    "html.title": "エアバトル Web",
    "html.unsupported": "お使いのブラウザはcanvasに対応していません!!!",
    "boss.title": "BOSS",
    "boss.warning": "⚠ BOSS 来襲!",
    "boss.shield": "シールド",
    "boss.type.assault": "突撃型",
    "boss.type.fortress": "要塞型",
    "boss.type.carrier": "母艦型",
  },
};

// ========== 当前语言（默认中文） ==========
let currentLocale: Locale = "zh";

function getLocale(): Locale {
  return currentLocale;
}

function setLocale(locale: Locale): void {
  currentLocale = locale;
}

// 获取翻译文本
function t(key: TextKey): string {
  return translations[currentLocale][key];
}

export { getLocale, setLocale, t };
