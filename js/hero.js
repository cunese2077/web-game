// 玩家战机类
import { ctx, canvas, width, height, fontScale } from "./canvas.js";
import { heroImg } from "./resources.js";
import { PHASE_DOWNLOAD, PHASE_PLAY, PHASE_PAUSE, PHASE_GAME_OVER, PHASE_LEVEL_UP, PHASE_BOSS, PHASE_BOSS_WARNING } from "./constants.js";
import { bossConfig } from "./config.js";
import Bullet from "./bullet.js";
import Enemy from "./enemy.js";
import Item from "./item.js";
import { playHit, playHeal, playFirepower, playShield, playSpread, playLevelUp } from "./audio.js";
import { isSoundEnabled, getDifficulty } from "./settings.js";
import { getGameScore } from "./score.js";
import { getLevel, getExp, getExpToNext } from "./level.js";
import { buffConfig, heroConfig, itemConfig, getDifficultyConfig, getCollisionDamage } from "./config.js";
import { getActiveBoss } from "./boss.js";
import { getBullets } from "./enemyBullet.js";
import { getDebugPanelArea, getDebugToggleArea } from "./debug.js";
import { t } from "./i18n.js";
import { initUpgrades, addPendingLevelUps, getPendingLevelUps, getBulletCount, getBulletInterval, getBulletDamage, getMoveSpeedBonus, getMaxHp, hasPiercing, startUpgradeSelection, getArmorReduction, hasDoomBarrage, hasQuantumAnnihilate, hasAnnihilateSquad, } from "./upgrade.js";
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
        if (curPhase === PHASE_PLAY || curPhase === PHASE_PAUSE || curPhase === PHASE_BOSS_WARNING || curPhase === PHASE_BOSS) {
            // 仅从暂停恢复到游戏中；BOSS 预警/战斗阶段保持不变
            if (curPhase === PHASE_PAUSE) {
                activeHero._setCurrentPhase(PHASE_PLAY);
            }
            const offsetX = e instanceof MouseEvent ? e.offsetX : e.touches[0].pageX;
            const offsetY = e instanceof MouseEvent ? e.offsetY : e.touches[0].pageY;
            // 排除音效按钮区域：点击按钮时不应移动战机
            const sndArea = getSoundIconArea();
            if (offsetX >= sndArea.x && offsetX < sndArea.x + sndArea.w &&
                offsetY >= sndArea.y && offsetY < sndArea.y + sndArea.h) {
                return;
            }
            // 排除调试面板区域：点击调试按钮时不应移动战机
            const dbgPanel = getDebugPanelArea();
            if (dbgPanel && offsetX >= dbgPanel.x && offsetX < dbgPanel.x + dbgPanel.w &&
                offsetY >= dbgPanel.y && offsetY < dbgPanel.y + dbgPanel.h) {
                return;
            }
            const dbgToggle = getDebugToggleArea();
            if (dbgToggle && offsetX >= dbgToggle.x && offsetX < dbgToggle.x + dbgToggle.w &&
                offsetY >= dbgToggle.y && offsetY < dbgToggle.y + dbgToggle.h) {
                return;
            }
            const w = heroImg[0].width;
            const h = heroImg[0].height;
            const speedMul = 1 + getMoveSpeedBonus();
            let nx = offsetX - w / 2;
            let ny = offsetY - h / 2;
            if (nx < 20 - w / 2)
                nx = 20 - w / 2;
            else if (nx > width - w / 2 - 20)
                nx = width - w / 2 - 20;
            if (ny < 0)
                ny = 0;
            else if (ny > height - h / 2)
                ny = height - h / 2;
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
        const phase = activeHero._getCurrentPhase();
        // BOSS 预警/战斗阶段不进入暂停（避免恢复时丢失 BOSS 阶段）
        if (phase === PHASE_PLAY) {
            activeHero._setCurrentPhase(PHASE_PAUSE);
        }
    };
    // 画布尺寸变化时，将战机位置限制在新边界内
    window.addEventListener("resize", () => {
        if (!activeHero)
            return;
        const w = width;
        const h = height;
        const hw = heroImg[0].width;
        const hh = heroImg[0].height;
        if (activeHero.x < 20 - hw / 2)
            activeHero.x = 20 - hw / 2;
        else if (activeHero.x > w - hw / 2 - 20)
            activeHero.x = w - hw / 2 - 20;
        if (activeHero.y < 0)
            activeHero.y = 0;
        else if (activeHero.y > h - hh / 2)
            activeHero.y = h - hh / 2;
    });
}
class Hero {
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
        this.buffs = {
            firepower: 0,
            shield: 0,
            spread: 0,
        };
        this.buffFloats = [];
        this.levelUpAnim = 0;
        this.lastLevel = getLevel();
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
                this._setCurrentPhase(PHASE_GAME_OVER);
                this.index = heroImg.length - 1;
            }
            ctx.drawImage(heroImg[this.index], this.x, this.y);
            this._drawScore();
            this._drawHp();
            return this._getCurrentPhase();
        }
        if (this.invincible > 0) {
            this.invincible--;
        }
        // 更新 maxHp（升级选择可能改变了被动层数）
        this.maxHp = getMaxHp();
        // 确保 hp 不超过 maxHp
        if (this.hp > this.maxHp)
            this.hp = this.maxHp;
        if (curPhase !== PHASE_LEVEL_UP) {
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
        }
        else {
            ctx.drawImage(heroImg[this.index], this.x, this.y);
        }
        if (this.buffs.shield > 0) {
            this._drawShieldAura();
        }
        // 进化光环：持有进化超武时显示专属紫色光环
        if (hasDoomBarrage() || hasQuantumAnnihilate() || hasAnnihilateSquad()) {
            this._drawEvolutionAura();
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
    _shoot() {
        const bulletCount = getBulletCount();
        const isSpread = this.buffs.spread > 0;
        const heroW = heroImg[0].width;
        const heroH = heroImg[0].height;
        const piercing = hasPiercing();
        if (isSpread) {
            // 散弹 buff：扇形发射，子弹数由武器等级+弹幕风暴决定
            const spreadWidth = 48; // 最外侧子弹距中心的像素偏移
            const step = bulletCount > 1 ? (spreadWidth * 2) / (bulletCount - 1) : 0;
            const startOffset = -spreadWidth;
            for (let i = 0; i < bulletCount; i++) {
                const offset = bulletCount === 1 ? 0 : startOffset + step * i;
                const isDiagonal = i === 0 || i === bulletCount - 1;
                Bullet.add(new Bullet(offset, this.x, this.y, heroW, heroH, isDiagonal, piercing));
            }
        }
        else {
            // 正常射击：根据武器等级决定子弹数和间距
            const spreadWidth = 32; // 最外侧子弹距中心的像素偏移
            const step = bulletCount > 1 ? (spreadWidth * 2) / (bulletCount - 1) : 0;
            const startOffset = -spreadWidth;
            for (let i = 0; i < bulletCount; i++) {
                const offset = bulletCount === 1 ? 0 : startOffset + step * i;
                const isDiagonal = i === 0 || i === bulletCount - 1;
                Bullet.add(new Bullet(offset, this.x, this.y, heroW, heroH, isDiagonal, piercing));
            }
        }
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
            ctx.font = `bold ${Math.round(24 * fontScale)}px arial`;
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
    // 进化光环：紫色脉冲光环 + 旋转粒子
    _drawEvolutionAura() {
        const cx = this.x + heroImg[0].width / 2;
        const cy = this.y + heroImg[0].height / 2;
        const radius = Math.max(heroImg[0].width, heroImg[0].height) * 0.65;
        const alpha = 0.35 + Math.sin(this.count * 0.12) * 0.2;
        ctx.save();
        // 外层紫色脉冲环
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "#c6f";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#c6f";
        ctx.shadowBlur = 12;
        ctx.stroke();
        // 3 个旋转小光点
        const particleRadius = radius + 4;
        const speed = this.count * 0.06;
        for (let i = 0; i < 3; i++) {
            const angle = speed + (Math.PI * 2 / 3) * i;
            const px = cx + Math.cos(angle) * particleRadius;
            const py = cy + Math.sin(angle) * particleRadius;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#e8f";
            ctx.shadowColor = "#c6f";
            ctx.shadowBlur = 8;
            ctx.fill();
        }
        ctx.restore();
    }
    _drawBuffs() {
        const barWidth = Math.round(150 * fontScale);
        const barHeight = Math.round(8 * fontScale);
        const baseX = width - barWidth - Math.round(10 * fontScale);
        const baseY = height - Math.round((10 + 12 + 6 + 8) * fontScale);
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
            ctx.textAlign = "right";
            ctx.fillText((this.buffs[key] / 20).toFixed(1) + "s", baseX + barWidth - Math.round(3 * fontScale), y + barHeight - Math.round(1 * fontScale));
        }
        ctx.textAlign = "left";
    }
    // 属性面板
    _drawStats() {
        const currentDamage = getBulletDamage();
        const hasFirepower = this.buffs.firepower > 0;
        const displayDamage = currentDamage * (hasFirepower ? buffConfig.firepower.damageMultiplier : 1);
        const bulletInterval = getBulletInterval();
        const padding = Math.round(6 * fontScale);
        const lineH = Math.round(14 * fontScale);
        const panelW = Math.round(92 * fontScale);
        const lineCount = 2;
        const panelH = lineCount * lineH + padding * 2;
        const panelX = Math.round(10 * fontScale);
        const panelY = height - panelH - Math.round(10 * fontScale);
        const isLevelUp = this.levelUpAnim > 0;
        const borderColor = isLevelUp ? "#fd0" : "rgba(255,255,255,0.4)";
        const bgAlpha = isLevelUp ? 0.55 : 0.35;
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
        ctx.font = `bold ${Math.round(11 * fontScale)}px arial`;
        ctx.textAlign = "left";
        let lineY = panelY + padding + Math.round(10 * fontScale);
        const labelX = panelX + padding;
        const valueX = panelX + panelW - padding;
        // ATK
        ctx.textAlign = "left";
        ctx.fillStyle = hasFirepower ? "#f80" : "#fd0";
        ctx.fillText(t("hud.atk"), labelX, lineY);
        ctx.textAlign = "right";
        ctx.fillStyle = hasFirepower ? "#f80" : "#fff";
        ctx.fillText(displayDamage.toFixed(2), valueX, lineY);
        lineY += lineH;
        // RATE
        ctx.textAlign = "left";
        ctx.fillStyle = "#9cf";
        ctx.fillText(t("hud.rate"), labelX, lineY);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.fillText(String(bulletInterval), valueX, lineY);
        ctx.textAlign = "left";
    }
    _drawScore() {
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.round(20 * fontScale)}px arial`;
        ctx.fillText(t("hud.score") + getGameScore(), Math.round(10 * fontScale), Math.round(30 * fontScale));
    }
    _drawLevel() {
        const lv = getLevel();
        const exp = getExp();
        const expNext = getExpToNext();
        const isMaxLevel = lv >= 50;
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
        }
        else {
            ctx.fillText(exp + "/" + expNext, barX + barWidth / 2, barY + barHeight - Math.round(1 * fontScale));
        }
        // 音效开关图标
        const sndIconSize = Math.round(22 * fontScale);
        const sndIconX = barX - sndIconSize - Math.round(6 * fontScale);
        const sndIconY = barY + barHeight / 2;
        const sndEnabled = isSoundEnabled();
        const btnW = Math.round(28 * fontScale);
        const btnH = Math.round(22 * fontScale);
        const btnR = Math.round(5 * fontScale);
        const btnX = sndIconX - btnW / 2;
        const btnY = sndIconY - btnH / 2;
        ctx.save();
        ctx.fillStyle = sndEnabled ? "rgba(255,255,255,0.1)" : "rgba(255,60,60,0.08)";
        ctx.beginPath();
        ctx.moveTo(btnX + btnR, btnY);
        ctx.lineTo(btnX + btnW - btnR, btnY);
        ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + btnR, btnR);
        ctx.lineTo(btnX + btnW, btnY + btnH - btnR);
        ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - btnR, btnY + btnH, btnR);
        ctx.lineTo(btnX + btnR, btnY + btnH);
        ctx.arcTo(btnX, btnY + btnH, btnX, btnY + btnH - btnR, btnR);
        ctx.lineTo(btnX, btnY + btnR);
        ctx.arcTo(btnX, btnY, btnX + btnR, btnY, btnR);
        ctx.closePath();
        ctx.fill();
        ctx.font = `${Math.round(16 * fontScale)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = sndEnabled ? "#fff" : "#aaa";
        ctx.fillText("♫", sndIconX, sndIconY + Math.round(1 * fontScale));
        if (!sndEnabled) {
            ctx.strokeStyle = "#f44";
            ctx.lineWidth = Math.round(2 * fontScale);
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(btnX + Math.round(3 * fontScale), btnY + Math.round(3 * fontScale));
            ctx.lineTo(btnX + btnW - Math.round(3 * fontScale), btnY + btnH - Math.round(3 * fontScale));
            ctx.stroke();
        }
        ctx.restore();
        ctx.textAlign = "left";
    }
    _checkLevelUp() {
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
            }
            else {
                // 无可用选项（极端情况），跳过升级选择
                addPendingLevelUps(-getPendingLevelUps());
            }
        }
    }
    _drawHp() {
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
        ctx.font = `bold ${Math.round(12 * fontScale)}px arial`;
        ctx.textAlign = "center";
        ctx.fillText(t("hud.hp") + " " + this.hp + "/" + this.maxHp, x + barWidth / 2, y + barHeight - Math.round(1 * fontScale));
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
    _drawLevelUpEffect() {
        const lv = getLevel();
        const heroCx = this.x + heroImg[0].width / 2;
        const heroCy = this.y + heroImg[0].height / 2;
        const progress = 1 - this.levelUpAnim / 60;
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
                // 碰撞伤害：基础值按敌机类型分级 × 难度乘数，再减护甲
                const diffConfig = getDifficultyConfig(getDifficulty());
                const baseDmg = getCollisionDamage(d.type);
                const finalDmg = Math.max(1, Math.round(baseDmg * diffConfig.enemyDamageMultiplier) - getArmorReduction());
                this.hp -= finalDmg;
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
                }
                else if (this.invincible <= 0) {
                    const diffConfig = getDifficultyConfig(getDifficulty());
                    const bossDmg = Math.max(1, Math.round(3 * diffConfig.enemyDamageMultiplier) - getArmorReduction());
                    this.hp -= bossDmg;
                    playHit();
                    if (this.hp <= 0) {
                        this.hp = 0;
                        this.dying = true;
                        this.index = 2;
                    }
                    else {
                        this.invincible = heroConfig.invincibleFrames;
                    }
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
                }
                else if (this.invincible <= 0) {
                    const diffConfig = getDifficultyConfig(getDifficulty());
                    const bulletDmg = Math.max(1, Math.round(1 * diffConfig.enemyDamageMultiplier));
                    this.hp -= bulletDmg;
                    playHit();
                    b.removable = true;
                    if (this.hp <= 0) {
                        this.hp = 0;
                        this.dying = true;
                        this.index = 2;
                    }
                    else {
                        this.invincible = heroConfig.invincibleFrames;
                    }
                }
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
function getHeroY() {
    return activeHero ? activeHero.y : 0;
}
function getHeroX() {
    return activeHero ? activeHero.x : 0;
}
function healHero(amount) {
    if (!activeHero)
        return;
    if (activeHero.hp >= activeHero.maxHp)
        return;
    activeHero.hp = Math.min(activeHero.hp + amount, activeHero.maxHp);
    activeHero.healAnim = 30;
    activeHero.hpFlash = 30;
    playHeal();
}
function getSoundIconArea() {
    const barWidth = Math.round(110 * fontScale);
    const barHeight = Math.round(10 * fontScale);
    const barX = width - barWidth - Math.round(10 * fontScale);
    const barY = Math.round(26 * fontScale);
    const sndIconSize = Math.round(22 * fontScale);
    const sndIconX = barX - sndIconSize - Math.round(6 * fontScale);
    const sndIconY = barY + barHeight / 2;
    const btnW = Math.round(28 * fontScale);
    const btnH = Math.round(22 * fontScale);
    const isTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    const pad = isTouch ? Math.round(10 * fontScale) : 0;
    return {
        x: sndIconX - btnW / 2 - pad,
        y: sndIconY - btnH / 2 - pad,
        w: btnW + pad * 2,
        h: btnH + pad * 2,
    };
}
export { Hero, getHeroHp, getHeroMaxHp, getHeroBuffs, getHeroX, getHeroY, healHero, getSoundIconArea, initUpgrades };
export default Hero;
