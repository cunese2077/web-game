// 玩家战机类
import { ctx, canvas, width, height, fontScale } from "./canvas.js";
import { heroImg } from "./resources.js";
import { PHASE_DOWNLOAD, PHASE_PLAY, PHASE_PAUSE, PHASE_GAME_OVER } from "./constants.js";
import Bullet from "./bullet.js";
import Enemy from "./enemy.js";
import Item from "./item.js";
import { playHit, playHeal, playFirepower, playShield, playSpread, playLevelUp } from "./audio.js";
import { getGameScore } from "./score.js";
import { getLevel, getExp, getExpToNext, getLevelBonuses, addExp, resetLevel } from "./level.js";
import { buffConfig, heroConfig, itemConfig, bulletConfig } from "./config.js";
import { t } from "./i18n.js";
import type { GamePhase, BuffState, BuffFloat, ItemType, LevelBonuses } from "./types.js";

let activeHero: Hero | null = null;
let eventsBound: boolean = false;

function bindEventsOnce(): void {
  if (eventsBound) return;
  eventsBound = true;

  const move = (e: MouseEvent | TouchEvent): void => {
    if (!activeHero) return;
    const curPhase = activeHero._getCurrentPhase();
    if (curPhase === PHASE_PLAY || curPhase === PHASE_PAUSE) {
      activeHero._setCurrentPhase(PHASE_PLAY);
      const offsetX = e instanceof MouseEvent ? e.offsetX : e.touches[0].pageX;
      const offsetY = e instanceof MouseEvent ? e.offsetY : e.touches[0].pageY;
      const w = heroImg[0].width;
      const h = heroImg[0].height;
      let nx = offsetX - w / 2;
      let ny = offsetY - h / 2;
      if (nx < 20 - w / 2) nx = 20 - w / 2;
      else if (nx > width - w / 2 - 20) nx = width - w / 2 - 20;
      if (ny < 0) ny = 0;
      else if (ny > height - h / 2) ny = height - h / 2;
      activeHero.x = nx;
      activeHero.y = ny;
      activeHero.count = 2;
    }
  };

  canvas.addEventListener("mousemove", move as EventListener, false);
  canvas.addEventListener("touchmove", move as EventListener, false);

  canvas.onmouseout = (): void => {
    if (!activeHero) return;
    if (activeHero._getCurrentPhase() === PHASE_PLAY) {
      activeHero._setCurrentPhase(PHASE_PAUSE);
    }
  };

  // 画布尺寸变化时，将战机位置限制在新边界内
  // 边界规则与 move 处理器一致：左右各留 20px 内缩、上下贴边
  // 直接读取 canvas.width/height（resize 后已由 canvas.ts 更新）
  window.addEventListener("resize", (): void => {
    if (!activeHero) return;
    const w = width;
    const h = height;
    const hw = heroImg[0].width;
    const hh = heroImg[0].height;
    if (activeHero.x < 20 - hw / 2) activeHero.x = 20 - hw / 2;
    else if (activeHero.x > w - hw / 2 - 20) activeHero.x = w - hw / 2 - 20;
    if (activeHero.y < 0) activeHero.y = 0;
    else if (activeHero.y > h - hh / 2) activeHero.y = h - hh / 2;
  });
}

class Hero {
  x: number;
  y: number;
  index: number;
  count: number;
  hCount: number;
  eCount: number;
  n: number;
  maxHp: number;
  hp: number;
  invincible: number;
  dying: boolean;
  healAnim: number;
  hpFlash: number;
  buffs: BuffState;
  buffFloats: BuffFloat[];
  levelBonuses: LevelBonuses;
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
    this.n = 0;
    this.levelBonuses = getLevelBonuses();
    this.maxHp = heroConfig.maxHp + this.levelBonuses.extraHp;
    this.hp = this.maxHp;
    this.invincible = 0;
    this.dying = false;
    this.healAnim = 0;
    this.hpFlash = 0;
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

