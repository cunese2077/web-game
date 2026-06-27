// 敌机类
import { ctx } from "./canvas.js";
import { enemy1, enemy2, enemy3 } from "./resources.js";
import Bullet from "./bullet.js";
import { addGameScore } from "./score.js";
import { addExp, getExpReward, getLevelBonuses } from "./level.js";
import { getHeroHp, getHeroMaxHp, getHeroBuffs } from "./hero.js";
import Item from "./item.js";
import { addScoreEffect, addDamageEffect } from "./ui.js";
import { playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig, playEnemyHit } from "./audio.js";
import { enemyConfig, buffConfig, bulletConfig, hitEffect, getDynamicHealDropProb, getDynamicShieldDropProb, getDynamicBigFirepowerDropProb, getDynamicMediumFirepowerDropProb, getDynamicMediumShieldDropProb, getDynamicSpreadDropProb, getDynamicBigEnemySpawnProb, } from "./config.js";
const liveEnemy = [];
let bigEnemyCoolDown = 0;
function tickCoolDown() {
    if (bigEnemyCoolDown > 0)
        bigEnemyCoolDown--;
}
function getHpRatio() {
    const hp = getHeroHp();
    const maxHp = getHeroMaxHp();
    return maxHp > 0 ? hp / maxHp : 1;
}
class Enemy {
    constructor() {
        const hpRatio = getHpRatio();
        const bigEnemyProb = getDynamicBigEnemySpawnProb(hpRatio);
        const bigEnemyThreshold = bigEnemyProb * 20;
        const midEnemyThreshold = bigEnemyThreshold + enemyConfig.medium.spawnWeight;
        this.n = Math.random() * 20;
        this.enemy = new Image();
        this.speed = 0;
        this.lives = 2;
        this.maxLives = 2;
        this.hpBarConfig = enemyConfig.small.hpBar;
        this.hitSoundCoolDown = 0;
        if (this.n < bigEnemyThreshold && bigEnemyCoolDown === 0) {
            this.enemy = enemy3[0];
            this.speed = enemyConfig.big.speed;
            this.lives = enemyConfig.big.hp;
            this.hpBarConfig = enemyConfig.big.hpBar;
            bigEnemyCoolDown = enemyConfig.big.coolDownFrames;
        }
        else if (this.n < midEnemyThreshold) {
            this.enemy = enemy2[0];
            this.speed = enemyConfig.medium.speed;
            this.lives = enemyConfig.medium.hp;
            this.hpBarConfig = enemyConfig.medium.hpBar;
        }
        else {
            this.enemy = enemy1[0];
            this.speed = enemyConfig.small.speed;
        }
        this.maxLives = this.lives;
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
    _getMoveType() {
        if (this.speed === enemyConfig.big.speed) {
            return enemyConfig.big.move.type;
        }
        else if (this.speed === enemyConfig.medium.speed) {
            return enemyConfig.medium.move.type;
        }
        return enemyConfig.small.move.type;
    }
    _updateHorizontalPosition() {
        if (this.die)
            return;
        const canvasWidth = ctx.canvas.width;
        if (this.moveType === "sine") {
            // 正弦摆动只对中型敌机生效，直接使用中型敌机配置
            const config = enemyConfig.medium.move;
            this.movePhase += config.frequency;
            this.x = this.originX + config.amplitude * Math.sin(this.movePhase);
            this.x = Math.max(0, Math.min(this.x, canvasWidth - this.width));
        }
        else if (this.moveType === "zigzag") {
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
    draw() {
        if (this.speed === enemyConfig.big.speed) {
            if (this.die) {
                if (this.index < 2) {
                    this.index = 3;
                }
                if (this.index < enemy3.length) {
                    this.enemy = enemy3[this.index++];
                }
                else {
                    this.removable = true;
                }
            }
            else {
                this.enemy = enemy3[this.index];
                this.index === 0 ? (this.index = 1) : (this.index = 0);
            }
        }
        else if (this.die) {
            if (this.index < enemy1.length) {
                if (this.speed === enemyConfig.small.speed) {
                    this.enemy = enemy1[this.index++];
                }
                else {
                    this.enemy = enemy2[this.index++];
                }
            }
            else {
                this.removable = true;
            }
        }
        ctx.drawImage(this.enemy, this.x, this.y);
        // 受击音效冷却递减
        if (this.hitSoundCoolDown > 0) {
            this.hitSoundCoolDown--;
        }
        // 血量条绘制（存活且配置显示时）
        if (!this.die && this.hpBarConfig.show && this.maxLives > 0) {
            this._drawHpBar();
        }
        this.y += this.speed;
        this._updateHorizontalPosition();
        this.hit();
        if (this.y > ctx.canvas.height) {
            this.removable = true;
        }
    }
    // 绘制血量条：背景 + 前景按比例填充，颜色随血量比例变化
    _drawHpBar() {
        const cfg = this.hpBarConfig;
        const ratio = Math.max(0, this.lives / this.maxLives);
        const barX = this.x;
        const barY = this.y + cfg.offsetY;
        const barWidth = this.width;
        // 背景：半透明黑色底条
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(barX, barY, barWidth, cfg.height);
        // 前景：按比例填充，颜色随血量比例选择
        let color;
        if (ratio > cfg.midThreshold) {
            color = cfg.colorFull;
        }
        else if (ratio > cfg.lowThreshold) {
            color = cfg.colorMid;
        }
        else {
            color = cfg.colorLow;
        }
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, barWidth * ratio, cfg.height);
        // 血量数字：在血量条上方显示 "当前HP/最大HP"
        if (cfg.showText) {
            ctx.save();
            ctx.font = "10px arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "#fff";
            ctx.shadowColor = "#000";
            ctx.shadowBlur = 3;
            ctx.fillText(`${Math.ceil(this.lives)}/${this.maxLives}`, barX + barWidth / 2, barY - 2);
            ctx.restore();
        }
    }
    hit() {
        if (this.die)
            return;
        const allBullets = Bullet.getAll();
        const buffs = getHeroBuffs();
        const levelBonuses = getLevelBonuses();
        const baseDamage = bulletConfig.baseDamage + levelBonuses.extraDamage;
        const damageMultiplier = baseDamage * (buffs.firepower > 0 ? buffConfig.firepower.damageMultiplier : 1);
        // 单帧累积命中伤害：合并为一个伤害文本，避免多弹同时命中产生多个动效导致重叠
        let frameDamage = 0;
        for (let i = allBullets.length - 1; i >= 0; i--) {
            const h = allBullets[i];
            if (this.x + this.width >= h.mx &&
                h.mx + h.width >= this.x &&
                h.my + h.height >= this.y &&
                this.height + this.y >= h.my) {
                this.lives -= damageMultiplier;
                frameDamage += damageMultiplier;
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
                    }
                    else if (this.speed === enemyConfig.medium.speed) {
                        playEnemyDestroyMedium();
                    }
                    else {
                        playEnemyDestroySmall();
                    }
                    this._dropItems();
                    h.removable = true;
                    break;
                }
                h.removable = true;
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
                addDamageEffect(this.x + this.width / 2, this.y + this.height, Math.ceil(frameDamage), hitEffect.damageText.fontSize, hitEffect.damageText.color, hitEffect.damageText.floatDistance, hitEffect.damageText.frames, hitEffect.damageText.stackOffset);
            }
        }
    }
    _dropItems() {
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
            }
            else if (rand < shieldProb + healProb) {
                Item.add(cx, cy, "heal");
            }
            else if (rand < shieldProb + healProb + firepowerProb) {
                Item.add(cx, cy, "firepower");
            }
        }
        else if (this.speed === enemyConfig.medium.speed) {
            const shieldProb = getDynamicMediumShieldDropProb(hpRatio);
            const firepowerProb = getDynamicMediumFirepowerDropProb(hpRatio);
            const spreadProb = getDynamicSpreadDropProb(hpRatio);
            const rand = Math.random();
            if (rand < shieldProb) {
                Item.add(cx, cy, "shield");
            }
            else if (rand < shieldProb + firepowerProb) {
                Item.add(cx, cy, "firepower");
            }
            else if (rand < shieldProb + firepowerProb + spreadProb) {
                Item.add(cx, cy, "spread");
            }
        }
    }
    static drawEnemy() {
        tickCoolDown();
        for (let i = liveEnemy.length - 1; i >= 0; i--) {
            if (liveEnemy[i].removable) {
                liveEnemy.splice(i, 1);
            }
            else {
                liveEnemy[i].draw();
            }
        }
    }
    static add(enemy) {
        liveEnemy.push(enemy);
    }
    static getAll() {
        return liveEnemy;
    }
    static clear() {
        liveEnemy.length = 0;
    }
}
export { Enemy };
export default Enemy;
