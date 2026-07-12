// 游戏设置模块 - 集中管理可配置项，支持持久化和扩展
import { setLocale } from "./i18n.js";
import { setSoundEnabled } from "./audio.js";
// ========== 默认设置 ==========
const DEFAULT_SETTINGS = {
    locale: "zh",
    soundEnabled: true,
    difficulty: "normal",
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
            if (typeof parsed.soundEnabled === "boolean") {
                settings.soundEnabled = parsed.soundEnabled;
            }
            if (parsed.difficulty === "normal" || parsed.difficulty === "medium" || parsed.difficulty === "hard") {
                settings.difficulty = parsed.difficulty;
            }
        }
    }
    catch {
        // localStorage 不可用或数据损坏，使用默认值
    }
    // 同步到各模块
    setLocale(settings.locale);
    setSoundEnabled(settings.soundEnabled);
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
// ========== 难度选项 ==========
const DIFFICULTY_OPTIONS = ["normal", "medium", "hard"];
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
    {
        key: "soundEnabled",
        label: "settings.sound",
        toggle: () => settings.soundEnabled,
        onToggle: () => {
            settings.soundEnabled = !settings.soundEnabled;
            setSoundEnabled(settings.soundEnabled);
            saveSettings();
        },
    },
    {
        key: "difficulty",
        label: "settings.difficulty",
        optionLabels: ["difficulty.normal", "difficulty.medium", "difficulty.hard"],
        current: () => DIFFICULTY_OPTIONS.indexOf(settings.difficulty),
        select: (index) => {
            settings.difficulty = DIFFICULTY_OPTIONS[index];
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
function isSoundEnabled() {
    return settings.soundEnabled;
}
function toggleSound() {
    settings.soundEnabled = !settings.soundEnabled;
    setSoundEnabled(settings.soundEnabled);
    saveSettings();
}
function getDifficulty() {
    return settings.difficulty;
}
// 导出供 engine.ts 使用
export { loadSettings, getSettingItems, isSettingsOpen, openSettings, closeSettings, isSoundEnabled, toggleSound, getDifficulty, };
