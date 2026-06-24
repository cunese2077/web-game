// 玩家战机类
import { ctx, canvas, width } from "./canvas.js";
import { heroImg } from "./resources.js";
import { PHASE_PLAY, PHASE_PAUSE, PHASE_GAMEOVER } from "./constants.js";
import Hullet from "./bullet.js";
import Enemy from "./enemy.js";

let gameScore = 0;

// 当前活跃的 hero 实例引用，供事件回调使用
let activeHero = null;

// 事件是否已绑定（全局只绑定一次）
let eventsBound = false;

function bindEventsOnce() {
  if (eventsBound) return;
  eventsBound = true;

  const move = (e) => {
    if (!activeHero) return;
    const curPhase = activeHero._getCurrentPhase();
    if (curPhase === PHASE_PLAY || curPhase === PHASE_PAUSE) {
      activeHero._setCurrentPhase(PHASE_PLAY);
      const offsetX = e.offsetX || e.touches[0].pageX;
      const offsetY = e.offsetY || e.touches[0].pageY;
      const w = heroImg[0].width;
      const h = heroImg[0].height;
      let nx = offsetX - w / 2;
      let ny = offsetY - h / 2;
      nx < 20 - w / 2
        ? (nx = 20 - w / 2)
        : nx > canvas.width - w / 2 - 20
          ? (nx = canvas.width - w / 2 - 20)
          : null;
      ny < 0
        ? (ny = 0)
        : ny > canvas.height - h / 2
          ? (ny = canvas.height - h / 2)
          : null;
      activeHero.x = nx;
      activeHero.y = ny;
      activeHero.count = 2;
    }
  };

  canvas.addEventListener("mousemove", move, false);
  canvas.addEventListener("touchmove", move, false);

  canvas.onmouseout = () => {
    if (!activeHero) return;
    if (activeHero._getCurrentPhase() === PHASE_PLAY) {
      activeHero._setCurrentPhase(PHASE_PAUSE);
    }
  };
}

class Hero {
  constructor() {
    this.x = (width - heroImg[0].width) / 2;
    this.y = ctx.canvas.height - heroImg[0].height;
    this.index = 0;
    this.count = 0;
    this.hCount = 0;
    this.eCount = 0;
    this.n = 0;
    this.life = 0;
    // 注册为当前活跃实例
    activeHero = this;
    bindEventsOnce();
  }

  draw(curPhase) {
    this.count++;
    this.hit();

    if (this.index > 4) {
      curPhase = PHASE_GAMEOVER;
      this.index = 5;
    }

    if (this.count % 3 === 0 && this.index <= 1) {
      this.index = this.index === 0 ? 1 : 0;
      this.count = 0;
    }

    ctx.drawImage(heroImg[this.index], this.x, this.y);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px arial";
    ctx.fillText("SCORE:" + gameScore, 10, 30);

    this.hCount++;
    if (this.hCount % 3 === 0) {
      this.n === 32 && (this.n = 0);
      Hullet.add(new Hullet(this.n, this.x, this.y, heroImg[0].width, heroImg[0].height));
      this.n === 0 && (this.n = -32);
      Hullet.add(new Hullet(this.n, this.x, this.y, heroImg[0].width, heroImg[0].height));
      this.n === -32 && (this.n = 32);
      Hullet.add(new Hullet(this.n, this.x, this.y, heroImg[0].width, heroImg[0].height));
      this.hCount = 0;
    }

    this.eCount++;
    if (this.eCount % 8 === 0) {
      Enemy.add(new Enemy());
      this.eCount = 0;
    }

    return curPhase;
  }

  hit() {
    const enemies = Enemy.getAll();
    for (let i = 0; i < enemies.length; i++) {
      const d = enemies[i];
      const px = this.x <= d.x ? d.x : this.x;
      const py = this.y <= d.y ? d.y : this.y;

      if (
        px >= this.x &&
        px <= this.x + heroImg[0].width &&
        py >= this.y &&
        py <= this.y + heroImg[0].height &&
        px >= d.x &&
        px <= d.x + d.width &&
        py >= d.y &&
        py <= d.y + d.height
      ) {
        this.life++;
        if (this.life > 30) {
          if (this.index <= 2) {
            this.index = 3;
          }
          this.index++;
          this.life = 0;
        }
      }
    }
  }

  // 通过回调与引擎通信（在 engine 中设置）
  _getCurrentPhase = null;
  _setCurrentPhase = null;

  setPhaseCallbacks(getter, setter) {
    this._getCurrentPhase = getter;
    this._setCurrentPhase = setter;
  }
}

function getGameScore() {
  return gameScore;
}

function resetGameScore() {
  gameScore = 0;
}

function addGameScore(score) {
  gameScore += score;
}

export { Hero, getGameScore, resetGameScore, addGameScore };
export default Hero;
