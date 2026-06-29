// 游戏设置模块 - 集中管理可配置项，支持持久化和扩展
import { setLocale } from "./i18n.js";
// ========== 默认设置 ==========
const DEFAULT_SETTINGS = {
    locale: "zh",
};
// ========== 当前设置 ==========
let settings = { ...DEFAULT_SETTINGS };
// ========== 持久化 ==========
const STORAGE_KEY = "web-game-settings";
function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.locale) {
                settings.locale = parsed.locale;
            }
        }
    }
    catch {
        // localStorage 不可用或数据损坏，使用默认值
    }
    // 同步到 i18n 模块
    setLocale(settings.locale);
}
function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    catch {
        // localStorage 不可用，静默忽略
    }
}
// ========== 语言选项 ==========
const LOCALE_OPTIONS = ["zh", "en", "ja"];
// ========== 设置项数组（数据驱动，新增设置只需在此添加） ==========
const settingItems = [
    {
        key: "locale",
        label: "settings.language",
        optionLabels: ["settings.lang.zh", "settings.lang.en", "settings.lang.ja"],
        current: () => LOCALE_OPTIONS.indexOf(settings.locale),
        select: (index) => {
            settings.locale = LOCALE_OPTIONS[index];
            setLocale(settings.locale);
            saveSettings();
        },
    },
];
function getSettingItems() {
    return settingItems;
}
function isSettingsOpen() {
    return settingsOpen;
}
let settingsOpen = false;
function openSettings() {
    settingsOpen = true;
}
function closeSettings() {
    settingsOpen = false;
}
// 导出供 engine.ts 使用
export { loadSettings, getSettingItems, isSettingsOpen, openSettings, closeSettings, };
