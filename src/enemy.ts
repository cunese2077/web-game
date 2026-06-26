// 敌机类
import { ctx } from "./canvas.js";
import { enemy1, enemy2, enemy3 } from "./resources.js";
import Bullet from "./bullet.js";
import { addGameScore } from "./score.js";
import { addExp, getExpReward, getLevelBonuses } from "./level.js";
import { getHeroHp, getHeroMaxHp, getHeroBuffs } from "./hero.js";
import Item from "./item.js";
import { addScoreEffect } from "./ui.js";
import { playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig } from "./audio.js";
import {
  enemyConfig,
  buffConfig,
  bulletConfig,
  getDynamicHealDropProb,
  getDynamicShieldDropProb,
  getDynamicBigFirepowerDropProb,
  getDynamicMediumFirepowerDropProb,
  getDynamicMediumShieldDropProb,
  getDynamicSpreadDropProb,
  getDynamicBigEnemySpawnProb,
} from "./config.js";
import type { MoveType, BuffState } from "./types.js";

const liveEnemy: Enemy[] = [];

let bigEnemyCoolDown: number = 0;

function tickCoolDown(): void {
  if (bigEnemyCoolDown > 0) bigEnemyCoolDown--;
}

function getHpRatio(): number {
  const hp = getHeroHp();
  const maxHp = getHeroMaxHp();
  return maxHp > 0 ? hp / maxHp : 1;
}

class Enemy {
  n: number;
  enemy: HTMLImageElement;
  speed: number;
  lives: number;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  removable: boolean;
  die: boolean;
  originX: number;
  moveType: MoveType;
  movePhase: number;
  moveDirection: number;

  constructor() {
    const hpRatio = getHpRatio();
    const bigEnemyProb = getDynamicBigEnemySpawnProb(hpRatio);
    const bigEnemyThreshold = bigEnemyProb * 20;
    const midEnemyThreshold = bigEnemyThreshold + enemyConfig.medium.spawnWeight;

    this.n = Math.random() * 20;
    this.enemy = new Image();
    this.speed = 0;
    this.lives = 2;

    if (this.n < bigEnemyThreshold && bigEnemyCoolDown === 0) {
      this.enemy = enemy3[0];
      this.speed = enemyConfig.big.speed;
      this.lives = enemyConfig.big.hp;
      bigEnemyCoolDown = enemyConfig.big.coolDownFrames;
    } else if (this.n < midEnemyThreshold) {
      this.enemy = enemy2[0];
      this.speed = enemyConfig.medium.speed;
      this.lives = enemyConfig.medium.hp;
    } else {
      this.enemy = enemy1[0];
      this.speed = enemyConfig.small.speed;
    }

    this.x = parseInt(String(Math.random() * (ctx.canvas.width - this.enemy.width)));
    this.y = -this.enemy.height;
    this.width = this.enemy.width;
    this.height = this.enemy.height;
    this.index = 0;
    this.removable = false;
    this.die = false;

    this.originX = this.x;
    this.moveType = this._getMoveType();
    this.movePhase = Math.random() * Math.PI * 2;
    this.moveDirection = Math.random() < 0.5 ? 1 : -1;
  }

  _getMoveType(): MoveType {
    if (this.speed === enemyConfig.big.speed) {
      return enemyConfig.big.move.type;
    } else if (this.speed === enemyConfig.medium.speed) {
      return enemyConfig.medium.move.type;
    }
    return enemyConfig.small.move.type;
  }

  _updateHorizontalPosition(): void {
    if (this.die) return;

    const canvasWidth = ctx.canvas.width;

    if (this.moveType === "sine") {
      // 正弦摆动只对中型敌机生效，直接使用中型敌机配置
      const config = enemyConfig.medium.move;
      this.movePhase += config.frequency;
      this.x = this.originX + config.amplitude * Math.sin(this.movePhase);
      this.x = Math.max(0, Math.min(this.x, canvasWidth - this.width));

    } else if (this.moveType === "zigzag") {
      // 锯齿形移动只对大型敌机生效，直接使用大型敌机配置
      const config = enemyConfig.big.move;
      this.x += config.horizontalSpeed * this.moveDirection;
      if (this.x <= 0) {
        this.x = 0;
        this.moveDirection = 1;
      }
      if (this.x >= canvasWidth - this.width) {
        this.x = canvasWidth - this.width;
        this.moveDirection = -1;
      }
    }
  }

