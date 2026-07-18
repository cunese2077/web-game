// BOSS 系统模块
import { ctx, fontScale } from "./canvas.js";
import { width, height } from "./canvas.js";
import { bossConfig, getDifficultyConfig } from "./config.js";
import { getLevel } from "./level.js";
import { getDifficulty } from "./settings.js";
import { getHeroX, getHeroY } from "./hero.js";
import { addBullet } from "./enemyBullet.js";
import { addGameScore } from "./score.js";
import { addExp } from "./level.js";
import { playBossHit, playBossDestroy } from "./audio.js";
import { t } from "./i18n.js";
class Boss {
    constructor(bossIndex) {
        // 受击（合并伤害，带音效冷却）
        this.hitSoundCooldown = 0;
        this.bossIndex = bossIndex;
        this.bossWidth = Math.round(width * bossConfig.widthRatio);
        this.bossHeight = Math.round(height * bossConfig.heightRatio);
        this.x = width / 2;
        this.y = this.bossHeight / 2 + Math.round(20 * fontScale); // 顶部留空
        // HP 计算：baseHP × (1 + hpGrowthFactor × bossIndex) × 难度乘数 × 难度BOSS乘数
        const diffConfig = getDifficultyConfig(getDifficulty());
        this.hp = bossConfig.baseHp * (1 + bossConfig.hpGrowthFactor * bossIndex) * diffConfig.enemyHpMultiplier * diffConfig.bossHpMultiplier;
        this.maxHp = this.hp;
        this.moveDirection = 1;
        this.moveSpeed = bossConfig.moveSpeed;
        this.attackPhase = 1;
        this.attackTimer = 0;
        this.circleTimer = 0;
        this.alive = true;
    }
    update() {
        if (!this.alive)
            return;
        // 受击音效冷却递减
        if (this.hitSoundCooldown > 0)
            this.hitSoundCooldown--;
        // 水平巡逻移动
        this.x += this.moveSpeed * this.moveDirection;
        if (this.x - this.bossWidth / 2 <= 0) {
            this.x = this.bossWidth / 2;
            this.moveDirection = 1;
        }
        if (this.x + this.bossWidth / 2 >= width) {
            this.x = width - this.bossWidth / 2;
            this.moveDirection = -1;
        }
        // 根据血量比例更新攻击阶段
        const hpRatio = this.hp / this.maxHp;
        if (hpRatio <= 0.3) {
            this.attackPhase = 3;
        }
        else if (hpRatio <= 0.6) {
            this.attackPhase = 2;
        }
        else {
            this.attackPhase = 1;
        }
        // 攻击逻辑（随 bossIndex 递增强度）
        const diffConfig = getDifficultyConfig(getDifficulty());
        const baseInterval = bossConfig.bullet.interval;
        // 后续 BOSS 攻击间隔缩短：每级减 3 帧，最低 20 帧（1秒）
        const bossInterval = Math.max(20, baseInterval - this.bossIndex * 3);
        const interval = Math.round(bossInterval / diffConfig.bossAttackSpeedMultiplier);
        this.attackTimer++;
        if (this.attackTimer >= interval) {
            this.attackTimer = 0;
            this._firePattern();
        }
    }
    // 弹幕发射模式（随 bossIndex 递增弹幕量）
    _firePattern() {
        const bulletCfg = bossConfig.bullet;
        // 后续 BOSS 弹幕量递增
        const fanCount = bulletCfg.fanCount + Math.floor(this.bossIndex / 2); // 每2个BOSS +1发
        const aimedCount = bulletCfg.aimedCount + Math.floor(this.bossIndex / 3); // 每3个BOSS +1发
        // Phase 1: 扇形弹幕
        if (this.attackPhase >= 1) {
            this._fireFan(fanCount, bulletCfg.fanSpreadAngle, bulletCfg.speed, bulletCfg.size, "#f44");
        }
        // Phase 2+: 定向射击 + 少量弹幕雨
        if (this.attackPhase >= 2) {
            this._fireAimed(aimedCount, bulletCfg.speed * 1.2, bulletCfg.size, "#fa0");
            this._fireRain(3, bulletCfg.speed * 0.7, bulletCfg.size * 0.8, "#c8f");
        }
        // Phase 3: 圆形弹幕（每2次攻击才发1次，避免过于密集）
        if (this.attackPhase >= 3) {
            this.circleTimer++;
            if (this.circleTimer >= 2) {
                this.circleTimer = 0;
                const circleCount = 6 + Math.floor(this.bossIndex / 2);
                this._fireCircle(circleCount, bulletCfg.speed * 0.5, bulletCfg.size * 0.7, "#f0f");
            }
        }
    }
    // 圆形弹幕：360 度均匀发射
    _fireCircle(count, speed, size, color) {
        const angleStep = (Math.PI * 2) / count;
        for (let i = 0; i < count; i++) {
            const angle = angleStep * i + Math.PI / 2; // 偏移使初始向下
            addBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, size, color);
        }
    }
    // 扇形弹幕：向下方扇形发射
    _fireFan(count, spreadAngle, speed, size, color) {
        const heroX = getHeroX();
        const heroY = getHeroY();
        // 朝向玩家的基础角度
        const baseAngle = Math.atan2(heroY - this.y, heroX - this.x);
        const startAngle = baseAngle - spreadAngle / 2;
        const step = count > 1 ? spreadAngle / (count - 1) : 0;
        for (let i = 0; i < count; i++) {
            const angle = startAngle + step * i;
            addBullet(this.x, this.y + this.bossHeight / 2, Math.cos(angle) * speed, Math.sin(angle) * speed, size, color);
        }
    }
    // 定向射击：瞄准玩家位置
    _fireAimed(count, speed, size, color) {
        const heroX = getHeroX();
        const heroY = getHeroY();
        const angle = Math.atan2(heroY - this.y, heroX - this.x);
        // 微小偏移使多发子弹不完全重叠
        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * 0.1;
            addBullet(this.x + (i - (count - 1) / 2) * 8, this.y + this.bossHeight / 2, Math.cos(angle + offset) * speed, Math.sin(angle + offset) * speed, size, color);
        }
    }
    // 弹幕雨：随机角度向下密集发射
    _fireRain(count, speed, size, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.2; // 大致向下
            addBullet(this.x + (Math.random() - 0.5) * this.bossWidth, this.y + this.bossHeight / 2, Math.cos(angle) * speed, Math.sin(angle) * speed, size, color);
        }
    }
    takeDamage(damage) {
        if (!this.alive)
            return;
        this.hp -= damage;
        if (this.hitSoundCooldown <= 0) {
            playBossHit();
            this.hitSoundCooldown = 6; // 6 帧冷却，与敌机受击一致
        }
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            this._onDefeat();
        }
    }
    // 击败奖励
    _onDefeat() {
        playBossDestroy();
        // 经验爆发：相当于同等级大型敌机经验的 N 倍
        const level = getLevel();
        const expReward = Math.ceil(bossConfig.defeatExpMultiplier * (80 + level * 5));
        addExp(expReward);
        // 分数奖励
        addGameScore(Math.ceil(500 * (1 + this.bossIndex * 0.5)));
    }
    // 绘制 BOSS
    draw() {
        if (!this.alive)
            return;
        const left = this.x - this.bossWidth / 2;
        const top = this.y - this.bossHeight / 2;
        ctx.save();
        // === BOSS 主体绘制 ===
        // 外发光脉冲
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
        ctx.shadowColor = this.attackPhase === 3 ? "#f00" : "#f66";
        ctx.shadowBlur = 12 * pulse;
        // 主体：深色装甲底板
        ctx.fillStyle = "#411";
        ctx.fillRect(left, top, this.bossWidth, this.bossHeight);
        // 装甲板：交替深浅条纹
        const stripeH = this.bossHeight / 5;
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = i % 2 === 0 ? "#822" : "#633";
            ctx.fillRect(left, top + i * stripeH, this.bossWidth, stripeH);
        }
        // 左右翼展（三角形突出）
        ctx.fillStyle = "#733";
        // 左翼
        ctx.beginPath();
        ctx.moveTo(left, top + this.bossHeight * 0.3);
        ctx.lineTo(left - this.bossWidth * 0.1, this.y);
        ctx.lineTo(left, top + this.bossHeight * 0.7);
        ctx.fill();
        // 右翼
        ctx.beginPath();
        ctx.moveTo(left + this.bossWidth, top + this.bossHeight * 0.3);
        ctx.lineTo(left + this.bossWidth * 1.1, this.y);
        ctx.lineTo(left + this.bossWidth, top + this.bossHeight * 0.7);
        ctx.fill();
        // 中心核心发光
        const coreSize = this.bossWidth * 0.12;
        ctx.fillStyle = this.attackPhase === 3 ? "#ff0" : "#f88";
        ctx.shadowColor = this.attackPhase === 3 ? "#fa0" : "#f88";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, coreSize, 0, Math.PI * 2);
        ctx.fill();
        // 核心内圈
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(this.x, this.y, coreSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // 引擎发光点（底部两侧）
        ctx.shadowColor = "#4af";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#4af";
        const engineY = top + this.bossHeight;
        ctx.beginPath();
        ctx.arc(this.x - this.bossWidth * 0.25, engineY, 3 * fontScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.bossWidth * 0.25, engineY, 3 * fontScale, 0, Math.PI * 2);
        ctx.fill();
        // 阶段 3 狂暴闪烁
        if (this.attackPhase === 3) {
            ctx.fillStyle = `rgba(255, 50, 50, ${0.2 + 0.3 * Math.sin(Date.now() * 0.01)})`;
            ctx.fillRect(left - this.bossWidth * 0.1, top, this.bossWidth * 1.2, this.bossHeight);
        }
        ctx.restore();
        // BOSS 血条
        this._drawHpBar();
    }
    // BOSS 血条
    _drawHpBar() {
        const barHeight = Math.round(8 * fontScale);
        const barY = 0;
        const ratio = Math.max(0, this.hp / this.maxHp);
        ctx.save();
        // 背景（黑色底）
        ctx.fillStyle = "#000";
        ctx.fillRect(0, barY, width, barHeight);
        // 前景（分段渐变色）
        const hpWidth = width * ratio;
        if (ratio > 0) {
            // 按血量比例选择主色
            let mainColor;
            if (ratio <= 0.3)
                mainColor = "#f33";
            else if (ratio <= 0.6)
                mainColor = "#fa0";
            else
                mainColor = "#3f6";
            // 渐变填充
            const grad = ctx.createLinearGradient(0, barY, 0, barY + barHeight);
            grad.addColorStop(0, mainColor);
            grad.addColorStop(0.5, "#fff");
            grad.addColorStop(1, mainColor);
            ctx.fillStyle = grad;
            ctx.fillRect(0, barY, hpWidth, barHeight);
        }
        // 顶部边框线
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, barY + barHeight);
        ctx.lineTo(width, barY + barHeight);
        ctx.stroke();
        // BOSS 名称 + HP 文字（背景条）
        const labelY = barY + barHeight + Math.round(12 * fontScale);
        const label = `${t("boss.title")}  Lv.${getLevel()}`;
        const hpText = `${Math.ceil(this.hp)}/${Math.ceil(this.maxHp)}`;
        // 文字背景
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        const textH = Math.round(16 * fontScale);
        ctx.fillRect(0, barY + barHeight, width, textH);
        // 名称（居中）
        ctx.font = `bold ${Math.round(12 * fontScale)}px arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 3;
        ctx.fillText(label, width / 2, barY + barHeight + textH / 2);
        // HP 数值（右侧）
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.fillText(hpText, width - Math.round(4 * fontScale), barY + barHeight + textH / 2);
        ctx.restore();
    }
    // 碰撞检测用的边界
    getBounds() {
        return {
            left: this.x - this.bossWidth / 2,
            top: this.y - this.bossHeight / 2,
            right: this.x + this.bossWidth / 2,
            bottom: this.y + this.bossHeight / 2,
        };
    }
}
// BOSS 管理状态
let activeBoss = null;
let bossWarningTimer = 0; // 预警倒计时帧数
let triggeredBossLevels = new Set(); // 已触发的 BOSS 等级
// 检查是否应触发 BOSS（在升级时调用）
function checkBossTrigger(level) {
    if (level < bossConfig.firstTriggerLevel)
        return false;
    // 检查是否为触发等级
    if ((level - bossConfig.firstTriggerLevel) % bossConfig.triggerInterval !== 0)
        return false;
    // 防止重复触发
    if (triggeredBossLevels.has(level))
        return false;
    triggeredBossLevels.add(level);
    return true;
}
// 开始 BOSS 预警
function startBossWarning() {
    bossWarningTimer = bossConfig.warningFrames;
}
// 预警帧更新，返回 true 表示预警结束，应进入 BOSS 战
function updateBossWarning() {
    if (bossWarningTimer > 0) {
        bossWarningTimer--;
        return bossWarningTimer === 0;
    }
    return false;
}
// 生成 BOSS
function spawnBoss() {
    // bossIndex = 已触发数量 - 1
    const bossIndex = triggeredBossLevels.size - 1;
    activeBoss = new Boss(bossIndex);
}
// 更新 + 绘制 BOSS
function updateAndDrawBoss() {
    if (activeBoss && activeBoss.alive) {
        activeBoss.update();
        activeBoss.draw();
    }
}
// 获取当前 BOSS（供碰撞检测用）
function getActiveBoss() {
    return activeBoss;
}
// BOSS 是否存活
function isBossAlive() {
    return activeBoss !== null && activeBoss.alive;
}
// 清理 BOSS 状态（游戏重置时调用）
function clearBoss() {
    activeBoss = null;
    bossWarningTimer = 0;
    triggeredBossLevels = new Set();
}
// 获取预警剩余帧数
function getBossWarningTimer() {
    return bossWarningTimer;
}
export { Boss, checkBossTrigger, startBossWarning, updateBossWarning, spawnBoss, updateAndDrawBoss, getActiveBoss, isBossAlive, clearBoss, getBossWarningTimer, };
