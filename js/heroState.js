// 玩家状态模块（从 hero.ts 拆出）：模块级单例引用 + 查询访问器 + 按钮区域
// 单例状态独立成模块以避免 entity↔input 循环依赖（input 只依赖本模块）
import { width, fontScale } from "./canvas.js";
// 模块级单例引用（Hero 构造时注册，事件回调与查询访问器依赖）
let activeHero = null;
function setActiveHero(hero) {
    activeHero = hero;
}
function getActiveHero() {
    return activeHero;
}
// 暂停按钮绘制区域（由 heroHud 的 drawLevel 绘制时记录，输入事件排除用）
let _pauseBtnArea = { x: 0, y: 0, w: 0, h: 0 };
function setPauseBtnArea(area) {
    _pauseBtnArea = area;
}
// 触摸设备扩大点击区域（与声音按钮一致），桌面端使用绘制区域
function getPauseBtnArea() {
    const isTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    if (!isTouch || _pauseBtnArea.w === 0)
        return _pauseBtnArea;
    const pad = Math.round(10 * fontScale);
    return {
        x: _pauseBtnArea.x - pad,
        y: _pauseBtnArea.y - pad,
        w: _pauseBtnArea.w + pad * 2,
        h: _pauseBtnArea.h + pad * 2,
    };
}
// 音效开关图标点击区域（触摸设备外扩 10*fontScale）
function getSoundIconArea() {
    const barWidth = Math.round(110 * fontScale);
    const barHeight = Math.round(10 * fontScale);
    const barX = width - barWidth - Math.round(10 * fontScale);
    const barY = Math.round(26 * fontScale);
    const sndIconSize = Math.round(22 * fontScale);
    const sndIconX = barX - sndIconSize - Math.round(6 * fontScale);
    const sndIconY = barY + barHeight / 2;
    const btnW = Math.round(28 * fontScale);
    const btnH = Math.round(22 * fontScale);
    const isTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    const pad = isTouch ? Math.round(10 * fontScale) : 0;
    return {
        x: sndIconX - btnW / 2 - pad,
        y: sndIconY - btnH / 2 - pad,
        w: btnW + pad * 2,
        h: btnH + pad * 2,
    };
}
// 查询访问器（供敌机/子弹/BOSS/引擎等模块读取玩家状态）
function getHeroHp() {
    return activeHero ? activeHero.hp : 0;
}
function getHeroMaxHp() {
    return activeHero ? activeHero.maxHp : 3;
}
function getHeroBuffs() {
    return activeHero ? activeHero.buffs : { firepower: 0, shield: 0, spread: 0 };
}
function getDamageTaken() {
    return activeHero ? activeHero.damageTaken : 0;
}
function getHeroY() {
    return activeHero ? activeHero.y : 0;
}
function getHeroX() {
    return activeHero ? activeHero.x : 0;
}
export { setActiveHero, getActiveHero, setPauseBtnArea, getPauseBtnArea, getSoundIconArea, getHeroHp, getHeroMaxHp, getHeroBuffs, getDamageTaken, getHeroX, getHeroY, };
