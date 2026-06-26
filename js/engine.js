// 游戏主引擎
import { canvas, ctx } from "./canvas.js";
import { download } from "./resources.js";
import {
  PHASE_DOWNLOAD,
  PHASE_READY,
  PHASE_LOADING,
  PHASE_PLAY,
  PHASE_PAUSE,
  PHASE_GAMEOVER,
} from "./constants.js";
import { Hero } from "./hero.js";
import { resetGameScore } from "./score.js";
import Bullet from "./bullet.js";
import Enemy from "./enemy.js";
import Item from "./item.js";
import { paintBg, paintLogo, loading, drawPause, drawGameOver, drawScoreEffects, clearScoreEffects } from "./ui.js";
import { resumeAudio, playGameOver } from "./audio.js";

let curPhase = PHASE_DOWNLOAD;
let hero = null;
let pBg = null;
let loadAnim = null;
let gameOverSoundPlayed = false; // 防止游戏结束音效重复播放

// 获取/设置当前阶段（供 Hero 回调使用）
function getCurPhase() {
  return curPhase;
}
function setCurPhase(phase) {
  curPhase = phase;
}

// 游戏启动
function start() {
  curPhase = PHASE_READY;
  canvas.onclick = function () {
    resumeAudio(); // 用户交互时激活 AudioContext
    if (curPhase === PHASE_READY) {
      curPhase = PHASE_LOADING;
    } else if (curPhase === PHASE_GAMEOVER) {
      resetGameScore();
      hero = new Hero();
      hero.setPhaseCallbacks(getCurPhase, setCurPhase);
      Bullet.clear();
      Enemy.clear();
      Item.clear();
      clearScoreEffects();
      gameOverSoundPlayed = false;
      curPhase = PHASE_READY;
    }
  };
  ctx.fillStyle = "#963";
  ctx.font = "24px arial";
  hero = new Hero();
  hero.setPhaseCallbacks(getCurPhase, setCurPhase);
  pBg = paintBg();
  loadAnim = loading();
}

// 游戏主引擎
function gameEngine() {
  switch (curPhase) {
    case PHASE_READY:
      pBg();
      paintLogo();
      break;
    case PHASE_LOADING:
      pBg();
      curPhase = loadAnim();
      break;
    case PHASE_PLAY:
      pBg();
      Enemy.drawEnemy();
      Item.drawItems();
      Bullet.drawBullet();
      curPhase = hero.draw(curPhase);
      drawScoreEffects();
      break;
    case PHASE_PAUSE:
      drawPause();
      break;
    case PHASE_GAMEOVER:
      pBg();
      drawGameOver();
      if (!gameOverSoundPlayed) {
        playGameOver();
        gameOverSoundPlayed = true;
      }
      break;
  }
}

// 加载资源完成后启动游戏
download(start);

// 启动游戏主循环
setInterval(gameEngine, 50);
