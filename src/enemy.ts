// 敌机类
import { ctx, width, height, fontScale } from "./canvas.js";
import { enemy1, enemy2, enemy3 } from "./resources.js";
import Bullet from "./bullet.js";
import { addGameScore } from "./score.js";
import { addExp, getExpReward, getLevel } from "./level.js";
import { getHeroHp, getHeroMaxHp, getHeroBuffs, healHero } from "./hero.js";
import { getBulletDamageWithBuff, hasPiercing, addBossKillBonus, getCritChance } from "./upgrade.js";
import Item from "./item.js";
import { addScoreEffect, addDamageEffect } from "./ui.js";
import { playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig, playEnemyHit } from "./audio.js";
import {
  enemyConfig,
  enemySpawnScaling,
  buffConfig,
  bulletConfig,
  hitEffect,
  getScaledEnemyStat,
  getDifficultyConfig,
  getDynamicHealDropProb,
  getDynamicShieldDropProb,
  getDynamicBigFirepowerDropProb,
  getDynamicMediumFirepowerDropProb,
  getDynamicMediumShieldDropProb,
  getDynamicSpreadDropProb,
  getDynamicBigEnemySpawnProb,
} from "./config.js";
import { getDifficulty } from "./settings.js";
import type { MoveType, BuffState, HpBarConfig, EnemyType } from "./types.js";

