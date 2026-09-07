// 玩家实体模块（从 hero.ts 拆出）：Hero 类核心——构造/主循环/射击/buff/升级/碰撞
// HUD 与特效绘制调用 heroHud/heroEffects 函数，输入绑定调用 heroInput，单例注册调用 heroState
import { ctx, width, height } from "./canvas.js";
import { heroImg } from "./resources.js";
import { PHASE_DOWNLOAD, PHASE_PLAY, PHASE_PAUSE, PHASE_GAME_OVER, PHASE_LEVEL_UP, PHASE_BOSS, PHASE_BOSS_WARNING } from "./constants.js";
import { bossConfig, heroConfig, buffConfig, itemConfig, getDifficultyConfig, getCollisionDamage } from "./config.js";
import Bullet from "./bullet.js";
import Enemy from "./enemy.js";
import Item from "./item.js";
import { playHit, playHeal, playFirepower, playShield, playSpread, playLevelUp } from "./audio.js";
import { getDifficulty } from "./settings.js";
import { isGodMode } from "./debug.js";
import { getLevel } from "./level.js";
import { getActiveBoss } from "./boss.js";
import { getBullets } from "./enemyBullet.js";
import { t } from "./i18n.js";
import {
  addPendingLevelUps,
  getPendingLevelUps,
  getBulletCount,
  getBulletInterval,
  getMaxHp,
  hasPiercing,
  startUpgradeSelection,
  getArmorReduction,
  hasDoomBarrage,
  hasQuantumAnnihilate,
  hasAnnihilateSquad,
  hasThunderPierce,
  hasWolfPack,
  hasPrismArray,
} from "./upgrade.js";
import { setActiveHero } from "./heroState.js";
import { bindEventsOnce } from "./heroInput.js";
import { drawScore, drawLevel, drawHp, drawBuffs, drawStats } from "./heroHud.js";
import { drawShieldAura, drawEvolutionAura, drawBuffFloats, drawHealEffect, drawLevelUpEffect } from "./heroEffects.js";
import type { GamePhase, BuffState, BuffFloat, ItemType } from "./types.js";

class Hero {
  x: number;
  y: number;
  index: number;
  count: number;
  hCount: number;
  eCount: number;
  maxHp: number;
  hp: number;
  invincible: number;
  dying: boolean;
  healAnim: number;
  hpFlash: number;
  damageTaken: number;
  buffs: BuffState;
  buffFloats: BuffFloat[];
  levelUpAnim: number;  // 升级特效剩余帧数
  lastLevel: number;    // 上一帧的等级，用于检测升级
  _getCurrentPhase: () => GamePhase;
  _setCurrentPhase: (phase: GamePhase) => void;

  constructor() {
    this.x = (width - heroImg[0].width) / 2;
    this.y = height - heroImg[0].height;
    this.index = 0;
    this.count = 0;
    this.hCount = 0;
    this.eCount = 0;
    this.maxHp = getMaxHp();
    this.hp = this.maxHp;
    this.invincible = 0;
    this.dying = false;
    this.healAnim = 0;
    this.hpFlash = 0;
    this.damageTaken = 0;
    this.buffs = {
      firepower: 0,
      shield: 0,
      spread: 0,
    };
    this.buffFloats = [];
    this.levelUpAnim = 0;
    this.lastLevel = getLevel();
    this._getCurrentPhase = () => PHASE_DOWNLOAD;
    this._setCurrentPhase = () => {};

    setActiveHero(this); // 模块级单例引用，事件回调与查询访问器依赖
    bindEventsOnce();
  }

