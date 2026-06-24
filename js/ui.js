// UI 绘制模块：背景、logo、loading、暂停、游戏结束
import { ctx, width, height } from "./canvas.js";
import { bg, startImg, pause, gameLoad } from "./resources.js";
import { PHASE_READY, PHASE_LOADING, PHASE_PLAY, PHASE_GAMEOVER } from "./constants.js";
import { getGameScore, resetGameScore } from "./hero.js";

// 画滚动背景
function paintBg() {
  let y = 0;
  return function () {
    ctx.drawImage(bg, 0, y);
    ctx.drawImage(bg, 0, y - 852);
    y++ === 852 && (y = 0);
  };
}

// 画开始 logo
function paintLogo() {
  ctx.drawImage(startImg, 40, 0);
}

// 加载动画
function loading() {
  let index = 0;
  return function () {
    index % 1 === 0 &&
      ctx.drawImage(gameLoad[index], 0, height - gameLoad[0].height);
    index += 0.5;
    if (index > 3) {
      index = 0;
      return PHASE_PLAY;
    }
    return PHASE_LOADING;
  };
}

// 画暂停图标
function drawPause() {
  ctx.drawImage(pause, (width - pause.width) / 2, (height - pause.height) / 2);
}

// 画游戏结束界面
function drawGameover() {
  // 半透明遮罩
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, width, height);

  // 标题
  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", width / 2, height / 2 - 60);

  // 得分
  ctx.font = "28px arial";
  ctx.fillText("SCORE: " + getGameScore(), width / 2, height / 2);

  // 提示点击重新开始
  ctx.font = "20px arial";
  ctx.fillStyle = "#ccc";
  ctx.fillText("Click to Restart", width / 2, height / 2 + 50);

  // 恢复左对齐（避免影响其他绘制）
  ctx.textAlign = "left";
}

export { paintBg, paintLogo, loading, drawPause, drawGameover };
