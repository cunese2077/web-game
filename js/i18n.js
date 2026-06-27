// 国际化模块：集中管理游戏内所有显示文本的多语言翻译
// 默认中文（zh），可通过 setLocale 切换语言
//
// 【设计原则】
// - 所有显示在 canvas 上的文本（HUD、动效、界面）通过 t(key) 获取
// - config.ts 中 buff/item 的 label 字段存 TextKey，绘制时用 t() 转换
// - 数字、符号（+1, -X, ×1.05, 100%）无需翻译，直接拼接
// - 新增文本时在 TextKey 联合类型和 translations 字典中同步添加
// ========== 翻译字典 ==========
const translations = {
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
        "html.title": "飞机大战网页版",
        "html.unsupported": "您的浏览器不支持canvas绘图!!!",
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
        "html.title": "Plane War Web",
        "html.unsupported": "Your browser does not support canvas!!!",
    },
};
// ========== 当前语言（默认中文） ==========
let currentLocale = "zh";
function getLocale() {
    return currentLocale;
}
function setLocale(locale) {
    currentLocale = locale;
}
// 获取翻译文本
function t(key) {
    return translations[currentLocale][key];
}
export { getLocale, setLocale, t };
