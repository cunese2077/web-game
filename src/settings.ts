// 游戏设置模块 - 集中管理可配置项，支持持久化和扩展
import { setLocale } from "./i18n.js";
import type { Locale, TextKey } from "./i18n.js";

// ========== 设置数据结构 ==========
interface GameSettings {
  locale: Locale;
}

// ========== 设置项描述（数据驱动，便于扩展） ==========
export interface SettingItem {
  key: keyof GameSettings;     // settings 中的字段名
  label: TextKey;              // 设置项标题 i18n key
  optionLabels: TextKey[];     // 各选项显示文本 i18n key
  current: () => number;       // 获取当前选中索引
  select: (index: number) => void;  // 选中某项的回调
}

// ========== 默认设置 ==========
const DEFAULT_SETTINGS: GameSettings = {
  locale: "zh",
};

// ========== 当前设置 ==========
let settings: GameSettings = { ...DEFAULT_SETTINGS };

// ========== 持久化 ==========
const STORAGE_KEY = "web-game-settings";

function loadSettings(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      if (parsed.locale) {
        settings.locale = parsed.locale;
      }
    }
  } catch {
    // localStorage 不可用或数据损坏，使用默认值
  }
  // 同步到 i18n 模块
  setLocale(settings.locale);
}

function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage 不可用，静默忽略
  }
}

// ========== 语言选项 ==========
const LOCALE_OPTIONS: Locale[] = ["zh", "en", "ja"];

// ========== 设置项数组（数据驱动，新增设置只需在此添加） ==========
const settingItems: SettingItem[] = [
  {
    key: "locale",
    label: "settings.language",
    optionLabels: ["settings.lang.zh", "settings.lang.en", "settings.lang.ja"],
    current: (): number => LOCALE_OPTIONS.indexOf(settings.locale),
    select: (index: number): void => {
      settings.locale = LOCALE_OPTIONS[index];
      setLocale(settings.locale);
      saveSettings();
    },
  },
];

function getSettingItems(): SettingItem[] {
  return settingItems;
}

function isSettingsOpen(): boolean {
  return settingsOpen;
}

let settingsOpen: boolean = false;

function openSettings(): void {
  settingsOpen = true;
}

function closeSettings(): void {
  settingsOpen = false;
}

// 导出供 engine.ts 使用
export {
  loadSettings,
  getSettingItems,
  isSettingsOpen,
  openSettings,
  closeSettings,
};