    activeHero = this;
    bindEventsOnce();
  }

  draw(curPhase: GamePhase): GamePhase {
    this.count++;

    if (this.dying) {
      this.index++;
      if (this.index >= heroImg.length) {
        curPhase = PHASE_GAME_OVER;
        this.index = heroImg.length - 1;
      }
      ctx.drawImage(heroImg[this.index], this.x, this.y);
      this._drawScore();
      this._drawHp();
      return curPhase;
    }

    if (this.invincible > 0) {
      this.invincible--;
    }

    this._tickBuffs();
    this._checkLevelUp();
    this.hit();

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
      this._drawShieldAura();
    }

    this._drawScore();
    this._drawLevel();
    this._drawHp();
    this._drawBuffs();
    this._drawBuffFloats();
    this._drawStats();

    if (!this.dying) {
      const pickedTypes = Item.checkCollision(this.x, this.y, heroImg[0].width, heroImg[0].height);
      this._handleItemPickup(pickedTypes);
    }

    if (this.healAnim > 0) {
      this._drawHealEffect();
      this.healAnim--;
    }

    if (this.levelUpAnim > 0) {
      this._drawLevelUpEffect();
      this.levelUpAnim--;
    }

    this.hCount++;
    const bulletInterval = Math.max(1, Math.floor(3 - this.levelBonuses.bulletIntervalReduction));
    if (this.hCount % bulletInterval === 0) {
      const isSpread = this.buffs.spread > 0;
      if (isSpread) {
        Bullet.add(new Bullet(-48, this.x, this.y, heroImg[0].width, heroImg[0].height, true));
        Bullet.add(new Bullet(-24, this.x, this.y, heroImg[0].width, heroImg[0].height));
        Bullet.add(new Bullet(0, this.x, this.y, heroImg[0].width, heroImg[0].height));
        Bullet.add(new Bullet(24, this.x, this.y, heroImg[0].width, heroImg[0].height));
        Bullet.add(new Bullet(48, this.x, this.y, heroImg[0].width, heroImg[0].height, true));
      } else {
        this.n === 32 && (this.n = 0);
        Bullet.add(new Bullet(this.n, this.x, this.y, heroImg[0].width, heroImg[0].height));
        this.n === 0 && (this.n = -32);
        Bullet.add(new Bullet(this.n, this.x, this.y, heroImg[0].width, heroImg[0].height));
        this.n === -32 && (this.n = 32);
        Bullet.add(new Bullet(this.n, this.x, this.y, heroImg[0].width, heroImg[0].height));
      }
      this.hCount = 0;
    }

    this.eCount++;
    if (this.eCount % 8 === 0) {
      Enemy.add(new Enemy());
      this.eCount = 0;
    }

    return curPhase;
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

  _drawBuffFloats(): void {
    const heroCx = this.x + heroImg[0].width / 2;
    const heroCy = this.y + heroImg[0].height / 2;

    for (let i = this.buffFloats.length - 1; i >= 0; i--) {
      const bf = this.buffFloats[i];
      bf.frame--;
      if (bf.frame <= 0) {
        this.buffFloats.splice(i, 1);
        continue;
      }
      const progress = 1 - bf.frame / bf.maxFrame;
      const floatY = heroCy - 30 - progress * 50;
      const alpha = 1 - progress;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = bf.color;
      ctx.font = `bold ${Math.round(24 * fontScale)}px arial`;
      ctx.textAlign = "center";
      ctx.shadowColor = bf.color;
      ctx.shadowBlur = 10;
      ctx.fillText(bf.text, heroCx, floatY);
      ctx.restore();
    }
  }

  _drawShieldAura(): void {
    const cx = this.x + heroImg[0].width / 2;
    const cy = this.y + heroImg[0].height / 2;
    const radius = Math.max(heroImg[0].width, heroImg[0].height) * 0.6;
    const alpha = 0.3 + Math.sin(this.count * 0.15) * 0.15;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#4af";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  }

  _drawBuffs(): void {
    const barWidth = Math.round(150 * fontScale);
    const barHeight = Math.round(8 * fontScale);
    const baseX = width - barWidth - Math.round(10 * fontScale);
    // baseY 是第一个 buff 条的顶部 y 坐标
    // 计算：画布底部 → 减去 HP 条底部间距(10*fs) → 减去 HP 条高度(12*fs) = HP 条顶部
    // → 减去 buff 与 HP 条间距(6*fs) → 减去 buff 条高度(8*fs) = 第一个 buff 条顶部
    const baseY = height - Math.round((10 + 12 + 6 + 8) * fontScale);

    const activeBuffs: (keyof BuffState)[] = [];
    if (this.buffs.firepower > 0) activeBuffs.push("firepower");
    if (this.buffs.shield > 0) activeBuffs.push("shield");
    if (this.buffs.spread > 0) activeBuffs.push("spread");

    for (let i = 0; i < activeBuffs.length; i++) {
      const key = activeBuffs[i];
      const cfg = buffConfig[key];
      const y = baseY - i * (barHeight + Math.round(4 * fontScale));
      const ratio = this.buffs[key] / cfg.duration;

      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(baseX, y, barWidth, barHeight);

      ctx.fillStyle = cfg.color;
      ctx.fillRect(baseX, y, barWidth * ratio, barHeight);

      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(baseX, y, barWidth, barHeight);

      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.round(8 * fontScale)}px arial`;
      ctx.textAlign = "left";
      ctx.fillText(t(cfg.label), baseX + Math.round(3 * fontScale), y + barHeight - Math.round(1 * fontScale));
      // 剩余时间：帧数 ÷ 20fps = 秒数，显示一位小数
      ctx.textAlign = "right";
      ctx.fillText((this.buffs[key] / 20).toFixed(1) + "s", baseX + barWidth - Math.round(3 * fontScale), y + barHeight - Math.round(1 * fontScale));
    }
    ctx.textAlign = "left";
  }

  // 属性面板：左下角常驻显示玩家核心属性（子弹伤害、射击间隔、buff 持续倍率）
  // 与右下 HP 条对称，半透明黑底圆角矩形避免遮挡游戏画面
  // 升级瞬间（levelUpAnim > 0）面板边框高亮，强化成长反馈
  _drawStats(): void {
    // 计算当前属性值（与 enemy.ts hit() 和 draw() 中的逻辑一致）
    const baseDamage = bulletConfig.baseDamage + this.levelBonuses.extraDamage;
    const hasFirepower = this.buffs.firepower > 0;
    const currentDamage = baseDamage * (hasFirepower ? buffConfig.firepower.damageMultiplier : 1);
    const bulletInterval = Math.max(1, Math.floor(3 - this.levelBonuses.bulletIntervalReduction));
    const buffMul = this.levelBonuses.buffDurationMultiplier;

    // 面板布局（按 fontScale 等比缩放，确保大屏设备上面板和文字比例协调）
    const padding = Math.round(6 * fontScale);
    const lineH = Math.round(14 * fontScale);
    const panelW = Math.round(92 * fontScale);
    const showBuffLine = buffMul > 1;
    const lineCount = showBuffLine ? 3 : 2;
    const panelH = lineCount * lineH + padding * 2;
    const panelX = Math.round(10 * fontScale);
    const panelY = height - panelH - Math.round(10 * fontScale);

    // 升级高亮：边框颜色和透明度
    const isLevelUp = this.levelUpAnim > 0;
    const borderColor = isLevelUp ? "#fd0" : "rgba(255,255,255,0.4)";
    const bgAlpha = isLevelUp ? 0.55 : 0.35;

    // 半透明黑底圆角矩形
    ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
    ctx.beginPath();
    const r = Math.round(4 * fontScale);
    ctx.moveTo(panelX + r, panelY);
    ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + panelH, r);
    ctx.arcTo(panelX + panelW, panelY + panelH, panelX, panelY + panelH, r);
    ctx.arcTo(panelX, panelY + panelH, panelX, panelY, r);
    ctx.arcTo(panelX, panelY, panelX + panelW, panelY, r);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 文字内容
    ctx.font = `bold ${Math.round(11 * fontScale)}px arial`;
    ctx.textAlign = "left";

    let lineY = panelY + padding + Math.round(10 * fontScale);
    const labelX = panelX + padding;
    const valueX = panelX + panelW - padding;

    // ATK 伤害：火力 buff 激活时高亮橙色
    ctx.textAlign = "left";
    ctx.fillStyle = hasFirepower ? "#f80" : "#fd0";
    ctx.fillText(t("hud.atk"), labelX, lineY);
    ctx.textAlign = "right";
    ctx.fillStyle = hasFirepower ? "#f80" : "#fff";
    ctx.fillText(currentDamage.toFixed(2), valueX, lineY);
    lineY += lineH;

    // RATE 射击间隔：越小越快
    ctx.textAlign = "left";
    ctx.fillStyle = "#9cf";
    ctx.fillText(t("hud.rate"), labelX, lineY);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.fillText(String(bulletInterval), valueX, lineY);
    lineY += lineH;

    // BUFF 持续倍率：仅 > 1 时显示
    if (showBuffLine) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#f6f";
      ctx.fillText(t("hud.buff"), labelX, lineY);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.fillText("×" + buffMul.toFixed(2), valueX, lineY);
    }

    ctx.textAlign = "left";
  }

  _drawScore(): void {
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(20 * fontScale)}px arial`;
    ctx.fillText(t("hud.score") + getGameScore(), Math.round(10 * fontScale), Math.round(30 * fontScale));
  }

  _drawLevel(): void {
    const lv = getLevel();
    const exp = getExp();
    const expNext = getExpToNext();
    const isMaxLevel = lv >= 30;

    // 等级文字
    ctx.fillStyle = "#fd0";
    ctx.font = `bold ${Math.round(16 * fontScale)}px arial`;
    ctx.textAlign = "right";
    ctx.fillText(t("hud.level") + lv, width - Math.round(10 * fontScale), Math.round(20 * fontScale));

    // 经验条
    const barWidth = Math.round(110 * fontScale);
    const barHeight = Math.round(10 * fontScale);
    const barX = width - barWidth - Math.round(10 * fontScale);
    const barY = Math.round(26 * fontScale);

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const ratio = isMaxLevel ? 1 : (expNext > 0 ? exp / expNext : 0);
    ctx.fillStyle = isMaxLevel ? "#f0f" : "#fd0";
    ctx.fillRect(barX, barY, barWidth * ratio, barHeight);

    ctx.strokeStyle = "#fd0";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // 经验数值
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(9 * fontScale)}px arial`;
    ctx.textAlign = "center";
    if (isMaxLevel) {
      ctx.fillText(t("hud.max"), barX + barWidth / 2, barY + barHeight - Math.round(1 * fontScale));
    } else {
      ctx.fillText(exp + "/" + expNext, barX + barWidth / 2, barY + barHeight - Math.round(1 * fontScale));
    }
    ctx.textAlign = "left";
  }

  _checkLevelUp(): void {
    const currentLevel = getLevel();
    if (currentLevel > this.lastLevel) {
      // 连续升多级时，计算实际升级次数
      const levelsGained = currentLevel - this.lastLevel;
      this.lastLevel = currentLevel;
      this.levelBonuses = getLevelBonuses();

      // 更新 maxHp（按当前等级的累计 HP 加成）
      this.maxHp = heroConfig.maxHp + this.levelBonuses.extraHp;

      // 每级升级回血 1 HP，连续升多级时累计回血（不超过 maxHp）
      this.hp = Math.min(this.hp + levelsGained, this.maxHp);

      // 升级特效
      this.levelUpAnim = 60;
      this.hpFlash = 20;
      playLevelUp();
    }
  }

  _drawHp(): void {
    const barWidth = Math.round(150 * fontScale);
    const barHeight = Math.round(12 * fontScale);
    const x = width - barWidth - Math.round(10 * fontScale);
    const y = height - barHeight - Math.round(10 * fontScale);

    if (this.hpFlash > 0) {
      this.hpFlash--;
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const ratio = this.hp / this.maxHp;
    if (this.hpFlash > 0 && this.hpFlash % 6 < 3) {
      ctx.fillStyle = "#fff";
    } else {
      ctx.fillStyle = ratio > 0.5 ? "#0f0" : ratio > 0.25 ? "#ff0" : "#f00";
    }
    ctx.fillRect(x, y, barWidth * ratio, barHeight);

    if (this.hpFlash > 0) {
      ctx.shadowColor = "#0f0";
      ctx.shadowBlur = 8;
    }

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(12 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.fillText(t("hud.hp") + " " + this.hp + "/" + this.maxHp, x + barWidth / 2, y + barHeight - Math.round(1 * fontScale));
    ctx.textAlign = "left";
  }

  _drawHealEffect(): void {
    const heroCx = this.x + heroImg[0].width / 2;
    const heroCy = this.y + heroImg[0].height / 2;
    const progress = 1 - this.healAnim / 30;

    const floatY = heroCy - 40 - progress * 50;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#0f0";
    ctx.font = `bold ${Math.round(28 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.shadowColor = "#0f0";
    ctx.shadowBlur = 12;
    ctx.fillText(t("effect.heal"), heroCx, floatY);
    ctx.restore();

    const ringRadius = 20 + progress * 60;
    const ringAlpha = (1 - progress) * 0.5;
    ctx.save();
    ctx.globalAlpha = ringAlpha;
    ctx.beginPath();
    ctx.arc(heroCx, heroCy, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  _drawLevelUpEffect(): void {
    const lv = getLevel();
    const heroCx = this.x + heroImg[0].width / 2;
    const heroCy = this.y + heroImg[0].height / 2;
    const progress = 1 - this.levelUpAnim / 60;

    // 浮动文字
    const floatY = heroCy - 60 - progress * 80;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fd0";
    ctx.font = `bold ${Math.round(32 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.shadowColor = "#fd0";
    ctx.shadowBlur = 16;
    ctx.fillText(t("effect.levelUp") + lv, heroCx, floatY);
    ctx.restore();

    // 金色光环
    const ringRadius = 20 + progress * 80;
    const ringAlpha = (1 - progress) * 0.6;
    ctx.save();
    ctx.globalAlpha = ringAlpha;
    ctx.beginPath();
    ctx.arc(heroCx, heroCy, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "#fd0";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#fd0";
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.restore();
  }

  hit(): void {
    if (this.dying || this.invincible > 0) return;

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

        this.hp--;
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
  }

  setPhaseCallbacks(getter: () => GamePhase, setter: (phase: GamePhase) => void): void {
    this._getCurrentPhase = getter;
    this._setCurrentPhase = setter;
  }
}

function getHeroHp(): number {
  return activeHero ? activeHero.hp : 0;
}

function getHeroMaxHp(): number {
  return activeHero ? activeHero.maxHp : 3;
}

function getHeroBuffs(): BuffState {
  return activeHero ? activeHero.buffs : { firepower: 0, shield: 0, spread: 0 };
}

export { Hero, getHeroHp, getHeroMaxHp, getHeroBuffs };
export default Hero;
