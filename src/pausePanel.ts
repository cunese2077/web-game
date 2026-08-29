// 暂停面板模块：暂停界面绘制（播放图标 + 返回主页按钮）
// 从 ui.ts 拆出（保持函数签名不变，ui.ts 统一 re-export）
import { ctx, width, height, fontScale } from "./canvas.js";
import { t } from "./i18n.js";

// 暂停界面返回按钮点击区域
let pauseBackBtnX: number = 0;
let pauseBackBtnW: number = 0;
let pauseBackBtnY: number = 0;
let pauseBackBtnH: number = 0;

function getPauseBackBtnArea(): { x: number; y: number; w: number; h: number } {
  return { x: pauseBackBtnX, y: pauseBackBtnY, w: pauseBackBtnW, h: pauseBackBtnH };
}

function drawPause(): void {
  // 半透明遮罩（保留游戏画面可见）
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, width, height);

  // 居中绘制 ▶ 播放图标（圆形背景 + 三角 + 发光）
  const circleR = Math.round(28 * fontScale);
  const iconX = width / 2;
  const iconY = height / 2 - Math.round(24 * fontScale);
  ctx.save();
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.arc(iconX, iconY, circleR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // ▶ 三角
  const triW = Math.round(14 * fontScale);
  const triH = Math.round(18 * fontScale);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.moveTo(iconX - triW / 2 + Math.round(2 * fontScale), iconY - triH / 2);
  ctx.lineTo(iconX + triW / 2 + Math.round(2 * fontScale), iconY);
  ctx.lineTo(iconX - triW / 2 + Math.round(2 * fontScale), iconY + triH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 返回主页面按钮（播放图标下方）
  const btnFontSize = Math.round(18 * fontScale);
  ctx.font = `${btnFontSize}px arial`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ccc";
  const btnY = iconY + circleR + Math.round(28 * fontScale);
  ctx.fillText(t("pause.backToMain"), width / 2, btnY);

  // 记录点击区域
  const btnText = t("pause.backToMain");
  const btnW = ctx.measureText(btnText).width + Math.round(20 * fontScale);
  pauseBackBtnX = width / 2 - btnW / 2;
  pauseBackBtnW = btnW;
  pauseBackBtnY = btnY - btnFontSize;
  pauseBackBtnH = btnFontSize + Math.round(10 * fontScale);
}

export { drawPause, getPauseBackBtnArea };
