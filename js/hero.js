// 玩家战机类
import { ctx, canvas, width } from "./canvas.js";
import { heroImg } from "./resources.js";
import { PHASE_DOWNLOAD, PHASE_PLAY, PHASE_PAUSE, PHASE_GAMEOVER } from "./constants.js";
import Bullet from "./bullet.js";
import Enemy from "./enemy.js";
import Item from "./item.js";
import { playHit, playHeal, playFirepower, playShield, playSpread } from "./audio.js";
import { getGameScore } from "./score.js";
import { buffConfig, heroConfig, itemConfig } from "./config.js";
let activeHero = null;
let eventsBound = false;
function bindEventsOnce() {
    if (eventsBound)
        return;
    eventsBound = true;
    const move = (e) => {
        if (!activeHero)
            return;
        const curPhase = activeHero._getCurrentPhase();
        if (curPhase === PHASE_PLAY || curPhase === PHASE_PAUSE) {
            activeHero._setCurrentPhase(PHASE_PLAY);
            const offsetX = e instanceof MouseEvent ? e.offsetX : e.touches[0].pageX;
            const offsetY = e instanceof MouseEvent ? e.offsetY : e.touches[0].pageY;
            const w = heroImg[0].width;
            const h = heroImg[0].height;
            let nx = offsetX - w / 2;
            let ny = offsetY - h / 2;
            if (nx < 20 - w / 2)
                nx = 20 - w / 2;
            else if (nx > canvas.width - w / 2 - 20)
                nx = canvas.width - w / 2 - 20;
            if (ny < 0)
                ny = 0;
            else if (ny > canvas.height - h / 2)
                ny = canvas.height - h / 2;
            activeHero.x = nx;
            activeHero.y = ny;
            activeHero.count = 2;
        }
    };
    canvas.addEventListener("mousemove", move, false);
    canvas.addEventListener("touchmove", move, false);
    canvas.onmouseout = () => {
        if (!activeHero)
            return;
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
        this._getCurrentPhase = () => PHASE_DOWNLOAD;
        this._setCurrentPhase = () => { };
        activeHero = this;
        bindEventsOnce();
    }
    draw(curPhase) {
        this.count++;
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
        if (this.invincible > 0) {
            this.invincible--;
        }
        this._tickBuffs();
        this.hit();
        if (this.count % 3 === 0 && this.index <= 1) {
            this.index = this.index === 0 ? 1 : 0;
            this.count = 0;
        }
        if (this.invincible > 0 && this.invincible % 4 < 2) {
            // 不绘制战机，产生闪烁
        }
        else {
            ctx.drawImage(heroImg[this.index], this.x, this.y);
        }
        if (this.buffs.shield > 0) {
            this._drawShieldAura();
        }
        this._drawScore();
        this._drawHp();
        this._drawBuffs();
        this._drawBuffFloats();
        if (!this.dying) {
            const pickedTypes = Item.checkCollision(this.x, this.y, heroImg[0].width, heroImg[0].height);
            this._handleItemPickup(pickedTypes);
        }
        if (this.healAnim > 0) {
            this._drawHealEffect();
            this.healAnim--;
        }
        this.hCount++;
        if (this.hCount % 3 === 0) {
            const isSpread = this.buffs.spread > 0;
            if (isSpread) {
                Bullet.add(new Bullet(-48, this.x, this.y, heroImg[0].width, heroImg[0].height, true));
                Bullet.add(new Bullet(-24, this.x, this.y, heroImg[0].width, heroImg[0].height));
                Bullet.add(new Bullet(0, this.x, this.y, heroImg[0].width, heroImg[0].height));
                Bullet.add(new Bullet(24, this.x, this.y, heroImg[0].width, heroImg[0].height));
                Bullet.add(new Bullet(48, this.x, this.y, heroImg[0].width, heroImg[0].height, true));
            }
            else {
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
    _tickBuffs() {
        const keys = ["firepower", "shield", "spread"];
        for (const key of keys) {
            if (this.buffs[key] > 0) {
                this.buffs[key]--;
            }
        }
    }
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
    _addBuffFloat(text, color) {
        this.buffFloats.push({ text, color, frame: 30, maxFrame: 30 });
    }
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
    _drawBuffs() {
        const barWidth = 150;
        const barHeight = 8;
        const baseX = width - barWidth - 10;
        const baseY = ctx.canvas.height - 12 - 10 - 6;
        const activeBuffs = [];
        if (this.buffs.firepower > 0)
            activeBuffs.push("firepower");
        if (this.buffs.shield > 0)
            activeBuffs.push("shield");
        if (this.buffs.spread > 0)
            activeBuffs.push("spread");
        for (let i = 0; i < activeBuffs.length; i++) {
            const key = activeBuffs[i];
            const cfg = buffConfig[key];
            const y = baseY - i * (barHeight + 4);
            const ratio = this.buffs[key] / cfg.duration;
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.fillRect(baseX, y, barWidth, barHeight);
            ctx.fillStyle = cfg.color;
            ctx.fillRect(baseX, y, barWidth * ratio, barHeight);
            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(baseX, y, barWidth, barHeight);
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
        if (this.hpFlash > 0) {
            this.hpFlash--;
        }
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(x, y, barWidth, barHeight);
        const ratio = this.hp / this.maxHp;
        if (this.hpFlash > 0 && this.hpFlash % 6 < 3) {
            ctx.fillStyle = "#fff";
        }
        else {
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
        ctx.font = "bold 12px arial";
        ctx.textAlign = "center";
        ctx.fillText("HP " + this.hp + "/" + this.maxHp, x + barWidth / 2, y + barHeight - 1);
        ctx.textAlign = "left";
    }
    _drawHealEffect() {
        const heroCx = this.x + heroImg[0].width / 2;
        const heroCy = this.y + heroImg[0].height / 2;
        const progress = 1 - this.healAnim / 30;
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
        if (this.dying || this.invincible > 0)
            return;
        const enemies = Enemy.getAll();
        for (let i = 0; i < enemies.length; i++) {
            const d = enemies[i];
            if (d.die)
                continue;
            const px = this.x <= d.x ? d.x : this.x;
            const py = this.y <= d.y ? d.y : this.y;
            if (px >= this.x &&
                px <= this.x + heroImg[0].width &&
                py >= this.y &&
                py <= this.y + heroImg[0].height &&
                px >= d.x &&
                px <= d.x + d.width &&
                py >= d.y &&
                py <= d.y + d.height) {
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
                }
                else {
                    this.invincible = heroConfig.invincibleFrames;
                }
                break;
            }
        }
    }
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
function getHeroBuffs() {
    return activeHero ? activeHero.buffs : { firepower: 0, shield: 0, spread: 0 };
}
export { Hero, getHeroHp, getHeroMaxHp, getHeroBuffs };
export default Hero;
