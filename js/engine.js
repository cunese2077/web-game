// 游戏主引擎
import { ctx, canvas, fontScale, width, height } from "./canvas.js";
import { download, heroImg } from "./resources.js";
import { PHASE_DOWNLOAD, PHASE_READY, PHASE_LOADING, PHASE_PLAY, PHASE_PAUSE, PHASE_GAME_OVER, PHASE_LEVEL_UP, PHASE_BOSS_WARNING, PHASE_BOSS, } from "./constants.js";
import { Hero, getSoundIconArea, getPauseBtnArea, getHeroBuffs, getDamageTaken } from "./hero.js";
import { getGameScore, resetGameScore } from "./score.js";
import { resetLevel, getLevel } from "./level.js";
import { initUpgrades, getPendingLevelUps, getBulletDamageWithBuff, getCritChance } from "./upgrade.js";
import Bullet from "./bullet.js";
import Enemy from "./enemy.js";
import Item from "./item.js";
import { paintBg, paintLogo, loading, drawPause, drawGameOver, drawSettings, getSettingsBtnArea, getGameDataBtnArea, handleSettingsClick, isGameDataOpen, openGameData, drawGameData, handleGameDataClick, getPauseBackBtnArea, getGameOverBackBtnArea, setMousePosition, addDamageEffect, drawScoreEffects, clearScoreEffects, drawDamageEffects, clearDamageEffects, resetGameOverAnim } from "./ui.js";
import { drawUpgradeUI, handleUpgradeClick, clearUpgradeUI } from "./upgradeUI.js";
import { updateAndDrawSpecialWeapons, clearSpecialWeapons } from "./specialWeapons.js";
import { checkBossTrigger, registerDebugBossLevel, startBossWarning, updateBossWarning, spawnBoss, updateAndDrawBoss, isBossAlive, clearBoss, getBossWarningTimer, getActiveBoss, getSessionBossKillCount } from "./boss.js";
import { updateAndDrawBullets, clearBullets } from "./enemyBullet.js";
import { resumeAudio, playGameOver, playUpgradeSelect, playEvolution, playBossWarning, startBgm, stopBgm } from "./audio.js";
import { loadSettings, isSettingsOpen, openSettings, closeSettings, toggleSound, getDifficulty } from "./settings.js";
import { t } from "./i18n.js";
import { tryUpdateHighScore, tryUpdateHighLevel } from "./record.js";
import { recordGameEnd } from "./achievement.js";
import { isDebugMode, isDebugPanelVisible, drawDebugPanel, drawDebugToggle, handleDebugClick, handleDebugToggleClick, initDebugControls } from "./debug.js";
let curPhase = PHASE_DOWNLOAD;
let hero = null;
let pBg = null;
let loadAnim = null;
let gameOverSoundPlayed = false;
let gameOverRecordUpdated = false;
// 进化全屏闪光动画（选中进化道具时触发）
let evolutionFlashFrames = 0;
const EVOLUTION_FLASH_DURATION = 30; // 1.5秒@20fps
// BOSS 击败慢动作效果
let bossDefeatSlowMo = 0;
let bossDefeatX = 0;
let bossDefeatY = 0;
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
// BOSS 击败爆炸演出（慢动作期间绘制）
function _drawBossExplosion() {
    const totalFrames = 35;
    const elapsed = totalFrames - bossDefeatSlowMo;
    const progress = elapsed / totalFrames; // 0→1
    ctx.save();
    // 1. 全屏白色闪光（前 1/3 时间内快速渐隐）
    if (progress < 0.4) {
        const flashAlpha = (1 - progress / 0.4) * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
    }
    // 2. 扩散冲击波（3 层环，从 BOSS 位置向外扩散）
    const maxRadius = Math.max(width, height) * 0.8;
    for (let i = 0; i < 3; i++) {
        const ringProgress = Math.min(1, progress + i * 0.1);
        if (ringProgress <= 0 || ringProgress >= 1)
            continue;
        const radius = ringProgress * maxRadius;
        const alpha = (1 - ringProgress) * 0.5;
        ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`;
        ctx.lineWidth = Math.max(1, 6 * (1 - ringProgress));
        ctx.beginPath();
        ctx.arc(bossDefeatX, bossDefeatY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    // 3. 中心爆炸光球（从大到小，橙→红→透明）
    const coreRadius = Math.max(1, (1 - progress) * 60);
    const coreAlpha = (1 - progress) * 0.8;
    const grad = ctx.createRadialGradient(bossDefeatX, bossDefeatY, 0, bossDefeatX, bossDefeatY, coreRadius);
    grad.addColorStop(0, `rgba(255, 255, 200, ${coreAlpha})`);
    grad.addColorStop(0.4, `rgba(255, 150, 50, ${coreAlpha * 0.8})`);
    grad.addColorStop(1, `rgba(200, 50, 0, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bossDefeatX, bossDefeatY, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    // 4. 放射粒子（12 个方向，向外飞散）
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 / particleCount) * i + progress * 0.5;
        const dist = progress * 120;
        const px = bossDefeatX + Math.cos(angle) * dist;
        const py = bossDefeatY + Math.sin(angle) * dist;
        const pSize = Math.max(1, 4 * (1 - progress));
        const pAlpha = (1 - progress) * 0.9;
        ctx.fillStyle = `rgba(255, ${Math.round(150 + 100 * (1 - progress))}, 50, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
    }
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
// 升级选择处理逻辑：onclick（桌面）与 touchend（移动端滑动选择）共享
// 提取为独立函数避免逻辑重复
function processUpgradeSelection(clickX, clickY) {
    const result = handleUpgradeClick(clickX, clickY);
    if (result === "selected" || result === "selected_evolution") {
        if (result === "selected_evolution") {
            playEvolution();
            evolutionFlashFrames = EVOLUTION_FLASH_DURATION;
        }
        else {
            playUpgradeSelect();
        }
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
function start() {
    curPhase = PHASE_READY;
    canvas.onmousemove = function (e) {
        setMousePosition(e.offsetX, e.offsetY);
    };
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
            // 游戏数据页面打开时：处理游戏数据页面点击
            if (isGameDataOpen()) {
                handleGameDataClick(clickX, clickY);
                return;
            }
            // 设置界面打开时：处理设置项点击或返回
            if (isSettingsOpen()) {
                const result = handleSettingsClick(clickX, clickY);
                if (result === "back") {
                    closeSettings();
                }
                return;
            }
            // 检查是否点击了设置按钮
            const btnArea = getSettingsBtnArea();
            if (clickX >= btnArea.x && clickX < btnArea.x + btnArea.w &&
                clickY >= btnArea.y && clickY < btnArea.y + btnArea.h) {
                openSettings();
                return;
            }
            // 检查是否点击了游戏数据按钮
            const gdArea = getGameDataBtnArea();
            if (clickX >= gdArea.x && clickX < gdArea.x + gdArea.w &&
                clickY >= gdArea.y && clickY < gdArea.y + gdArea.h) {
                openGameData();
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
            // 检查是否点击了暂停按钮
            const pauseArea = getPauseBtnArea();
            if (clickX >= pauseArea.x && clickX < pauseArea.x + pauseArea.w &&
                clickY >= pauseArea.y && clickY < pauseArea.y + pauseArea.h) {
                curPhase = PHASE_PAUSE;
            }
        }
        else if (curPhase === PHASE_LEVEL_UP) {
            // 升级选择界面点击处理（桌面端 onclick）
            processUpgradeSelection(clickX, clickY);
        }
        else if (curPhase === PHASE_PAUSE) {
            // 检查是否点击了返回主页面按钮
            const backArea = getPauseBackBtnArea();
            if (clickX >= backArea.x && clickX < backArea.x + backArea.w &&
                clickY >= backArea.y && clickY < backArea.y + backArea.h) {
                resetGameScore();
                resetLevel();
                initUpgrades();
                hero = new Hero();
                hero.setPhaseCallbacks(getCurPhase, setCurPhase);
                Bullet.clear();
                Enemy.clear();
                Enemy.resetNextId();
                Enemy.resetSessionKillCount();
                Item.clear();
                Bullet.clear();
                clearSpecialWeapons();
                clearBoss();
                clearBullets();
                clearScoreEffects();
                clearDamageEffects();
                clearUpgradeUI();
                gameOverSoundPlayed = false;
                gameOverRecordUpdated = false;
                evolutionFlashFrames = 0;
                resetGameOverAnim();
                bossDefeatSlowMo = 0;
                curPhase = PHASE_READY;
            }
            else {
                // 点击其他区域恢复游戏
                curPhase = PHASE_PLAY;
            }
        }
        else if (curPhase === PHASE_GAME_OVER) {
            // 检查是否点击了返回主页按钮
            const goBackArea = getGameOverBackBtnArea();
            if (clickX >= goBackArea.x && clickX < goBackArea.x + goBackArea.w &&
                clickY >= goBackArea.y && clickY < goBackArea.y + goBackArea.h) {
                // 返回主页（不重新开始）
                resetGameScore();
                resetLevel();
                initUpgrades();
                hero = new Hero();
                hero.setPhaseCallbacks(getCurPhase, setCurPhase);
                Bullet.clear();
                Enemy.clear();
                Enemy.resetNextId();
                Enemy.resetSessionKillCount();
                Item.clear();
                Bullet.clear();
                clearSpecialWeapons();
                clearBoss();
                clearBullets();
                clearScoreEffects();
                clearDamageEffects();
                clearUpgradeUI();
                gameOverSoundPlayed = false;
                gameOverRecordUpdated = false;
                evolutionFlashFrames = 0;
                resetGameOverAnim();
                bossDefeatSlowMo = 0;
                curPhase = PHASE_READY;
            }
            else {
                // 其他区域点击：重新开始游戏
                resetGameScore();
                resetLevel();
                initUpgrades();
                hero = new Hero();
                hero.setPhaseCallbacks(getCurPhase, setCurPhase);
                Bullet.clear();
                Enemy.clear();
                Enemy.resetNextId();
                Enemy.resetSessionKillCount();
                Item.clear();
                Bullet.clear();
                clearSpecialWeapons();
                clearBoss();
                clearBullets();
                clearScoreEffects();
                clearDamageEffects();
                clearUpgradeUI();
                gameOverSoundPlayed = false;
                gameOverRecordUpdated = false;
                evolutionFlashFrames = 0;
                resetGameOverAnim();
                bossDefeatSlowMo = 0;
                curPhase = PHASE_LOADING;
            }
        }
    };
    // 移动端升级卡片滑动选择：touchend 时根据释放位置选中卡片
    // viewport 已消除 300ms 延迟，但 onclick 仅在 touchstart/touchend 位移 < 10px 时合成，
    // 滑动选择（位移 > 10px）不会触发 click，需要 touchend 直接处理
    // 用途：用户可从屏幕任意位置按下，滑动到目标卡片释放即选中（不必精准点击）
    canvas.addEventListener("touchend", (e) => {
        if (curPhase !== PHASE_LEVEL_UP)
            return;
        if (e.changedTouches.length !== 1)
            return;
        const touch = e.changedTouches[0];
        const tapX = touch.pageX;
        const tapY = touch.pageY;
        // 阻止后续 onclick 合成，避免重复触发（移动端 PHASE_LEVEL_UP 完全由 touchend 处理）
        e.preventDefault();
        // 调试面板优先拦截（与 onclick 一致）
        if (handleDebugClick(tapX, tapY))
            return;
        if (handleDebugToggleClick(tapX, tapY))
            return;
        processUpgradeSelection(tapX, tapY);
    }, { passive: false });
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
            if (isGameDataOpen()) {
                drawGameData();
            }
            else if (isSettingsOpen()) {
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
            startBgm("normal"); // 幂等：战斗阶段保证普通 BGM 播放（BOSS 战后自动切回）
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
            // 精英敌机子弹更新+绘制
            updateAndDrawBullets();
            break;
        case PHASE_BOSS_WARNING:
            if (pBg)
                pBg();
            startBgm("boss"); // 幂等：BOSS 预警起切换紧张 BGM
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
            // 精英敌机子弹更新+绘制
            updateAndDrawBullets();
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
            startBgm("boss"); // 幂等：BOSS 战保持紧张 BGM
            if (bossDefeatSlowMo > 0) {
                // === 慢动作：BOSS 被击败后的爆炸演出 ===
                Enemy.drawEnemy(true);
                Item.drawItems(true);
                Bullet.drawBullet(true);
                if (hero)
                    hero.draw(PHASE_PAUSE); // 冻结 hero
                _drawBossExplosion();
                drawScoreEffects();
                drawDamageEffects();
                bossDefeatSlowMo--;
                if (bossDefeatSlowMo <= 0) {
                    clearBullets();
                    curPhase = PHASE_PLAY;
                }
            }
            else {
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
                // BOSS 被击败 → 启动慢动作演出
                if (!isBossAlive()) {
                    const boss = getActiveBoss();
                    if (boss) {
                        bossDefeatX = boss.x;
                        bossDefeatY = boss.y;
                    }
                    bossDefeatSlowMo = 35; // 1.75秒@20fps
                }
            }
            break;
        case PHASE_LEVEL_UP:
            if (pBg)
                pBg();
            Enemy.drawEnemy(true); // 冻结：不移动、不射击、不碰撞
            Item.drawItems(true); // 冻结：道具不下落
            Bullet.drawBullet(true); // 冻结：子弹不移动
            if (hero)
                hero.draw(curPhase);
            drawScoreEffects();
            drawDamageEffects();
            drawUpgradeUI();
            break;
        case PHASE_PAUSE:
            // 暂停时停止 BGM（恢复 PLAY 时由 startBgm 重启）
            stopBgm();
            // 先绘制冻结的游戏画面（所有实体只绘制不更新）
            if (pBg)
                pBg();
            Enemy.drawEnemy(true);
            Item.drawItems(true);
            Bullet.drawBullet(true);
            if (hero)
                hero.draw(curPhase);
            drawScoreEffects();
            drawDamageEffects();
            drawUpgradeUI();
            // 再叠加暂停 UI
            drawPause();
            break;
        case PHASE_GAME_OVER:
            // 游戏结束停止 BGM
            stopBgm();
            if (!gameOverRecordUpdated) {
                tryUpdateHighScore(getGameScore());
                tryUpdateHighLevel(getLevel());
                recordGameEnd(getGameScore(), getLevel(), Enemy.getSessionKillCount(), getSessionBossKillCount(), getDifficulty(), getDamageTaken());
                gameOverRecordUpdated = true;
            }
            if (pBg)
                pBg();
            drawGameOver();
            if (!gameOverSoundPlayed) {
                playGameOver();
                gameOverSoundPlayed = true;
            }
            break;
    }
    // 进化全屏闪光（绘制在最上层，调试面板之下）
    if (evolutionFlashFrames > 0) {
        evolutionFlashFrames--;
        const progress = 1 - evolutionFlashFrames / EVOLUTION_FLASH_DURATION;
        // 前半段：白色爆闪渐隐；后半段：紫色脉冲渐隐
        let alpha;
        let color;
        if (progress < 0.3) {
            alpha = 0.7 * (1 - progress / 0.3);
            color = `rgba(255, 255, 255, ${alpha})`;
        }
        else {
            const pulse = 0.5 + 0.5 * Math.sin(evolutionFlashFrames * 0.4);
            alpha = 0.3 * (1 - (progress - 0.3) / 0.7) * pulse;
            color = `rgba(180, 80, 255, ${alpha})`;
        }
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
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