  draw(): void {
    if (this.speed === enemyConfig.big.speed) {
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
        if (this.speed === enemyConfig.small.speed) {
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
    this._updateHorizontalPosition();
    this.hit();

    if (this.y > ctx.canvas.height) {
      this.removable = true;
    }
  }

  hit(): void {
    if (this.die) return;

    const allBullets = Bullet.getAll();
    const buffs: BuffState = getHeroBuffs();
    const levelBonuses = getLevelBonuses();
    const baseDamage = bulletConfig.baseDamage + levelBonuses.extraDamage;
    const damageMultiplier = baseDamage * (buffs.firepower > 0 ? buffConfig.firepower.damageMultiplier : 1);

    for (let i = allBullets.length - 1; i >= 0; i--) {
      const h = allBullets[i];
      if (
        this.x + this.width >= h.mx &&
        h.mx + h.width >= this.x &&
        h.my + h.height >= this.y &&
        this.height + this.y >= h.my
      ) {
        this.lives -= damageMultiplier;
        if (this.lives <= 0) {
          this.die = true;
          const score = this.speed === enemyConfig.big.speed ? enemyConfig.big.score
                       : this.speed === enemyConfig.medium.speed ? enemyConfig.medium.score
                       : enemyConfig.small.score;
          addGameScore(score);
          addExp(getExpReward(this.speed));
          addScoreEffect(this.x + this.width / 2, this.y + this.height / 2, score);
          if (this.speed === enemyConfig.big.speed) {
            playEnemyDestroyBig();
          } else if (this.speed === enemyConfig.medium.speed) {
            playEnemyDestroyMedium();
          } else {
            playEnemyDestroySmall();
          }
          this._dropItems();
          h.removable = true;
          break;
        }
        h.removable = true;
      }
    }
  }

  _dropItems(): void {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    const hpRatio = getHpRatio();

    if (this.speed === enemyConfig.big.speed) {
      const shieldProb = getDynamicShieldDropProb(hpRatio);
      const healProb = getDynamicHealDropProb(hpRatio);
      const firepowerProb = getDynamicBigFirepowerDropProb(hpRatio);

      const rand = Math.random();
      if (rand < shieldProb) {
        Item.add(cx, cy, "shield");
      } else if (rand < shieldProb + healProb) {
        Item.add(cx, cy, "heal");
      } else if (rand < shieldProb + healProb + firepowerProb) {
        Item.add(cx, cy, "firepower");
      }

    } else if (this.speed === enemyConfig.medium.speed) {
      const shieldProb = getDynamicMediumShieldDropProb(hpRatio);
      const firepowerProb = getDynamicMediumFirepowerDropProb(hpRatio);
      const spreadProb = getDynamicSpreadDropProb(hpRatio);

      const rand = Math.random();
      if (rand < shieldProb) {
        Item.add(cx, cy, "shield");
      } else if (rand < shieldProb + firepowerProb) {
        Item.add(cx, cy, "firepower");
      } else if (rand < shieldProb + firepowerProb + spreadProb) {
        Item.add(cx, cy, "spread");
      }
    }
  }

  static drawEnemy(): void {
    tickCoolDown();
    for (let i = liveEnemy.length - 1; i >= 0; i--) {
      if (liveEnemy[i].removable) {
        liveEnemy.splice(i, 1);
      } else {
        liveEnemy[i].draw();
      }
    }
  }

  static add(enemy: Enemy): void {
    liveEnemy.push(enemy);
  }

  static getAll(): Enemy[] {
    return liveEnemy;
  }

  static clear(): void {
    liveEnemy.length = 0;
  }
}

export { Enemy };
export default Enemy;
