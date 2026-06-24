// 敌机类
import { ctx } from "./canvas.js";
import { enemy1, enemy2, enemy3 } from "./resources.js";
import Hullet from "./bullet.js";
import { addGameScore } from "./hero.js";

const liveEnemy = []; // 存储画布上所有敌机

class Enemy {
  constructor() {
    this.n = Math.random() * 20;
    this.enemy = null;
    this.speed = 0;
    this.lifes = 2;

    if (this.n < 1) {
      this.enemy = enemy3[0];
      this.speed = 2;
      this.lifes = 50;
    } else if (this.n < 6) {
      this.enemy = enemy2[0];
      this.speed = 4;
      this.lifes = 10;
    } else {
      this.enemy = enemy1[0];
      this.speed = 6;
    }

    this.x = parseInt(Math.random() * (ctx.canvas.width - this.enemy.width));
    this.y = -this.enemy.height;
    this.width = this.enemy.width;
    this.height = this.enemy.height;
    this.index = 0;
    this.removable = false;
    this.die = false;
  }

  draw() {
    // 处理不同敌机的爆炸图
    if (this.speed === 2) {
      if (this.die) {
        if (this.index < 2) {
          this.index = 3;
        }
        if (this.index < enemy3.length) {
          this.enemy = enemy3[this.index++];
        } else {
          this.removable = true;
        }
      } else {
        this.enemy = enemy3[this.index];
        this.index === 0 ? (this.index = 1) : (this.index = 0);
      }
    } else if (this.die) {
      if (this.index < enemy1.length) {
        if (this.speed === 6) {
          this.enemy = enemy1[this.index++];
        } else {
          this.enemy = enemy2[this.index++];
        }
      } else {
        this.removable = true;
      }
    }

    ctx.drawImage(this.enemy, this.x, this.y);
    this.y += this.speed;
    this.hit();

    if (this.y > ctx.canvas.height) {
      this.removable = true;
    }
  }

  hit() {
    const hullets = Hullet.getAll();
    for (let i = 0; i < hullets.length; i++) {
      const h = hullets[i];
      if (
        this.x + this.width >= h.mx &&
        h.mx + h.width >= this.x &&
        h.my + h.height >= this.y &&
        this.height + this.y >= h.my
      ) {
        if (--this.lifes === 0) {
          this.die = true;
          addGameScore(this.speed === 6 ? 10 : this.speed === 4 ? 20 : 100);
        }
        h.removable = true;
      }
    }
  }

  // 批量绘制并清理敌机
  static drawEnemy() {
    for (let i = liveEnemy.length - 1; i >= 0; i--) {
      if (liveEnemy[i].removable) {
        liveEnemy.splice(i, 1);
      } else {
        liveEnemy[i].draw();
      }
    }
  }

  // 添加敌机
  static add(enemy) {
    liveEnemy.push(enemy);
  }

  // 获取敌机数组
  static getAll() {
    return liveEnemy;
  }

  // 清空敌机
  static clear() {
    liveEnemy.length = 0;
  }
}

export default Enemy;
