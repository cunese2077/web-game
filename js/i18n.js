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
// ========== 翻译字典（三语汇总，内容见 locales/） ==========
const translations = { zh, en, ja };
// ========== 当前语言（默认中文） ==========
let currentLocale = "zh";
function getLocale() {
    return currentLocale;
}
function setLocale(locale) {
    currentLocale = locale;
}
// 获取翻译文本；params 用于替换文本中的 {name} 占位符（如 "{count} 枚导弹" → "2 枚导弹"）
// 占位符数值由调用方从代码常量计算传入（见 upgradeUI._descParams），确保描述与实际数值同步
function t(key, params) {
    let text = translations[currentLocale][key];
    if (params) {
        for (const name of Object.keys(params)) {
            text = text.split("{" + name + "}").join(String(params[name]));
        }
    }
    return text;
}
export { getLocale, setLocale, t };