  draw(curPhase: GamePhase): GamePhase {
    this.count++;

    if (this.dying) {
      this.index++;
      if (this.index >= heroImg.length) {
        this._setCurrentPhase(PHASE_GAME_OVER);
        this.index = heroImg.length - 1;
      }
      ctx.drawImage(heroImg[this.index], this.x, this.y);
      drawScore();
      drawHp(this);
      return this._getCurrentPhase();
    }

    if (this.invincible > 0) {
      this.invincible--;
    }

    // 更新 maxHp（升级选择可能改变了被动层数）
    this.maxHp = getMaxHp();
    // 确保 hp 不超过 maxHp
    if (this.hp > this.maxHp) this.hp = this.maxHp;

    if (curPhase !== PHASE_LEVEL_UP && curPhase !== PHASE_PAUSE) {
      this._tickBuffs();
      // BOSS 预警/战斗期间延迟升级选择，避免抢夺阶段控制权
      if (curPhase !== PHASE_BOSS_WARNING && curPhase !== PHASE_BOSS) {
        this._checkLevelUp();
      }
      this.hit();
    }

    if (this.count % 3 === 0 && this.index <= 1) {
      this.index = this.index === 0 ? 1 : 0;
      this.count = 0;
    }

    if (this.invincible > 0 && this.invincible % 4 < 2) {
      // 不绘制战机，产生闪烁
    } else {
      ctx.drawImage(heroImg[this.index], this.x, this.y);
    }

    if (this.buffs.shield > 0) {
      drawShieldAura(this);
    }

    // 进化光环：持有进化超武时显示专属紫色光环
    if (hasDoomBarrage() || hasQuantumAnnihilate() || hasAnnihilateSquad() || hasThunderPierce() || hasWolfPack() || hasPrismArray()) {
      drawEvolutionAura(this);
    }

    drawScore();
    drawLevel();
    drawHp(this);
    drawBuffs(this);
    drawBuffFloats(this);
    drawStats(this);

    if (!this.dying && curPhase !== PHASE_PAUSE) {
      const pickedTypes = Item.checkCollision(this.x, this.y, heroImg[0].width, heroImg[0].height);
      this._handleItemPickup(pickedTypes);
    }

    if (this.healAnim > 0) {
      drawHealEffect(this);
      this.healAnim--;
    }

    if (this.levelUpAnim > 0) {
      drawLevelUpEffect(this);
      this.levelUpAnim--;
    }

    // 射击逻辑：由升级状态驱动，升级选择时暂停
    if (curPhase === PHASE_PLAY || curPhase === PHASE_BOSS_WARNING || curPhase === PHASE_BOSS) {
      this.hCount++;
      const bulletInterval = getBulletInterval();
      if (this.hCount % bulletInterval === 0) {
        this._shoot();
        this.hCount = 0;
      }

      this.eCount++;
      const diffConfig = getDifficultyConfig(getDifficulty());
      let spawnInterval = Math.max(1, Math.round(heroConfig.enemySpawnInterval * diffConfig.enemySpawnRateMultiplier));
      // BOSS 战期间使用固定生成间隔
      if (curPhase === PHASE_BOSS) {
        spawnInterval = bossConfig.enemySpawnRate;
      }
      if (this.eCount % spawnInterval === 0) {
        Enemy.add(new Enemy());
        this.eCount = 0;
      }
    }

    return this._getCurrentPhase();
  }

  // 射击：根据当前武器等级生成子弹
  _shoot(): void {
    const bulletCount = getBulletCount();
    const isSpread = this.buffs.spread > 0;
    const heroW = heroImg[0].width;
    const heroH = heroImg[0].height;
    const piercing = hasPiercing();

    if (isSpread) {
      // 散弹 buff：扇形发射，子弹数取 getBulletCount() 和散弹配置的较大值
      // 低等级时散弹配置(5) > 当前子弹数(3)，散射增加子弹；高等级/弹幕风暴时不会减少
      const spreadBulletCount = Math.max(bulletCount, buffConfig.spread.bulletCount);
      const spreadWidth = 48; // 最外侧子弹距中心的像素偏移
      const step = spreadBulletCount > 1 ? (spreadWidth * 2) / (spreadBulletCount - 1) : 0;
      const startOffset = -spreadWidth;
      for (let i = 0; i < spreadBulletCount; i++) {
        const offset = spreadBulletCount === 1 ? 0 : startOffset + step * i;
        const isDiagonal = i === 0 || i === spreadBulletCount - 1;
        Bullet.add(Bullet.spawn(offset, this.x, this.y, heroW, heroH, isDiagonal, piercing));
      }
    } else {
      // 正常射击：根据武器等级决定子弹数和间距
      const spreadWidth = 32; // 最外侧子弹距中心的像素偏移
      const step = bulletCount > 1 ? (spreadWidth * 2) / (bulletCount - 1) : 0;
      const startOffset = -spreadWidth;
      for (let i = 0; i < bulletCount; i++) {
        const offset = bulletCount === 1 ? 0 : startOffset + step * i;
        const isDiagonal = i === 0 || i === bulletCount - 1;
        Bullet.add(Bullet.spawn(offset, this.x, this.y, heroW, heroH, isDiagonal, piercing));
      }
    }
  }

  _tickBuffs(): void {
    const keys: (keyof BuffState)[] = ["firepower", "shield", "spread"];
    for (const key of keys) {
      if (this.buffs[key] > 0) {
        this.buffs[key]--;
      }
    }
  }

  _handleItemPickup(pickedTypes: ItemType[]): void {
    for (const type of pickedTypes) {
      switch (type) {
        case "heal":
          if (this.hp < this.maxHp) {
            this.hp = Math.min(this.hp + 1, this.maxHp);
            this.healAnim = 30;
            this.hpFlash = 30;
            playHeal();
          }
          break;
        case "firepower":
          this.buffs.firepower = buffConfig.firepower.duration;
          this._addBuffFloat(t(itemConfig.types.firepower.label), itemConfig.types.firepower.color);
          playFirepower();
          break;
        case "shield":
          this.buffs.shield = buffConfig.shield.duration;
          this._addBuffFloat(t(itemConfig.types.shield.label), itemConfig.types.shield.color);
          playShield();
          break;
        case "spread":
          this.buffs.spread = buffConfig.spread.duration;
          this._addBuffFloat(t(itemConfig.types.spread.label), itemConfig.types.spread.color);
          playSpread();
          break;
      }
    }
  }

