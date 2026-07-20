// 游戏主引擎
import { ctx, canvas, fontScale, width, height } from "./canvas.js";
import { download, heroImg } from "./resources.js";
import { PHASE_DOWNLOAD, PHASE_READY, PHASE_LOADING, PHASE_PLAY, PHASE_PAUSE, PHASE_GAME_OVER, PHASE_LEVEL_UP, PHASE_BOSS_WARNING, PHASE_BOSS, } from "./constants.js";
import { Hero, getSoundIconArea, getHeroBuffs } from "./hero.js";
import { resetGameScore } from "./score.js";
import { resetLevel, getLevel } from "./level.js";
import { initUpgrades, getPendingLevelUps, getBulletDamageWithBuff, getCritChance } from "./upgrade.js";
import Bullet from "./bullet.js";
import Enemy from "./enemy.js";
import Item from "./item.js";
import { paintBg, paintLogo, loading, drawPause, drawGameOver, drawSettings, getSettingsBtnArea, handleSettingsClick, addDamageEffect, drawScoreEffects, clearScoreEffects, drawDamageEffects, clearDamageEffects } from "./ui.js";
import { drawUpgradeUI, handleUpgradeClick, clearUpgradeUI } from "./upgradeUI.js";
import { updateAndDrawSpecialWeapons, clearSpecialWeapons } from "./specialWeapons.js";
import { checkBossTrigger, registerDebugBossLevel, startBossWarning, updateBossWarning, spawnBoss, updateAndDrawBoss, isBossAlive, clearBoss, getBossWarningTimer, getActiveBoss } from "./boss.js";
import { updateAndDrawBullets, clearBullets } from "./enemyBullet.js";
import { resumeAudio, playGameOver, playUpgradeSelect, playBossWarning } from "./audio.js";
import { loadSettings, isSettingsOpen, openSettings, closeSettings, toggleSound } from "./settings.js";
import { t } from "./i18n.js";
import { isDebugMode, isDebugPanelVisible, drawDebugPanel, drawDebugToggle, handleDebugClick, handleDebugToggleClick, initDebugControls } from "./debug.js";
let curPhase = PHASE_DOWNLOAD;
let hero = null;
let pBg = null;
let loadAnim = null;
let gameOverSoundPlayed = false;
// BOSS 预警 UI 绘制
function _drawBossWarningUI() {
    const timer = getBossWarningTimer();
    const seconds = Math.ceil(timer / 20); // 20fps
    ctx.save();
    // 红色闪烁遮罩
    const pulse = 0.25 + 0.2 * Math.sin(timer * 0.3);
    ctx.fillStyle = `rgba(180, 0, 0, ${pulse})`;
    ctx.fillRect(0, 0, width, height);
    // 顶部和底部警告条纹
    ctx.fillStyle = `rgba(255, 200, 0, ${0.4 + 0.3 * Math.sin(timer * 0.3)})`;
    const stripeH = Math.round(4 * fontScale);
    ctx.fillRect(0, 0, width, stripeH);
    ctx.fillRect(0, height - stripeH, width, stripeH);
    // 主标题：BOSS 来袭
    const titleY = height / 2 - Math.round(30 * fontScale);
    ctx.font = `bold ${Math.round(32 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 15;
    ctx.fillText(t("boss.warning"), width / 2, titleY);
    // 倒计时数字（大号红色）
    const numY = height / 2 + Math.round(20 * fontScale);
    ctx.font = `bold ${Math.round(48 * fontScale)}px arial`;
    ctx.fillStyle = "#f44";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 12;
    ctx.fillText(String(seconds), width / 2, numY);
    ctx.restore();
}
// 玩家子弹命中 BOSS 检测（同帧伤害合并，支持暴击和伤害加成）
function _checkBulletsHitBoss() {
    const boss = getActiveBoss();
    if (!boss || !boss.alive)
        return;
    const bounds = boss.getBounds();
    const allBullets = Bullet.getAll();
    const damageMultiplier = getBulletDamageWithBuff(getHeroBuffs().firepower > 0);
    let frameDamage = 0;
    let frameCrit = false;
    for (let i = allBullets.length - 1; i >= 0; i--) {
        const b = allBullets[i];
        if (b.removable)
            continue;
        if (b.mx + b.width >= bounds.left &&
            b.mx <= bounds.right &&
            b.my + b.height >= bounds.top &&
            b.my <= bounds.bottom) {
            // 与敌机相同的伤害计算：武器等级 + 被动加成 + 暴击
            let dmg = damageMultiplier;
            const isCrit = Math.random() < getCritChance();
            if (isCrit) {
                dmg *= 2.0;
                frameCrit = true;
            }
            frameDamage += dmg;
            if (!b.piercing) {
                b.removable = true;
            }
        }
    }
    if (frameDamage > 0) {
        boss.takeDamage(frameDamage);
        // 显示伤害文字（BOSS 底部位置，暴击时金色大字）
        const critFontSize = frameCrit ? Math.round(22 * 1.5 * fontScale) : Math.round(22 * fontScale);
        const critColor = frameCrit ? "#ffd700" : "#f44";
        addDamageEffect(boss.x, boss.y + boss.bossHeight / 2, Math.ceil(frameDamage), critFontSize, critColor, Math.round(35 * fontScale), 25, Math.round(24 * fontScale), frameCrit);
    }
}
function getCurPhase() {
    return curPhase;
}
function setCurPhase(phase) {
    curPhase = phase;
}
function start() {
    curPhase = PHASE_READY;
    canvas.onclick = function (e) {
        resumeAudio();
        const clickX = e.offsetX;
        const clickY = e.offsetY;
        // 调试面板点击优先拦截
        if (handleDebugClick(clickX, clickY))
            return;
        if (handleDebugToggleClick(clickX, clickY))
            return;
        if (curPhase === PHASE_READY) {
            // 设置界面打开时：处理设置项点击或返回
            if (isSettingsOpen()) {
                const result = handleSettingsClick(clickY);
                if (result === "back") {
                    closeSettings();
                }
                return;
            }
            // 检查是否点击了设置按钮
            const btnArea = getSettingsBtnArea();
            if (clickY >= btnArea.y && clickY < btnArea.y + btnArea.h) {
                openSettings();
                return;
            }
            // 否则进入加载阶段
            curPhase = PHASE_LOADING;
        }
        else if (curPhase === PHASE_PLAY) {
            // 检查是否点击了音效按钮
            const sndArea = getSoundIconArea();
            if (clickX >= sndArea.x && clickX < sndArea.x + sndArea.w &&
                clickY >= sndArea.y && clickY < sndArea.y + sndArea.h) {
                toggleSound();
            }
        }
        else if (curPhase === PHASE_LEVEL_UP) {
            // 升级选择界面点击处理
            const result = handleUpgradeClick(clickX, clickY);
            if (result === "selected") {
                playUpgradeSelect();
                if (getPendingLevelUps() <= 0) {
                    // 所有升级处理完毕，检查是否应触发 BOSS
                    if (checkBossTrigger(getLevel())) {
                        startBossWarning();
                        curPhase = PHASE_BOSS_WARNING;
                    }
                    else {
                        curPhase = PHASE_PLAY;
                    }
                }
                // 仍有待处理升级时保持 PHASE_LEVEL_UP，新选项已自动生成
            }
            // "rerolled" 或 null 点击：保持当前状态
        }
        else if (curPhase === PHASE_GAME_OVER) {
            resetGameScore();
            resetLevel();
            initUpgrades();
            hero = new Hero();
            hero.setPhaseCallbacks(getCurPhase, setCurPhase);
            Bullet.clear();
            Enemy.clear();
            Enemy.resetNextId();
            Item.clear();
            Bullet.clear();
            clearSpecialWeapons();
            clearBoss();
            clearBullets();
            clearScoreEffects();
            clearDamageEffects();
            clearUpgradeUI();
            gameOverSoundPlayed = false;
            curPhase = PHASE_READY;
        }
    };
    ctx.fillStyle = "#963";
    ctx.font = `${Math.round(24 * fontScale)}px arial`;
    initUpgrades();
    hero = new Hero();
    hero.setPhaseCallbacks(getCurPhase, setCurPhase);
    pBg = paintBg();
    loadAnim = loading();
}
function gameEngine() {
    switch (curPhase) {
        case PHASE_READY:
            if (pBg)
                pBg();
            if (isSettingsOpen()) {
                drawSettings();
            }
            else {
                paintLogo();
            }
            break;
        case PHASE_LOADING:
            if (pBg)
                pBg();
            if (loadAnim)
                curPhase = loadAnim();
            break;
        case PHASE_PLAY:
            if (pBg)
                pBg();
            Enemy.drawEnemy();
            Item.drawItems();
            Bullet.drawBullet();
            if (hero)
                curPhase = hero.draw(curPhase);
            // 特殊武器更新+绘制
            if (hero) {
                updateAndDrawSpecialWeapons(hero.x, hero.y, heroImg[0].width, heroImg[0].height, curPhase, () => Enemy.getEnemyProxies(), (enemy, damage, isCrit, skipHitSound) => Enemy.applyDamage(enemy.id, damage, isCrit, skipHitSound), (enemyId, factor, frames) => Enemy.applySlow(enemyId, factor, frames));
            }
            drawScoreEffects();
            drawDamageEffects();
            break;
        case PHASE_BOSS_WARNING:
            if (pBg)
                pBg();
            Enemy.drawEnemy();
            Item.drawItems();
            Bullet.drawBullet();
            if (hero)
                curPhase = hero.draw(curPhase);
            // 特殊武器更新+绘制（预警期间仍可攻击）
            if (hero) {
                updateAndDrawSpecialWeapons(hero.x, hero.y, heroImg[0].width, heroImg[0].height, curPhase, () => Enemy.getEnemyProxies(), (enemy, damage, isCrit, skipHitSound) => Enemy.applyDamage(enemy.id, damage, isCrit, skipHitSound), (enemyId, factor, frames) => Enemy.applySlow(enemyId, factor, frames));
            }
            drawScoreEffects();
            drawDamageEffects();
            // BOSS 预警倒计时
            if (updateBossWarning()) {
                spawnBoss();
                curPhase = PHASE_BOSS;
            }
            else {
                // 绘制预警 UI（半透明红色遮罩，不阻挡交互）
                _drawBossWarningUI();
            }
            // 预警期间每 45 帧播放一次警报音效
            if (getBossWarningTimer() > 0 && getBossWarningTimer() % 45 === 0) {
                playBossWarning();
            }
            break;
        case PHASE_BOSS:
            if (pBg)
                pBg();
            Enemy.drawEnemy();
            Item.drawItems();
            Bullet.drawBullet();
            if (hero)
                curPhase = hero.draw(curPhase);
            // 特殊武器更新+绘制
            if (hero) {
                updateAndDrawSpecialWeapons(hero.x, hero.y, heroImg[0].width, heroImg[0].height, curPhase, () => Enemy.getEnemyProxies(), (enemy, damage, isCrit, skipHitSound) => Enemy.applyDamage(enemy.id, damage, isCrit, skipHitSound), (enemyId, factor, frames) => Enemy.applySlow(enemyId, factor, frames));
            }
            // BOSS 更新+绘制
            updateAndDrawBoss();
            // BOSS 弹幕更新+绘制
            updateAndDrawBullets();
            // 玩家子弹命中 BOSS
            _checkBulletsHitBoss();
            drawScoreEffects();
            drawDamageEffects();
            // BOSS 被击败 → 回到正常游戏
            if (!isBossAlive()) {
                clearBullets();
                curPhase = PHASE_PLAY;
            }
            break;
        case PHASE_LEVEL_UP:
            if (pBg)
                pBg();
            Enemy.drawEnemy();
            Item.drawItems();
            Bullet.drawBullet();
            if (hero)
                hero.draw(curPhase);
            drawScoreEffects();
            drawDamageEffects();
            drawUpgradeUI();
            break;
        case PHASE_PAUSE:
            drawPause();
            break;
        case PHASE_GAME_OVER:
            if (pBg)
                pBg();
            drawGameOver();
            if (!gameOverSoundPlayed) {
                playGameOver();
                gameOverSoundPlayed = true;
            }
            break;
    }
    // 调试面板（仅开发环境）
    if (isDebugMode()) {
        if (isDebugPanelVisible()) {
            drawDebugPanel();
        }
        else {
            drawDebugToggle();
        }
    }
}
loadSettings();
initDebugControls();
download(start);
const TARGET_DELTA = 50;
let lastTimestamp = 0;
function gameLoop(timestamp) {
    const delta = timestamp - lastTimestamp;
    if (delta >= TARGET_DELTA) {
        lastTimestamp = timestamp - (delta % TARGET_DELTA);
        gameEngine();
    }
    requestAnimationFrame(gameLoop);
}
// 调试用：外部触发 BOSS 预警阶段切换
function triggerBossPhase() {
    if (curPhase === PHASE_PLAY || curPhase === PHASE_LEVEL_UP) {
        // 根据玩家当前等级注册 BOSS 等级，确保 bossIndex 与玩家等级匹配
        registerDebugBossLevel(getLevel());
        startBossWarning();
        curPhase = PHASE_BOSS_WARNING;
    }
}
export { triggerBossPhase };
requestAnimationFrame(gameLoop);
