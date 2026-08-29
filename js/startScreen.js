// 开始屏模块：滚动背景、开始界面（标题/飞机装饰/底部按钮）、加载动画
// 从 ui.ts 拆出（保持函数签名不变，ui.ts 统一 re-export）
import { ctx, width, height, fontScale } from "./canvas.js";
import { bg, gameLoad, heroImg } from "./resources.js";
import { PHASE_LOADING, PHASE_PLAY } from "./constants.js";
import { t } from "./i18n.js";
// 画滚动背景
// 背景图拉伸到画布宽高，确保铺满整个屏幕（支持任意尺寸的设备）
// 使用 height 作为滚动周期，两张图交替滚动实现无缝循环
function paintBg() {
    let y = 0;
    return function () {
        ctx.drawImage(bg, 0, y, width, height);
        ctx.drawImage(bg, 0, y - height, width, height);
        y++;
        // 使用 >= 而非 ===：移动端地址栏显示/隐藏、横竖屏切换会导致画布尺寸缩小，
        // 若 y 已超过新 height，=== 比较永远不成立，y 无限递增使两张 drawImage 都画在画布外，
        // 画布不被覆盖，产生残影累积（子弹/敌机/战机残影不消失）
        if (y >= height)
            y = 0;
    };
}
// 开始界面动画帧计数器（用于标题浮动、飞机摆动、提示闪烁）
let logoFrame = 0;
// 设置按钮点击区域（供 engine.ts 判断点击）
let settingsBtnX = 0;
let settingsBtnW = 0;
let settingsBtnY = 0;
let settingsBtnHitH = 0;
// 游戏数据按钮点击区域
let gameDataBtnX = 0;
let gameDataBtnW = 0;
// 画开始界面（飞机装饰 + 标题 + 提示文本，支持多语言，带动画）
// 水平+垂直居中，避免大屏设备内容偏上
function paintLogo() {
    logoFrame = (logoFrame + 1) % 10000; // 用取模限制增长，解决精度丢失问题
    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    ctx.textAlign = "center";
    // ===== 飞机装饰：漂移 + 摇晃 + 蓝色发光底（置于顶部） =====
    const heroW = heroImg[0].width;
    const heroH = heroImg[0].height;
    const heroBaseY = cy - Math.round(120 * fontScale);
    const heroDriftX = Math.sin(logoFrame * 0.05) * Math.round(12 * fontScale);
    const heroDriftY = Math.cos(logoFrame * 0.02) * Math.round(8 * fontScale);
    ctx.save();
    ctx.translate(cx + heroDriftX, heroBaseY + heroDriftY);
    ctx.rotate(Math.sin(logoFrame * 0.04) * 0.12);
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 15;
    ctx.drawImage(heroImg[0], -heroW / 2, -heroH / 2);
    ctx.restore();
    // ===== 标题：金色渐变 + 描边 + 发光 + 轻微浮动 =====
    const titleFloat = Math.sin(logoFrame * 0.03) * Math.round(3 * fontScale);
    const titleY = cy + Math.round(5 * fontScale) + titleFloat;
    const titleFontSize = Math.round(48 * fontScale);
    ctx.font = `bold ${titleFontSize}px arial`;
    ctx.shadowColor = "#ff8c00";
    ctx.shadowBlur = 20;
    // 描边
    ctx.strokeStyle = "#3a1a00";
    ctx.lineWidth = Math.max(1, Math.round(2 * fontScale));
    ctx.strokeText(t("start.title"), cx, titleY);
    // 渐变填充
    const gradient = ctx.createLinearGradient(0, titleY - titleFontSize, 0, titleY);
    gradient.addColorStop(0, "#ffe066");
    gradient.addColorStop(0.5, "#ffd700");
    gradient.addColorStop(1, "#ff8c00");
    ctx.fillStyle = gradient;
    ctx.fillText(t("start.title"), cx, titleY);
    // ===== 提示文字：闪烁效果 =====
    const blinkAlpha = 0.5 + 0.5 * Math.sin(logoFrame * 0.08);
    ctx.globalAlpha = blinkAlpha;
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.round(20 * fontScale)}px arial`;
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 6;
    ctx.fillText(t("start.clickToStart"), cx, cy + Math.round(75 * fontScale));
    // ===== 底部按钮：设置 + 游戏数据 =====
    ctx.globalAlpha = 0.7;
    ctx.shadowBlur = 4;
    ctx.shadowColor = "#000";
    ctx.fillStyle = "#ccc";
    ctx.font = `${Math.round(18 * fontScale)}px arial`;
    // 设置按钮（左侧）
    const btnGap = Math.round(60 * fontScale);
    settingsBtnY = height - Math.round(40 * fontScale);
    ctx.fillText(t("start.settings"), cx - btnGap / 2, settingsBtnY);
    settingsBtnHitH = Math.round(30 * fontScale);
    // 记录设置按钮的水平范围
    const settingsTextWidth = ctx.measureText(t("start.settings")).width;
    settingsBtnX = cx - btnGap / 2 - settingsTextWidth / 2;
    settingsBtnW = settingsTextWidth;
    // 游戏数据按钮（右侧）
    const gameDataTextY = settingsBtnY; // 与设置按钮同一行
    ctx.fillText(t("start.gameData"), cx + btnGap / 2, gameDataTextY);
    const gameDataTextWidth = ctx.measureText(t("start.gameData")).width;
    gameDataBtnX = cx + btnGap / 2 - gameDataTextWidth / 2;
    gameDataBtnW = gameDataTextWidth;
    ctx.restore();
}
function getSettingsBtnArea() {
    return { x: settingsBtnX, y: settingsBtnY - settingsBtnHitH, w: settingsBtnW, h: settingsBtnHitH };
}
function getGameDataBtnArea() {
    const y = settingsBtnY; // 与设置按钮同一行
    return { x: gameDataBtnX, y: y - settingsBtnHitH, w: gameDataBtnW, h: settingsBtnHitH };
}
// 加载动画
function loading() {
    let index = 0;
    return function () {
        index % 1 === 0 &&
            ctx.drawImage(gameLoad[Math.floor(index)], (width - gameLoad[0].width) / 2, height - gameLoad[0].height);
        index += 0.5;
        if (index > 3) {
            index = 0;
            return PHASE_PLAY;
        }
        return PHASE_LOADING;
    };
}
export { paintBg, paintLogo, loading, getSettingsBtnArea, getGameDataBtnArea };
