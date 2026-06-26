// 敌机类
import { ctx } from "./canvas.js";
import { enemy1, enemy2, enemy3 } from "./resources.js";
import Bullet from "./bullet.js";
import { addGameScore } from "./score.js";
import { getHeroHp, getHeroMaxHp, getHeroBuffs } from "./hero.js";
import Item from "./item.js";
import { addScoreEffect } from "./ui.js";
import { playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig } from "./audio.js";
import {
  enemyConfig,
  buffConfig,
  getDynamicHealDropProb,
  getDynamicShieldDropProb,
  getDynamicBigFirepowerDropProb,
  getDynamicMediumFirepowerDropProb,
  getDynamicMediumShieldDropProb,  // 方案四新增：中型敌机护盾概率
  getDynamicSpreadDropProb,
  getDynamicBigEnemySpawnProb,
} from "./config.js";

const liveEnemy = []; // 存储画布上所有敌机

// 大型敌机生成冷却：防止连续刷出多个
let bigEnemyCooldown = 0; // 剩余冷却帧数

// 每帧递减冷却计数
function tickCooldown() {
  if (bigEnemyCooldown > 0) bigEnemyCooldown--;
}

// 获取当前玩家血量比例（供动态概率计算使用）
function getHpRatio() {
  const hp = getHeroHp();
  const maxHp = getHeroMaxHp();
  return maxHp > 0 ? hp / maxHp : 1;
}

class Enemy {
  constructor() {
    // 根据玩家血量计算大型敌机出现概率
    const hpRatio = getHpRatio();
    const bigEnemyProb = getDynamicBigEnemySpawnProb(hpRatio);
    const bigEnemyThreshold = bigEnemyProb * 20;
    const midEnemyThreshold = bigEnemyThreshold + enemyConfig.medium.spawnWeight;

    this.n = Math.random() * 20;
    this.enemy = null;
    this.speed = 0;
    this.lifes = 2;

    if (this.n < bigEnemyThreshold && bigEnemyCooldown === 0) {
      this.enemy = enemy3[0];
      this.speed = enemyConfig.big.speed;
      this.lifes = enemyConfig.big.hp;
      bigEnemyCooldown = enemyConfig.big.cooldownFrames; // 触发冷却（配置值）
    } else if (this.n < midEnemyThreshold) {
      this.enemy = enemy2[0];
      this.speed = enemyConfig.medium.speed;
      this.lifes = enemyConfig.medium.hp;
    } else {
      this.enemy = enemy1[0];
      this.speed = enemyConfig.small.speed;
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
    // 处理不同敌机的爆炸图（使用配置值判断）
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
    this.hit();

    if (this.y > ctx.canvas.height) {
      this.removable = true;
    }
  }

  hit() {
    // 保护：已死亡的敌机不再处理碰撞，避免重复得分
    if (this.die) return;

    const bullets = Bullet.getAll();
    const buffs = getHeroBuffs();
    // 双倍火力：每颗子弹伤害 ×damageMultiplier（配置值）
    const damageMultiplier = buffs.firepower > 0 ? buffConfig.firepower.damageMultiplier : 1;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const h = bullets[i];
      if (
        this.x + this.width >= h.mx &&
        h.mx + h.width >= this.x &&
        h.my + h.height >= this.y &&
        this.height + this.y >= h.my
      ) {
        this.lifes -= damageMultiplier;
        if (this.lifes <= 0) {
          this.die = true;
          // 根据敌机速度计算得分（使用配置值）
          const score = this.speed === enemyConfig.big.speed ? enemyConfig.big.score
                       : this.speed === enemyConfig.medium.speed ? enemyConfig.medium.score
                       : enemyConfig.small.score;
          addGameScore(score);
          // 击败敌机时在敌机位置显示得分动效
          addScoreEffect(this.x + this.width / 2, this.y + this.height / 2, score);
          // 播放对应敌机摧毁音效
          if (this.speed === enemyConfig.big.speed) {
            playEnemyDestroyBig();
          } else if (this.speed === enemyConfig.medium.speed) {
            playEnemyDestroyMedium();
          } else {
            playEnemyDestroySmall();
          }
          // 道具掉落逻辑
          this._dropItems();
          // 关键：敌机已死，立即跳出子弹循环，避免同帧内其他子弹再次触发得分
          h.removable = true;
          break;
        }
        h.removable = true;
      }
    }
  }

  // 道具掉落逻辑（使用动态概率）
  // 所有道具掉落概率根据玩家血量动态调整
  // 判断顺序已优化：护盾优先判断，确保有独立的概率区间
  _dropItems() {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // 获取当前玩家血量比例
    const hpRatio = getHpRatio();

    if (this.speed === enemyConfig.big.speed) {
      // 大型敌机掉落：护盾（独立区间优先）、回血、火力
      // 概率计算（根据玩家血量动态调整，方案四大幅提升护盾概率）
      const shieldProb = getDynamicShieldDropProb(hpRatio);   // 满血30% → 空血50%
      const healProb = getDynamicHealDropProb(hpRatio);       // 满血25% → 空血75%
      const firepowerProb = getDynamicBigFirepowerDropProb(hpRatio); // 满血12% → 空血8%

      const rand = Math.random();
      // 优化判断顺序：护盾优先，确保有独立概率区间 0~shieldProb
      if (rand < shieldProb) {
        Item.add(cx, cy, "shield");
      } else if (rand < shieldProb + healProb) {
        Item.add(cx, cy, "heal");
      } else if (rand < shieldProb + healProb + firepowerProb) {
        Item.add(cx, cy, "firepower");
      }
    } else if (this.speed === enemyConfig.medium.speed) {
      // 中型敌机掉落：护盾（方案四新增）、火力、散弹
      // 概率计算（根据玩家血量动态调整）
      const shieldProb = getDynamicMediumShieldDropProb(hpRatio);   // 满血8% → 空血12%
      const firepowerProb = getDynamicMediumFirepowerDropProb(hpRatio); // 满血8% → 空血5%
      const spreadProb = getDynamicSpreadDropProb(hpRatio);             // 满血8% → 空血5%

      const rand = Math.random();
      // 护盾优先判断，确保有独立概率区间 0~shieldProb
      if (rand < shieldProb) {
        Item.add(cx, cy, "shield");
      } else if (rand < shieldProb + firepowerProb) {
        Item.add(cx, cy, "firepower");
      } else if (rand < shieldProb + firepowerProb + spreadProb) {
        Item.add(cx, cy, "spread");
      }
    }
    // 小型敌机不掉落道具
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

export { Enemy };
export default Enemy;
