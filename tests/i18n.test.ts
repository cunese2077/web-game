// i18n 模块单测：占位符替换、语言切换、三语完整性
import { describe, it, expect, afterEach } from "vitest";
import { t, setLocale, getLocale } from "../src/i18n.js";
import type { Locale } from "../src/i18n.js";

afterEach(() => {
  // 恢复默认语言，避免影响其他测试
  setLocale("zh");
});

describe("i18n 语言切换", () => {
  it("默认语言为中文", () => {
    expect(getLocale()).toBe("zh");
    expect(t("start.title")).toBe("飞机大战");
  });

  it("切换到英文/日文生效", () => {
    setLocale("en");
    expect(getLocale()).toBe("en");
    expect(t("start.title")).toBe("PLANE WAR");

    setLocale("ja");
    expect(getLocale()).toBe("ja");
    expect(t("start.title")).toBe("エアバトル");
  });
});

describe("i18n 占位符替换", () => {
  it("替换数值占位符 {count}", () => {
    setLocale("zh");
    expect(t("load.failed", { count: 3 })).toBe("3 张图片加载失败");

    setLocale("en");
    expect(t("load.failed", { count: 1 })).toBe("1 image(s) failed to load");
  });

  it("替换数值占位符 {hp} / {dmg}", () => {
    setLocale("zh");
    expect(t("upgrade.hpUp.desc", { hp: 1 })).toBe("最大HP +1");
    expect(t("upgrade.wingman.desc.4", { dmg: "1.1" })).toBe("伤害 1.1, 共享射速");
  });

  it("占位符全部替换完成（不残留 { )", () => {
    setLocale("en");
    const result = t("load.failed", { count: 1 });
    expect(result).not.toContain("{");
  });
});

describe("i18n 三语完整性", () => {
  // 抽样覆盖各模块的 key（HUD/动效/界面/BOSS/升级）
  const sampleKeys = [
    "hud.score",
    "effect.levelUp",
    "gameOver.title",
    "start.clickToStart",
    "settings.language",
    "boss.warning",
    "difficulty.normal",
    "load.failed",
  ] as const;

  it("所有抽样 key 在三语下均返回非空文本", () => {
    const locales: Locale[] = ["zh", "en", "ja"];
    for (const locale of locales) {
      setLocale(locale);
      for (const key of sampleKeys) {
        const text = t(key);
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  it("三语文本不完全相同（确保各语言有独立翻译）", () => {
    const zh = t("gameOver.title");
    setLocale("en");
    const en = t("gameOver.title");
    expect(zh).not.toBe(en);
  });
});
