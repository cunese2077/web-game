// BOSS 实体模块（从 boss.ts 拆出）：Boss 类核心——构造/更新/伤害结算/绘制装配
// 弹幕基础形态调用 bossPatterns 纯函数，类型外观调用 bossBody 绘制函数
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
import { triggerBossLegendary } from "./upgrade.js";
import { incrementSessionBossKillCount } from "./bossManager.js";
import { getBossType } from "./bossTypes.js";
import { fireSpiral, fireCircle, fireFan, fireAimed, fireRain } from "./bossPatterns.js";
import { drawAssaultBody, drawFortressBody, drawCarrierBody, drawPhantomBody } from "./bossBody.js";
class Boss {
    constructor(bossIndex) {
        // 受击（合并伤害，带音效冷却；堡垒型先扣护盾）
        this.hitSoundCooldown = 0;
        this.bossIndex = bossIndex;
        this.bossType = getBossType(bossIndex);
        this.bossWidth = Math.round(width * bossConfig.widthRatio);
        this.bossHeight = Math.round(height * bossConfig.heightRatio);
        this.x = width / 2;
        this.y = this.bossHeight / 2 + Math.round(20 * fontScale); // 顶部留空
        // HP 计算：baseHP × (1 + hpGrowthFactor × bossIndex) × 难度乘数 × 难度BOSS乘数
        const diffConfig = getDifficultyConfig(getDifficulty());
        this.hp = bossConfig.baseHp * (1 + bossConfig.hpGrowthFactor * bossIndex) * diffConfig.enemyHpMultiplier * diffConfig.bossHpMultiplier;
        this.maxHp = this.hp;
        this.moveDirection = 1;
        this.attackPhase = 1;
        this.attackTimer = 0;
        this.circleTimer = 0;
        this.alive = true;
        // 类型特有属性
        this.isDiving = false;
        this.diveSpeed = 0;
        this.diveTargetY = 0;
        this.diveCooldown = 0;
        this.shieldHp = 0;
        this.shieldMaxHp = 0;
        this.shieldRegenTimer = 0;
        this.droneTimer = 0;
        this.droneCount = 0;
        // 幻影型特有
        this.teleportTimer = 0;
        this.teleportFlash = 0;
        this.spiralAngle = 0;
        // 阶段转换
        this.phaseTransitionFlash = 0;
        this.phaseTransitionInvincible = 0;
        this.lastAttackPhase = 1;
        switch (this.bossType) {
            case "assault":
                // 突击型：移速快，HP略低，有俯冲
                this.moveSpeed = bossConfig.moveSpeed * 1.6;
                this.hp *= 0.85;
                this.maxHp = this.hp;
                this.diveCooldown = 120; // 6秒后首次俯冲
                break;
            case "fortress":
                // 堡垒型：移速慢，有护盾
                this.moveSpeed = bossConfig.moveSpeed * 0.6;
                this.shieldMaxHp = this.maxHp * 0.2; // 护盾=20%最大HP
                this.shieldHp = this.shieldMaxHp;
                this.shieldRegenTimer = 0;
                break;
            case "carrier":
                // 母舰型：中速，释放无人机
                this.moveSpeed = bossConfig.moveSpeed * 0.9;
                this.hp *= 1.1;
                this.maxHp = this.hp;
                this.droneTimer = 80; // 4秒后首次释放
                this.droneCount = 0;
                break;
            case "phantom":
                // 幻影型：中速，HP略高，瞬移+螺旋弹幕
                this.moveSpeed = bossConfig.moveSpeed * 1.0;
                this.hp *= 0.95;
                this.maxHp = this.hp;
                this.teleportTimer = 100; // 5秒后首次瞬移
                this.teleportFlash = 0;
                this.spiralAngle = 0;
                break;
        }
    }
    update() {
        if (!this.alive)
            return;
        // 受击音效冷却递减
        if (this.hitSoundCooldown > 0)
            this.hitSoundCooldown--;
        // === 阶段转换效果计时器递减 ===
        if (this.phaseTransitionFlash > 0)
            this.phaseTransitionFlash--;
        if (this.phaseTransitionInvincible > 0)
            this.phaseTransitionInvincible--;
        // === 类型特有行为更新 ===
        this._updateTypeBehavior();
        // 水平巡逻移动（突击型俯冲时不巡逻）
        if (!(this.bossType === "assault" && this.isDiving)) {
            this.x += this.moveSpeed * this.moveDirection;
            if (this.x - this.bossWidth / 2 <= 0) {
                this.x = this.bossWidth / 2;
                this.moveDirection = 1;
            }
            if (this.x + this.bossWidth / 2 >= width) {
                this.x = width - this.bossWidth / 2;
                this.moveDirection = -1;
            }
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
        // === 阶段转换检测：进入更高阶段时触发闪烁 + 短暂无敌 ===
        if (this.attackPhase > this.lastAttackPhase) {
            this.phaseTransitionFlash = 30; // 1.5 秒屏幕闪烁
            this.phaseTransitionInvincible = 50; // 约 2.5 秒无敌帧
            // 转换瞬间发射圆形弹幕作为「觉醒」宣告
            fireCircle(this.x, this.y, 10 + this.bossIndex, bossConfig.bullet.speed * 0.5, bossConfig.bullet.size * 0.7, "#fff");
        }
        this.lastAttackPhase = this.attackPhase;
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
    // 类型特有行为更新
    _updateTypeBehavior() {
        switch (this.bossType) {
            case "assault":
                this._updateAssault();
                break;
            case "fortress":
                this._updateFortress();
                break;
            case "carrier":
                this._updateCarrier();
                break;
            case "phantom":
                this._updatePhantom();
                break;
        }
    }
    // 突击型：周期性俯冲到玩家附近再返回
    _updateAssault() {
        if (this.isDiving) {
            // 俯冲中：快速向目标Y移动
            this.y += this.diveSpeed;
            if (this.y >= this.diveTargetY) {
                // 到达最低点，发射近距离密集弹幕
                fireFan(this.x, this.y, this.bossHeight, 6 + this.bossIndex, Math.PI * 0.8, 4, 6, "#f80");
                this.isDiving = false;
                this.diveCooldown = 150; // 7.5秒后再次俯冲
            }
        }
        else {
            // 返回顶部
            const homeY = this.bossHeight / 2 + Math.round(20 * fontScale);
            if (this.y > homeY) {
                this.y -= 3; // 缓慢返回
                if (this.y < homeY)
                    this.y = homeY;
            }
            // 俯冲冷却倒计时
            this.diveCooldown--;
            if (this.diveCooldown <= 0 && this.attackPhase >= 2) {
                this.isDiving = true;
                this.diveSpeed = 6;
                this.diveTargetY = getHeroY() - 60; // 俯冲到玩家上方60px
            }
        }
    }
    // 堡垒型：护盾自动恢复
    _updateFortress() {
        if (this.shieldHp < this.shieldMaxHp) {
            this.shieldRegenTimer++;
            if (this.shieldRegenTimer >= 60) { // 3秒恢复一次
                this.shieldHp = Math.min(this.shieldMaxHp, this.shieldHp + this.shieldMaxHp * 0.1);
                this.shieldRegenTimer = 0;
            }
        }
    }
    // 母舰型：周期性释放自爆无人机（以敌机弹幕形式）
    _updateCarrier() {
        this.droneTimer--;
        if (this.droneTimer <= 0) {
            // 释放 2+1 架自爆无人机（朝玩家方向）
            const droneCount = 2 + Math.floor(this.bossIndex / 2);
            const heroX = getHeroX();
            const heroY = getHeroY();
            for (let i = 0; i < droneCount; i++) {
                const offsetX = (i - (droneCount - 1) / 2) * 25;
                const angle = Math.atan2(heroY - this.y, heroX - (this.x + offsetX));
                // 无人机：较大较慢的追踪弹
                addBullet(this.x + offsetX, this.y + this.bossHeight / 2, Math.cos(angle) * 2, Math.sin(angle) * 2, 8, // 大半径
                "#8f4");
            }
            this.droneCount++;
            // 间隔随阶段缩短
            const baseDroneInterval = this.attackPhase >= 3 ? 60 : 100;
            this.droneTimer = baseDroneInterval - Math.min(this.bossIndex * 5, 30);
        }
    }
    // 幻影型：周期性瞬移 + 持续螺旋弹幕
    _updatePhantom() {
        // 瞬移残影倒计时
        if (this.teleportFlash > 0)
            this.teleportFlash--;
        // 螺旋弹幕角度持续递增（用于 _firePatternPhantom 的螺旋发射）
        this.spiralAngle += 0.25;
        // 瞬移冷却
        this.teleportTimer--;
        if (this.teleportTimer <= 0) {
            this._teleport();
            // 瞬移间隔随阶段缩短
            const baseInterval = this.attackPhase >= 3 ? 70 : (this.attackPhase >= 2 ? 90 : 110);
            this.teleportTimer = Math.max(40, baseInterval - this.bossIndex * 4);
        }
    }
    // 瞬移到新位置（顶部区域内随机 + 偏向玩家 X 方向）
    _teleport() {
        // 在画布水平有效区域内选择新位置，避开边缘
        const minX = this.bossWidth / 2 + 10;
        const maxX = width - this.bossWidth / 2 - 10;
        // 70% 概率瞬移到玩家附近，30% 随机位置（增加不可预测性）
        let targetX;
        if (Math.random() < 0.7) {
            const heroX = getHeroX();
            // 在玩家 X 附近 ±80px 范围内
            targetX = heroX + (Math.random() - 0.5) * 160;
        }
        else {
            targetX = Math.random() * (maxX - minX) + minX;
        }
        targetX = Math.max(minX, Math.min(maxX, targetX));
        // Y 在顶部区域内小幅变化（避免瞬移到玩家下方造成碰撞不公平）
        const homeY = this.bossHeight / 2 + Math.round(20 * fontScale);
        const targetY = homeY + (Math.random() - 0.5) * 30;
        this.x = targetX;
        this.y = Math.max(homeY - 10, targetY);
        // 触发残影
        this.teleportFlash = 15;
        // 瞬移后立即发射一轮圆形弹幕（警告效果）
        fireCircle(this.x, this.y, 6 + Math.floor(this.bossIndex / 2), bossConfig.bullet.speed * 0.6, bossConfig.bullet.size * 0.7, "#c8f");
    }
    // 弹幕发射模式（随 bossIndex 递增弹幕量，类型差异化）
    _firePattern() {
        const bulletCfg = bossConfig.bullet;
        // 后续 BOSS 弹幕量递增
        const fanCount = bulletCfg.fanCount + Math.floor(this.bossIndex / 2);
        const aimedCount = bulletCfg.aimedCount + Math.floor(this.bossIndex / 3);
        switch (this.bossType) {
            case "assault":
                this._firePatternAssault(fanCount, aimedCount, bulletCfg);
                break;
            case "fortress":
                this._firePatternFortress(fanCount, bulletCfg);
                break;
            case "carrier":
                this._firePatternCarrier(fanCount, aimedCount, bulletCfg);
                break;
            case "phantom":
                this._firePatternPhantom(aimedCount, bulletCfg);
                break;
        }
    }
    // 突击型：侧重扇形+定向，节奏快
    _firePatternAssault(fanCount, aimedCount, bulletCfg) {
        // Phase 1: 双扇形（上下交错）
        if (this.attackPhase >= 1) {
            fireFan(this.x, this.y, this.bossHeight, fanCount, bulletCfg.fanSpreadAngle, bulletCfg.speed * 1.2, bulletCfg.size, "#f44");
        }
        // Phase 2+: 快速定向射击
        if (this.attackPhase >= 2) {
            fireAimed(this.x, this.y, this.bossHeight, aimedCount + 1, bulletCfg.speed * 1.5, bulletCfg.size, "#fa0");
        }
        // Phase 3: 扇形+定向全开
        if (this.attackPhase >= 3) {
            fireFan(this.x, this.y, this.bossHeight, fanCount - 1, bulletCfg.fanSpreadAngle * 0.6, bulletCfg.speed * 1.3, bulletCfg.size * 0.8, "#ff0");
        }
    }
    // 堡垒型：侧重圆形弹幕+弹幕雨，全方位防御
    _firePatternFortress(fanCount, bulletCfg) {
        // Phase 1: 扇形（较宽）
        if (this.attackPhase >= 1) {
            fireFan(this.x, this.y, this.bossHeight, fanCount, bulletCfg.fanSpreadAngle * 1.3, bulletCfg.speed * 0.8, bulletCfg.size * 1.2, "#48f");
        }
        // Phase 2+: 弹幕雨 + 圆形弹幕
        if (this.attackPhase >= 2) {
            fireRain(this.x, this.y, this.bossWidth, this.bossHeight, 5, bulletCfg.speed * 0.6, bulletCfg.size, "#a4f");
            this.circleTimer++;
            if (this.circleTimer >= 3) {
                this.circleTimer = 0;
                fireCircle(this.x, this.y, 8 + this.bossIndex, bulletCfg.speed * 0.5, bulletCfg.size * 0.8, "#f4f");
            }
        }
        // Phase 3: 全方位弹幕 + 定向
        if (this.attackPhase >= 3) {
            fireCircle(this.x, this.y, 10 + this.bossIndex, bulletCfg.speed * 0.4, bulletCfg.size * 0.6, "#4ff");
        }
    }
    // 母舰型：侧重弹幕雨+追踪弹，压制玩家走位
    _firePatternCarrier(fanCount, aimedCount, bulletCfg) {
        // Phase 1: 扇形
        if (this.attackPhase >= 1) {
            fireFan(this.x, this.y, this.bossHeight, fanCount, bulletCfg.fanSpreadAngle, bulletCfg.speed, bulletCfg.size, "#f44");
        }
        // Phase 2+: 弹幕雨 + 追踪定向
        if (this.attackPhase >= 2) {
            fireRain(this.x, this.y, this.bossWidth, this.bossHeight, 4, bulletCfg.speed * 0.7, bulletCfg.size * 0.8, "#c8f");
            fireAimed(this.x, this.y, this.bossHeight, aimedCount, bulletCfg.speed * 1.1, bulletCfg.size, "#fa0");
        }
        // Phase 3: 圆形 + 额外弹幕雨
        if (this.attackPhase >= 3) {
            this.circleTimer++;
            if (this.circleTimer >= 2) {
                this.circleTimer = 0;
                fireCircle(this.x, this.y, 6 + this.bossIndex, bulletCfg.speed * 0.5, bulletCfg.size * 0.7, "#f0f");
            }
            fireRain(this.x, this.y, this.bossWidth, this.bossHeight, 3, bulletCfg.speed * 0.9, bulletCfg.size * 0.6, "#ff8");
        }
    }
    // 幻影型：侧重螺旋弹幕 + 定向，瞬移后压制
    _firePatternPhantom(aimedCount, bulletCfg) {
        // 螺旋弹幕：每次发射 N 发，沿当前 spiralAngle 均匀分布
        // Phase 1: 2 臂螺旋
        if (this.attackPhase >= 1) {
            fireSpiral(this.x, this.y, this.spiralAngle, 2, bulletCfg.speed * 0.9, bulletCfg.size * 0.8, "#c8f");
        }
        // Phase 2+: 增加定向射击
        if (this.attackPhase >= 2) {
            fireSpiral(this.x, this.y, this.spiralAngle, 3, bulletCfg.speed * 1.0, bulletCfg.size * 0.7, "#f8c");
            fireAimed(this.x, this.y, this.bossHeight, aimedCount, bulletCfg.speed * 1.2, bulletCfg.size, "#fa0");
        }
        // Phase 3: 3 臂螺旋 + 圆形弹幕（4 臂→3 臂、频率每 3→每 4，降低弹幕密度避免过密）
        if (this.attackPhase >= 3) {
            fireSpiral(this.x, this.y, this.spiralAngle, 3, bulletCfg.speed * 1.1, bulletCfg.size * 0.6, "#f0f");
            this.circleTimer++;
            if (this.circleTimer >= 4) {
                this.circleTimer = 0;
                fireCircle(this.x, this.y, 8 + this.bossIndex, bulletCfg.speed * 0.5, bulletCfg.size * 0.6, "#a8f");
            }
        }
    }
    takeDamage(damage) {
        if (!this.alive)
            return;
        // 阶段转换无敌帧：转换期间免疫伤害（让玩家看清觉醒效果）
        if (this.phaseTransitionInvincible > 0)
            return;
        // 堡垒型：先扣护盾
        if (this.bossType === "fortress" && this.shieldHp > 0) {
            if (damage <= this.shieldHp) {
                this.shieldHp -= damage;
                this.shieldRegenTimer = 0; // 受击重置恢复计时
                if (this.hitSoundCooldown <= 0) {
                    playBossHit();
                    this.hitSoundCooldown = 6;
                }
                return; // 护盾完全吸收
            }
            else {
                const overflow = damage - this.shieldHp;
                this.shieldHp = 0;
                this.shieldRegenTimer = 0;
                damage = overflow; // 溢出伤害打到本体
            }
        }
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
        incrementSessionBossKillCount();
        playBossDestroy();
        // 触发传说道具保底：下次升级选项保证至少 1 个传说道具
        triggerBossLegendary();
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
        // === BOSS 主体绘制（类型差异化外观） ===
        switch (this.bossType) {
            case "assault":
                drawAssaultBody(this, left, top);
                break;
            case "fortress":
                drawFortressBody(this, left, top);
                break;
            case "carrier":
                drawCarrierBody(this, left, top);
                break;
            case "phantom":
                drawPhantomBody(this, left, top);
                break;
        }
        // 阶段转换无敌期间：BOSS 周围白色脉冲边框（提示玩家此时无敌）
        if (this.phaseTransitionInvincible > 0) {
            const invPulse = 0.5 + 0.5 * Math.sin(this.phaseTransitionInvincible * 0.4);
            ctx.save();
            ctx.globalAlpha = 0.6 * invPulse;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#fff";
            ctx.shadowBlur = 15;
            ctx.strokeRect(left - 4, top - 4, this.bossWidth + 8, this.bossHeight + 8);
            ctx.restore();
        }
        ctx.restore();
        // BOSS 血条
        this._drawHpBar();
        // 堡垒型：护盾条
        if (this.bossType === "fortress" && this.shieldMaxHp > 0) {
            this._drawShieldBar();
        }
        // 阶段转换：全屏闪烁效果
        if (this.phaseTransitionFlash > 0) {
            this._drawPhaseTransitionFlash();
        }
    }
    // 阶段转换全屏闪烁
    _drawPhaseTransitionFlash() {
        const progress = this.phaseTransitionFlash / 30; // 0~1
        // 闪烁透明度：前半段渐亮，后半段渐灭，叠加脉冲
        const baseAlpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(this.phaseTransitionFlash * 0.5));
        const alpha = baseAlpha * pulse * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        // 阶段越高，颜色越强烈：阶段2=黄白，阶段3=红白
        const isPhase3 = this.attackPhase === 3;
        ctx.fillStyle = isPhase3 ? "#f44" : "#ffa";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        // 中心扩散光环（从 BOSS 位置向外扩散）
        const ringR = (1 - progress) * Math.max(width, height) * 0.6;
        ctx.save();
        ctx.globalAlpha = baseAlpha * 0.8;
        ctx.strokeStyle = isPhase3 ? "#f44" : "#ffa";
        ctx.lineWidth = 3;
        ctx.shadowColor = isPhase3 ? "#f00" : "#ff0";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    // 护盾条（堡垒型专属）
    _drawShieldBar() {
        const barHeight = Math.round(4 * fontScale);
        const barY = Math.round(8 * fontScale) + Math.round(16 * fontScale); // 在HP条文字下方
        const barPadding = Math.round(4 * fontScale);
        const barWidth = width - barPadding * 2;
        const ratio = Math.max(0, this.shieldHp / this.shieldMaxHp);
        ctx.save();
        // 背景
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(barPadding, barY, barWidth, barHeight);
        // 护盾条
        if (ratio > 0) {
            ctx.fillStyle = `rgba(100, 180, 255, ${0.5 + 0.5 * ratio})`;
            ctx.shadowColor = "#4af";
            ctx.shadowBlur = 4;
            ctx.fillRect(barPadding, barY, barWidth * ratio, barHeight);
        }
        // 标签
        ctx.font = `${Math.round(9 * fontScale)}px arial`;
        ctx.fillStyle = "#8cf";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 0;
        ctx.fillText(t("boss.shield"), barPadding + 2, barY + barHeight / 2);
        ctx.restore();
    }
    // 获取类型标签 i18n key
    _getTypeLabel() {
        switch (this.bossType) {
            case "assault": return "boss.type.assault";
            case "fortress": return "boss.type.fortress";
            case "carrier": return "boss.type.carrier";
            case "phantom": return "boss.type.phantom";
        }
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
        const label = `${t("boss.title")} ${t(this._getTypeLabel())}  Lv.${getLevel()}`;
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
export { Boss };