const liveEnemy: Enemy[] = [];
let nextEnemyId: number = 0;

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
  id: number;
  n: number;
  enemy: HTMLImageElement;
  type: EnemyType;            // 敌机类型标识（替代 speed 判断）
  speed: number;
  lives: number;
  maxLives: number;          // 初始血量（用于血量条比例计算）
  score: number;             // 击毁得分（经过等级缩放）
  hpBarConfig: HpBarConfig;  // 当前敌机的血量条配置
  hitSoundCoolDown: number;  // 受击音效冷却剩余帧数
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
  slowFrames: number;
  slowFactor: number;

  constructor() {
    const hpRatio = getHpRatio();
    const level = getLevel();
    const diffConfig = getDifficultyConfig(getDifficulty());

    // 根据等级调整生成权重和大型敌机概率
    const scaledSmallWeight = Math.max(1, enemyConfig.small.spawnWeight * (1 - enemySpawnScaling.smallWeightDecay * (level - 1)));
    const scaledMediumWeight = enemyConfig.medium.spawnWeight * (1 + enemySpawnScaling.mediumWeightGrowth * (level - 1));
    const scaledBigProbBase = enemyConfig.big.spawnProbBase + enemySpawnScaling.bigProbGrowth * (level - 1);
    const scaledBigProbMax = Math.min(0.2, enemyConfig.big.spawnProbMax + enemySpawnScaling.bigProbGrowth * (level - 1));
    const bigEnemyProb = scaledBigProbBase + (1 - hpRatio) * (scaledBigProbMax - scaledBigProbBase);
    const bigEnemyThreshold = bigEnemyProb * 20;
    const midEnemyThreshold = bigEnemyThreshold + scaledMediumWeight;

    this.id = nextEnemyId++;
    this.n = Math.random() * 20;
    this.speed = 0;
    this.lives = 2;
    this.maxLives = 2;
    this.score = 0;
    this.hpBarConfig = enemyConfig.small.hpBar;
    this.type = "small";
    this.hitSoundCoolDown = 0;

    if (this.n < bigEnemyThreshold && bigEnemyCoolDown === 0) {
      this.enemy = enemy3[0];
      this.type = "big";
      // 难度乘数：speed × 速度乘数，HP × HP乘数，成长系数 × scaling乘数，分数 × HP乘数（与 HP 同比例）
      this.speed = getScaledEnemyStat(enemyConfig.big.speed, enemyConfig.big.scaling.speedScale, level, true) * diffConfig.enemySpeedMultiplier;
      this.lives = getScaledEnemyStat(enemyConfig.big.hp, enemyConfig.big.scaling.hpScale * diffConfig.enemyScalingMultiplier, level) * diffConfig.enemyHpMultiplier;
      this.score = Math.ceil(getScaledEnemyStat(enemyConfig.big.score, enemyConfig.big.scaling.scoreScale * diffConfig.enemyScalingMultiplier, level) * diffConfig.enemyHpMultiplier);
      this.hpBarConfig = enemyConfig.big.hpBar;
      bigEnemyCoolDown = enemyConfig.big.coolDownFrames;
    } else if (this.n < midEnemyThreshold) {
      this.enemy = enemy2[0];
      this.type = "medium";
      this.speed = getScaledEnemyStat(enemyConfig.medium.speed, enemyConfig.medium.scaling.speedScale, level, true) * diffConfig.enemySpeedMultiplier;
      this.lives = getScaledEnemyStat(enemyConfig.medium.hp, enemyConfig.medium.scaling.hpScale * diffConfig.enemyScalingMultiplier, level) * diffConfig.enemyHpMultiplier;
      this.score = Math.ceil(getScaledEnemyStat(enemyConfig.medium.score, enemyConfig.medium.scaling.scoreScale * diffConfig.enemyScalingMultiplier, level) * diffConfig.enemyHpMultiplier);
      this.hpBarConfig = enemyConfig.medium.hpBar;
    } else {
      this.enemy = enemy1[0];
      this.type = "small";
      this.speed = getScaledEnemyStat(enemyConfig.small.speed, enemyConfig.small.scaling.speedScale, level, true) * diffConfig.enemySpeedMultiplier;
      this.lives = getScaledEnemyStat(enemyConfig.small.hp, enemyConfig.small.scaling.hpScale * diffConfig.enemyScalingMultiplier, level) * diffConfig.enemyHpMultiplier;
      this.score = Math.ceil(getScaledEnemyStat(enemyConfig.small.score, enemyConfig.small.scaling.scoreScale * diffConfig.enemyScalingMultiplier, level) * diffConfig.enemyHpMultiplier);
    }
    // HP 取整：确保血量条显示的整数与实际值一致
    this.lives = Math.max(1, Math.ceil(this.lives));
    this.maxLives = this.lives;

    this.x = parseInt(String(Math.random() * (width - this.enemy.width)));
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
    this.slowFrames = 0;
    this.slowFactor = 0;
  }

  _getMoveType(): MoveType {
    if (this.type === "big") {
      return enemyConfig.big.move.type;
    } else if (this.type === "medium") {
      return enemyConfig.medium.move.type;
    }
    return enemyConfig.small.move.type;
  }

  _updateHorizontalPosition(speedMul: number = 1): void {
    if (this.die) return;

    const canvasWidth = width;

    if (this.moveType === "sine") {
      // 正弦摆动只对中型敌机生效，直接使用中型敌机配置
      const config = enemyConfig.medium.move;
      this.movePhase += config.frequency * speedMul;
      this.x = this.originX + config.amplitude * Math.sin(this.movePhase);
      this.x = Math.max(0, Math.min(this.x, canvasWidth - this.width));

    } else if (this.moveType === "zigzag") {
      // 锯齿形移动只对大型敌机生效，直接使用大型敌机配置
      const config = enemyConfig.big.move;
      this.x += config.horizontalSpeed * this.moveDirection * speedMul;
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
    if (this.type === "big") {
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
        if (this.type === "small") {
          this.enemy = enemy1[this.index++];
        } else {
          this.enemy = enemy2[this.index++];
        }
      } else {
        this.removable = true;
      }
    }

    ctx.drawImage(this.enemy, this.x, this.y);

    // 冰冻视觉效果：被减速时覆盖半透明蓝色冰霜 + 冰晶边框
    if (!this.die && this.slowFrames > 0) {
      ctx.save();
      // 半透明蓝色冰霜覆盖
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#8df";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      // 冰晶边框
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = "#bef";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#4af";
      ctx.shadowBlur = 6;
      ctx.strokeRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
      ctx.restore();
    }

    // 受击音效冷却递减
    if (this.hitSoundCoolDown > 0) {
      this.hitSoundCoolDown--;
    }

    // 血量条绘制（存活且配置显示时）
    if (!this.die && this.hpBarConfig.show && this.maxLives > 0) {
      this._drawHpBar();
    }

    // 移动（受减速/冰冻影响）
    const speedMul = this.slowFrames > 0 ? (1 - this.slowFactor) : 1;
    this.y += this.speed * speedMul;
    this._updateHorizontalPosition(speedMul);
    if (this.slowFrames > 0) this.slowFrames--;
    this.hit();

    if (this.y > height) {
      this.removable = true;
    }
  }

  // 绘制血量条：背景 + 前景按比例填充，颜色随血量比例变化
  _drawHpBar(): void {
    const cfg = this.hpBarConfig;
    const ratio = Math.max(0, this.lives / this.maxLives);
    const barX = this.x;
    const barY = this.y + cfg.offsetY;
    const barWidth = this.width;

    // 背景：半透明黑色底条
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(barX, barY, barWidth, cfg.height);

    // 前景：按比例填充，颜色随血量比例选择
    let color: string;
    if (ratio > cfg.midThreshold) {
      color = cfg.colorFull;
    } else if (ratio > cfg.lowThreshold) {
      color = cfg.colorMid;
    } else {
      color = cfg.colorLow;
    }
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barWidth * ratio, cfg.height);

    // 血量数字：在血量条上方显示 "当前HP/最大HP"
    if (cfg.showText) {
      ctx.save();
      ctx.font = `${Math.round(10 * fontScale)}px arial`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 3;
      ctx.fillText(
        `${Math.ceil(this.lives)}/${this.maxLives}`,
        barX + barWidth / 2,
        barY - 2
      );
      ctx.restore();
    }
  }

  hit(): void {
    if (this.die) return;

    const allBullets = Bullet.getAll();
    const buffs: BuffState = getHeroBuffs();
    const damageMultiplier = getBulletDamageWithBuff(buffs.firepower > 0);
    const piercing = hasPiercing();

    // 单帧累积命中伤害：合并为一个伤害文本，避免多弹同时命中产生多个动效导致重叠
    let frameDamage = 0;
    let frameCrit = false;

    for (let i = allBullets.length - 1; i >= 0; i--) {
      const h = allBullets[i];
      if (
        this.x + this.width >= h.mx &&
        h.mx + h.width >= this.x &&
        h.my + h.height >= this.y &&
        this.height + this.y >= h.my
      ) {
        // 穿透子弹：跳过已命中过的敌机
        if (h.piercing && h.hitEnemyIds.has(this.id)) continue;

        // 暴击判定：暴击时伤害翻倍
        let dmg = damageMultiplier;
        const isCrit = Math.random() < getCritChance();
        if (isCrit) {
          dmg *= 2.0;
          frameCrit = true;
        }

        this.lives -= dmg;
        frameDamage += dmg;

        // 穿透子弹记录已命中的敌机
        if (h.piercing) {
          h.hitEnemyIds.add(this.id);
        }

        if (this.lives <= 0) {
          this.die = true;
          addGameScore(this.score);
          addExp(getExpReward(this.type));
          addScoreEffect(this.x + this.width / 2, Math.max(this.y + this.height / 2, Math.round(30 * fontScale)), this.score);
          if (this.type === "big") {
            playEnemyDestroyBig();
            // 击杀 BOSS 增加下次升级的稀有度加成
            addBossKillBonus();
          } else if (this.type === "medium") {
            playEnemyDestroyMedium();
          } else {
            playEnemyDestroySmall();
          }
          this._dropItems();
          // 非穿透子弹标记移除，穿透子弹继续飞行
          if (!h.piercing) h.removable = true;
          break;
        }
        if (!h.piercing) h.removable = true;
      }
    }

    // 单帧命中后未死亡：合并为一个伤害文本（显示总伤害），大幅减少同时存活动效数
    // 配合 ui.addDamageEffect 的"找空槽"算法，彻底解决大型敌机高频命中导致的文本重叠
    if (!this.die && frameDamage > 0) {
      if (this.hitSoundCoolDown === 0) {
        playEnemyHit();
        this.hitSoundCoolDown = hitEffect.soundCoolDown;
      }
      if (hitEffect.damageText.show) {
        // 暴击时使用金色、更大字号
        const critFontSize = frameCrit ? Math.round(hitEffect.damageText.fontSize * 1.5 * fontScale) : Math.round(hitEffect.damageText.fontSize * fontScale);
        const critColor = frameCrit ? "#ffd700" : hitEffect.damageText.color;
        addDamageEffect(
          this.x + this.width / 2,
          this.y + this.height,
          Math.ceil(frameDamage),
          critFontSize,
          critColor,
          Math.round(hitEffect.damageText.floatDistance * fontScale),
          hitEffect.damageText.frames,
          Math.round(hitEffect.damageText.stackOffset * fontScale),
          frameCrit
        );
      }
    }
  }

  _dropItems(): void {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    const hpRatio = getHpRatio();

    if (this.type === "big") {
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

    } else if (this.type === "medium") {
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

  static resetNextId(): void {
    nextEnemyId = 0;
  }

  // 外部伤害接口：特殊武器调用此方法对敌机造成伤害
  // skipHitSound=true 时跳过通用受击音效（由调用方播放专属音效）
  static applyDamage(enemyId: number, damage: number, isCrit: boolean, skipHitSound: boolean = false): void {
    const enemy = liveEnemy.find(e => e.id === enemyId && !e.die);
    if (!enemy) return;

    enemy.lives -= damage;
    if (enemy.lives <= 0) {
      enemy.die = true;
      addGameScore(enemy.score);
      addExp(getExpReward(enemy.type));
      addScoreEffect(enemy.x + enemy.width / 2, Math.max(enemy.y + enemy.height / 2, Math.round(30 * fontScale)), enemy.score);
      if (enemy.type === "big") {
        playEnemyDestroyBig();
        addBossKillBonus();
      } else if (enemy.type === "medium") {
        playEnemyDestroyMedium();
      } else {
        playEnemyDestroySmall();
      }
      enemy._dropItems();
    }

    // 伤害文本
    if (hitEffect.damageText.show) {
      const critFontSize = isCrit ? Math.round(hitEffect.damageText.fontSize * 1.5 * fontScale) : Math.round(hitEffect.damageText.fontSize * fontScale);
      const critColor = isCrit ? "#ffd700" : hitEffect.damageText.color;
      addDamageEffect(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height,
        Math.ceil(damage),
        critFontSize,
        critColor,
        Math.round(hitEffect.damageText.floatDistance * fontScale),
        hitEffect.damageText.frames,
        Math.round(hitEffect.damageText.stackOffset * fontScale),
        isCrit
      );
    }
    // 受击音效（跳过时由调用方播放专属音效）
    if (!skipHitSound && enemy.hitSoundCoolDown === 0) {
      playEnemyHit();
      enemy.hitSoundCoolDown = hitEffect.soundCoolDown;
    }
  }

  // 外部减速/冰冻接口：特殊武器调用此方法对敌机施加减速效果
  static applySlow(enemyId: number, factor: number, frames: number): void {
    const enemy = liveEnemy.find(e => e.id === enemyId && !e.die);
    if (!enemy) return;
    enemy.slowFactor = factor;
    enemy.slowFrames = frames;
  }

  // 获取敌机代理列表（供特殊武器使用，避免直接暴露 liveEnemy）
  static getEnemyProxies(): { id: number; x: number; y: number; width: number; height: number; die: boolean; lives: number; type: string }[] {
    return liveEnemy;
  }
}

export { Enemy };
export default Enemy;