  _addBuffFloat(text: string, color: string): void {
    this.buffFloats.push({ text, color, frame: 30, maxFrame: 30 });
  }

  _checkLevelUp(): void {
    const currentLevel = getLevel();
    if (currentLevel > this.lastLevel) {
      const levelsGained = currentLevel - this.lastLevel;
      this.lastLevel = currentLevel;

      // 累加待处理升级次数
      addPendingLevelUps(levelsGained);

      // 每级升级回血 1 HP（不超过 maxHp）
      this.maxHp = getMaxHp();
      this.hp = Math.min(this.hp + levelsGained, this.maxHp);

      // 升级特效
      this.levelUpAnim = 60;
      this.hpFlash = 20;
      playLevelUp();

      // 进入升级选择阶段
      const hasOffers = startUpgradeSelection();
      if (hasOffers) {
        this._setCurrentPhase(PHASE_LEVEL_UP);
      } else {
        // 无可用选项（极端情况），跳过升级选择
        addPendingLevelUps(-getPendingLevelUps());
      }
    }
  }

  hit(): void {
    if (this.dying || this.invincible > 0) return;
    if (isGodMode()) return;

    const enemies = Enemy.getAll();
    for (let i = 0; i < enemies.length; i++) {
      const d = enemies[i];
      if (d.die) continue;

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
        if (this.buffs.shield > 0) {
          this.buffs.shield = 0;
          this.invincible = buffConfig.shield.invincibleFrames;
          break;
        }

        // 碰撞伤害：基础值按敌机类型分级 × 难度乘数，再减护甲
        const diffConfig = getDifficultyConfig(getDifficulty());
        const baseDmg = getCollisionDamage(d.type);
        const finalDmg = Math.max(1, Math.round(baseDmg * diffConfig.enemyDamageMultiplier) - getArmorReduction());
        this.hp -= finalDmg;
        this.damageTaken++;
        playHit();
        if (this.hp <= 0) {
          this.hp = 0;
          this.dying = true;
          this.index = 2;
        } else {
          this.invincible = heroConfig.invincibleFrames;
        }
        break;
      }
    }

    // BOSS 碰撞检测
    const boss = getActiveBoss();
    if (boss && boss.alive) {
      const bounds = boss.getBounds();
      const hw = heroImg[0].width;
      const hh = heroImg[0].height;
      if (this.x < bounds.right && this.x + hw > bounds.left &&
          this.y < bounds.bottom && this.y + hh > bounds.top) {
        if (this.buffs.shield > 0) {
          this.buffs.shield = 0;
          this.invincible = buffConfig.shield.invincibleFrames;
        } else if (this.invincible <= 0) {
          const diffConfig = getDifficultyConfig(getDifficulty());
          const bossDmg = Math.max(1, Math.round(3 * diffConfig.enemyDamageMultiplier) - getArmorReduction());
          this.hp -= bossDmg;
          this.damageTaken++;
          playHit();
          if (this.hp <= 0) { this.hp = 0; this.dying = true; this.index = 2; }
          else { this.invincible = heroConfig.invincibleFrames; }
        }
      }
    }

    // 敌机弹幕碰撞检测
    const enemyBullets = getBullets();
    const hw = heroImg[0].width;
    const hh = heroImg[0].height;
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      const dx = this.x + hw / 2 - b.x;
      const dy = this.y + hh / 2 - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < b.size + Math.max(hw, hh) / 2 * 0.5) {
        if (this.buffs.shield > 0) {
          this.buffs.shield = 0;
          this.invincible = buffConfig.shield.invincibleFrames;
          b.removable = true;
        } else if (this.invincible <= 0) {
          const diffConfig = getDifficultyConfig(getDifficulty());
          const bulletDmg = Math.max(1, Math.round(1 * diffConfig.enemyDamageMultiplier));
          this.hp -= bulletDmg;
          this.damageTaken++;
          playHit();
          b.removable = true;
          if (this.hp <= 0) { this.hp = 0; this.dying = true; this.index = 2; }
          else { this.invincible = heroConfig.invincibleFrames; }
        }
      }
    }
  }

  setPhaseCallbacks(getter: () => GamePhase, setter: (phase: GamePhase) => void): void {
    this._getCurrentPhase = getter;
    this._setCurrentPhase = setter;
  }
}

export default Hero;
export { Hero };
