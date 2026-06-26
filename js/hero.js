// 玩家战机类
import { ctx, canvas, width } from "./canvas.js";
import { heroImg } from "./resources.js";
import { PHASE_PLAY, PHASE_PAUSE, PHASE_GAMEOVER } from "./constants.js";
import Bullet from "./bullet.js";
import Enemy from "./enemy.js";
import Item from "./item.js";
import { playHit, playHeal, playFirepower, playShield, playSpread } from "./audio.js";
import { getGameScore } from "./score.js";
import { buffConfig, heroConfig, itemConfig } from "./config.js";

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
    this.maxHp = heroConfig.maxHp;
    this.hp = this.maxHp;
    this.invincible = 0; // 受伤后无敌帧数
    this.dying = false; // 是否正在播放死亡动画
    this.healAnim = 0; // 回血动画帧计数
    this.hpFlash = 0; // 血条闪烁帧计数

    // Buff 状态：每种 buff 记录剩余帧数，0 表示未激活
    this.buffs = {
      firepower: 0,
      shield: 0,
      spread: 0,
    };

    // Buff 拾取浮动文字动效
    this.buffFloats = []; // { text, color, frame, maxFrame }

    // 注册为当前活跃实例
    activeHero = this;
    bindEventsOnce();
  }

  draw(curPhase) {
    this.count++;

    // 死亡动画
    if (this.dying) {
      this.index++;
      if (this.index >= heroImg.length) {
        curPhase = PHASE_GAMEOVER;
        this.index = heroImg.length - 1;
      }
      ctx.drawImage(heroImg[this.index], this.x, this.y);
      this._drawScore();
      this._drawHp();
      return curPhase;
    }

    // 无敌帧递减
    if (this.invincible > 0) {
      this.invincible--;
    }

    // Buff 计时器递减
    this._tickBuffs();

    this.hit();

    // 正常动画：0/1 交替
    if (this.count % 3 === 0 && this.index <= 1) {
      this.index = this.index === 0 ? 1 : 0;
      this.count = 0;
    }

    // 无敌时闪烁效果（每隔2帧不绘制）
    if (this.invincible > 0 && this.invincible % 4 < 2) {
      // 不绘制战机，产生闪烁
    } else {
      ctx.drawImage(heroImg[this.index], this.x, this.y);
    }

    // 护盾光环
    if (this.buffs.shield > 0) {
      this._drawShieldAura();
    }

    this._drawScore();
    this._drawHp();
    this._drawBuffs();
    this._drawBuffFloats();

    // 检测道具拾取
    if (!this.dying) {
      const pickedTypes = Item.checkCollision(this.x, this.y, heroImg[0].width, heroImg[0].height);
      this._handleItemPickup(pickedTypes);
    }

    // 绘制回血动效
    if (this.healAnim > 0) {
      this._drawHealEffect();
      this.healAnim--;
    }

    this.hCount++;
    if (this.hCount % 3 === 0) {
      const isSpread = this.buffs.spread > 0;
      if (isSpread) {
        // 散弹模式：5 发（左斜、左、中、右、右斜）
        Bullet.add(new Bullet(-48, this.x, this.y, heroImg[0].width, heroImg[0].height, true));
        Bullet.add(new Bullet(-24, this.x, this.y, heroImg[0].width, heroImg[0].height));
        Bullet.add(new Bullet(0, this.x, this.y, heroImg[0].width, heroImg[0].height));
        Bullet.add(new Bullet(24, this.x, this.y, heroImg[0].width, heroImg[0].height));
        Bullet.add(new Bullet(48, this.x, this.y, heroImg[0].width, heroImg[0].height, true));
      } else {
        // 普通模式：3 发
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

  // Buff 计时器递减
  _tickBuffs() {
    for (const key in this.buffs) {
      if (this.buffs[key] > 0) {
        this.buffs[key]--;
      }
    }
  }

  // 处理道具拾取
  _handleItemPickup(pickedTypes) {
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
          this._addBuffFloat(itemConfig.types.firepower.label, itemConfig.types.firepower.color);
          playFirepower();
          break;
        case "shield":
          this.buffs.shield = buffConfig.shield.duration;
          this._addBuffFloat(itemConfig.types.shield.label, itemConfig.types.shield.color);
          playShield();
          break;
        case "spread":
          this.buffs.spread = buffConfig.spread.duration;
          this._addBuffFloat(itemConfig.types.spread.label, itemConfig.types.spread.color);
          playSpread();
          break;
      }
    }
  }

  // 添加 buff 拾取浮动文字
  _addBuffFloat(text, color) {
    this.buffFloats.push({ text, color, frame: 30, maxFrame: 30 });
  }

  // 绘制 buff 浮动文字
  _drawBuffFloats() {
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
      ctx.font = "bold 24px arial";
      ctx.textAlign = "center";
      ctx.shadowColor = bf.color;
      ctx.shadowBlur = 10;
      ctx.fillText(bf.text, heroCx, floatY);
      ctx.restore();
    }
  }

  // 绘制护盾光环
  _drawShieldAura() {
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

  // 绘制 Buff 状态栏（血条下方）
  _drawBuffs() {
    const barWidth = 150;
    const barHeight = 8;
    const baseX = width - barWidth - 10;
    const baseY = ctx.canvas.height - 12 - 10 - 6; // 血条上方

    const activeBuffs = [];
    if (this.buffs.firepower > 0) activeBuffs.push("firepower");
    if (this.buffs.shield > 0) activeBuffs.push("shield");
    if (this.buffs.spread > 0) activeBuffs.push("spread");

    for (let i = 0; i < activeBuffs.length; i++) {
      const key = activeBuffs[i];
      const cfg = buffConfig[key];
      const y = baseY - i * (barHeight + 4);
      const ratio = this.buffs[key] / cfg.duration;

      // 背景
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(baseX, y, barWidth, barHeight);

      // 进度条
      ctx.fillStyle = cfg.color;
      ctx.fillRect(baseX, y, barWidth * ratio, barHeight);

      // 边框
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(baseX, y, barWidth, barHeight);

      // 文字
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px arial";
      ctx.textAlign = "left";
      ctx.fillText(cfg.label, baseX + 3, y + barHeight - 1);
    }
  }

  _drawScore() {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px arial";
    ctx.fillText("SCORE:" + getGameScore(), 10, 30);
  }

  _drawHp() {
    const barWidth = 150;
    const barHeight = 12;
    const x = width - barWidth - 10;
    const y = ctx.canvas.height - barHeight - 10;

    // 血条闪烁效果
    if (this.hpFlash > 0) {
      this.hpFlash--;
    }

    // 背景
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(x, y, barWidth, barHeight);

    // 血量
    const ratio = this.hp / this.maxHp;
    // 闪烁时血条颜色交替
    if (this.hpFlash > 0 && this.hpFlash % 6 < 3) {
      ctx.fillStyle = "#fff";
    } else {
      ctx.fillStyle = ratio > 0.5 ? "#0f0" : ratio > 0.25 ? "#ff0" : "#f00";
    }
    ctx.fillRect(x, y, barWidth * ratio, barHeight);

    // 闪烁时额外发光边框
    if (this.hpFlash > 0) {
      ctx.shadowColor = "#0f0";
      ctx.shadowBlur = 8;
    }

    // 边框
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.shadowBlur = 0;

    // 文字
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px arial";
    ctx.textAlign = "center";
    ctx.fillText("HP " + this.hp + "/" + this.maxHp, x + barWidth / 2, y + barHeight - 1);
    ctx.textAlign = "left";
  }

  _drawHealEffect() {
    const heroCx = this.x + heroImg[0].width / 2;
    const heroCy = this.y + heroImg[0].height / 2;
    const progress = 1 - this.healAnim / 30; // 0→1

    // +1 浮动文字（向上飘动并淡出）
    const floatY = heroCy - 40 - progress * 50;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#0f0";
    ctx.font = "bold 28px arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "#0f0";
    ctx.shadowBlur = 12;
    ctx.fillText("+1 HP", heroCx, floatY);
    ctx.restore();

    // 绿色光环扩散
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

  hit() {
    if (this.dying || this.invincible > 0) return;

    const enemies = Enemy.getAll();
    for (let i = 0; i < enemies.length; i++) {
      const d = enemies[i];
      if (d.die) continue; // 已死亡的敌机不造成伤害

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
        // 护盾抵消伤害
        if (this.buffs.shield > 0) {
          this.buffs.shield = 0; // 护盾消失
          this.invincible = buffConfig.shield.invincibleFrames; // 短暂无敌
          break;
        }

        this.hp--;
        playHit();
        if (this.hp <= 0) {
          this.hp = 0;
          this.dying = true;
          this.index = 2; // 从爆炸第一帧开始
        } else {
          this.invincible = heroConfig.invincibleFrames; // 受伤后无敌时间（配置值）
        }
        break; // 一次只受一次伤害
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

function getHeroHp() {
  return activeHero ? activeHero.hp : 0;
}

function getHeroMaxHp() {
  return activeHero ? activeHero.maxHp : 3;
}

// 获取当前 Hero 的 buff 状态（供 bullet.js 等模块读取）
function getHeroBuffs() {
  return activeHero ? activeHero.buffs : { firepower: 0, shield: 0, spread: 0 };
}

export { Hero, getHeroHp, getHeroMaxHp, getHeroBuffs };
export default Hero;
