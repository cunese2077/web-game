// 敌机类
import { ctx } from "./canvas.js";
import { enemy1, enemy2, enemy3 } from "./resources.js";
import Bullet from "./bullet.js";
import { addGameScore, getHeroHp, getHeroMaxHp } from "./hero.js";
import Item from "./item.js";
import { addScoreEffect } from "./ui.js";
import { playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig } from "./audio.js";

const liveEnemy = []; // 存储画布上所有敌机

// 大型敌机生成冷却：防止连续刷出多个
let bigEnemyCooldown = 0; // 剩余冷却帧数
const BIG_ENEMY_COOLDOWN_FRAMES = 40; // 两个大型敌机之间至少间隔40帧（约2秒）

// 根据玩家血量计算动态概率
function getDynamicProbabilities() {
  const hp = getHeroHp();
  const maxHp = getHeroMaxHp();
  const hpRatio = maxHp > 0 ? hp / maxHp : 1;

  // 血量越低，最大敌机出现概率越高，道具掉落概率越高
  // hpRatio: 1(满血) → 0(空血)
  // 最大敌机概率: 基础5% → 满血5%, 空血10%
  const bigEnemyProb = 0.05 + (1 - hpRatio) * 0.05;
  // 道具掉落概率: 基础30% → 满血30%, 空血80%
  const itemDropProb = 0.3 + (1 - hpRatio) * 0.5;

  return { bigEnemyProb, itemDropProb };
}

// 每帧递减冷却计数
function tickCooldown() {
  if (bigEnemyCooldown > 0) bigEnemyCooldown--;
}

class Enemy {
  constructor() {
    const { bigEnemyProb } = getDynamicProbabilities();
    const bigEnemyThreshold = bigEnemyProb * 20;
    const midEnemyThreshold = bigEnemyThreshold + 5;

    this.n = Math.random() * 20;
    this.enemy = null;
    this.speed = 0;
    this.lifes = 2;

    if (this.n < bigEnemyThreshold && bigEnemyCooldown === 0) {
      this.enemy = enemy3[0];
      this.speed = 2;
      this.lifes = 50;
      bigEnemyCooldown = BIG_ENEMY_COOLDOWN_FRAMES; // 触发冷却
    } else if (this.n < midEnemyThreshold) {
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
    const bullets = Bullet.getAll();
    for (let i = bullets.length - 1; i >= 0; i--) {
      const h = bullets[i];
      if (
        this.x + this.width >= h.mx &&
        h.mx + h.width >= this.x &&
        h.my + h.height >= this.y &&
        this.height + this.y >= h.my
      ) {
        if (--this.lifes === 0) {
          this.die = true;
          const score = this.speed === 6 ? 10 : this.speed === 4 ? 20 : 100;
          addGameScore(score);
          // 击败敌机时在敌机位置显示得分动效
          addScoreEffect(this.x + this.width / 2, this.y + this.height / 2, score);
          // 播放对应敌机摧毁音效
          if (this.speed === 2) {
            playEnemyDestroyBig();
          } else if (this.speed === 4) {
            playEnemyDestroyMedium();
          } else {
            playEnemyDestroySmall();
          }
          // 击败最大敌机（speed=2）时根据玩家血量动态调整道具掉落概率
          if (this.speed === 2) {
            const { itemDropProb } = getDynamicProbabilities();
            if (Math.random() < itemDropProb) {
              Item.add(this.x + this.width / 2, this.y + this.height / 2);
            }
          }
        }
        h.removable = true;
      }
    }
  }

  // 批量绘制并清理敌机
  static drawEnemy() {
    tickCooldown();
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
    bigEnemyCooldown = 0;
  }
}

export default Enemy;
