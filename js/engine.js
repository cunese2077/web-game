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
import { Hero, getGameScore, resetGameScore } from "./hero.js";
import Hullet from "./bullet.js";
import Enemy from "./enemy.js";
import { paintBg, paintLogo, loading, drawPause, drawGameover } from "./ui.js";

let curPhase = PHASE_DOWNLOAD;
let hero = null;
let pBg = null;
let loadAnim = null;

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
    if (curPhase === PHASE_READY) {
      curPhase = PHASE_LOADING;
    } else if (curPhase === PHASE_GAMEOVER) {
      resetGameScore();
      hero = new Hero();
      hero.setPhaseCallbacks(getCurPhase, setCurPhase);
      Hullet.clear();
      Enemy.clear();
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
      Hullet.drawHullet();
      curPhase = hero.draw(curPhase);
      break;
    case PHASE_PAUSE:
      drawPause();
      break;
    case PHASE_GAMEOVER:
      pBg();
      drawGameover();
      break;
  }
}

// 加载资源完成后启动游戏
download(start);

// 启动游戏主循环
setInterval(gameEngine, 50);
