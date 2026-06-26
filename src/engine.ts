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
import type { GamePhase } from "./types.js";

let curPhase: GamePhase = PHASE_DOWNLOAD;
let hero: Hero | null = null;
let pBg: (() => void) | null = null;
let loadAnim: (() => GamePhase) | null = null;
let gameOverSoundPlayed: boolean = false;

function getCurPhase(): GamePhase {
  return curPhase;
}

function setCurPhase(phase: GamePhase): void {
  curPhase = phase;
}

function start(): void {
  curPhase = PHASE_READY;
  canvas.onclick = function (): void {
    resumeAudio();
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

function gameEngine(): void {
  switch (curPhase) {
    case PHASE_READY:
      if (pBg) pBg();
      paintLogo();
      break;
    case PHASE_LOADING:
      if (pBg) pBg();
      if (loadAnim) curPhase = loadAnim();
      break;
    case PHASE_PLAY:
      if (pBg) pBg();
      Enemy.drawEnemy();
      Item.drawItems();
      Bullet.drawBullet();
      if (hero) curPhase = hero.draw(curPhase);
      drawScoreEffects();
      break;
    case PHASE_PAUSE:
      drawPause();
      break;
    case PHASE_GAMEOVER:
      if (pBg) pBg();
      drawGameOver();
      if (!gameOverSoundPlayed) {
        playGameOver();
        gameOverSoundPlayed = true;
      }
      break;
  }
}

download(start);

const TARGET_DELTA: number = 50;
let lastTimestamp: number = 0;

function gameLoop(timestamp: number): void {
  const delta = timestamp - lastTimestamp;
  if (delta >= TARGET_DELTA) {
    lastTimestamp = timestamp - (delta % TARGET_DELTA);
    gameEngine();
  }
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
