// 游戏设置模块 - 集中管理可配置项，支持持久化和扩展
import { setLocale } from "./i18n.js";
import type { Locale, TextKey } from "./i18n.js";
import { setSoundEnabled } from "./audio.js";

// ========== 设置数据结构 ==========
interface GameSettings {
  locale: Locale;
  soundEnabled: boolean;
}

// ========== 设置项描述（数据驱动，便于扩展） ==========
export interface SettingItem {
  key: keyof GameSettings;     // settings 中的字段名
  label: TextKey;              // 设置项标题 i18n key
  // 下拉选择型（如语言）
  optionLabels?: TextKey[];    // 各选项显示文本 i18n key
  current?: () => number;      // 获取当前选中索引
  select?: (index: number) => void;  // 选中某项的回调
  // 布尔开关型（如音效）
  toggle?: () => boolean;      // 获取当前开关状态
  onToggle?: () => void;       // 切换回调
}

// ========== 默认设置 ==========
const DEFAULT_SETTINGS: GameSettings = {
  locale: "zh",
  soundEnabled: true,
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
      if (typeof parsed.soundEnabled === "boolean") {
        settings.soundEnabled = parsed.soundEnabled;
      }
    }
  } catch {
    // localStorage 不可用或数据损坏，使用默认值
  }
  // 同步到各模块
  setLocale(settings.locale);
  setSoundEnabled(settings.soundEnabled);
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
  {
    key: "soundEnabled",
    label: "settings.sound",
    toggle: (): boolean => settings.soundEnabled,
    onToggle: (): void => {
      settings.soundEnabled = !settings.soundEnabled;
      setSoundEnabled(settings.soundEnabled);
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

function isSoundEnabled(): boolean {
  return settings.soundEnabled;
}

function toggleSound(): void {
  settings.soundEnabled = !settings.soundEnabled;
  setSoundEnabled(settings.soundEnabled);
  saveSettings();
}

// 导出供 engine.ts 使用
export {
  loadSettings,
  getSettingItems,
  isSettingsOpen,
  openSettings,
  closeSettings,
  isSoundEnabled,
  toggleSound,
};
