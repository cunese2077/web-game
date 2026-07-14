// 游戏主引擎
import { canvas, ctx, fontScale } from "./canvas.js";
import { download } from "./resources.js";
import { PHASE_DOWNLOAD, PHASE_READY, PHASE_LOADING, PHASE_PLAY, PHASE_PAUSE, PHASE_GAME_OVER, PHASE_LEVEL_UP, } from "./constants.js";
import { Hero, getSoundIconArea } from "./hero.js";
import { resetGameScore } from "./score.js";
import { resetLevel } from "./level.js";
import { initUpgrades, getPendingLevelUps } from "./upgrade.js";
import Bullet from "./bullet.js";
import Enemy from "./enemy.js";
import Item from "./item.js";
import { paintBg, paintLogo, loading, drawPause, drawGameOver, drawSettings, getSettingsBtnArea, handleSettingsClick, drawScoreEffects, clearScoreEffects, drawDamageEffects, clearDamageEffects } from "./ui.js";
import { drawUpgradeUI, handleUpgradeClick, clearUpgradeUI } from "./upgradeUI.js";
import { resumeAudio, playGameOver, playUpgradeSelect } from "./audio.js";
import { loadSettings, isSettingsOpen, openSettings, closeSettings, toggleSound } from "./settings.js";
let curPhase = PHASE_DOWNLOAD;
let hero = null;
let pBg = null;
let loadAnim = null;
let gameOverSoundPlayed = false;
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
                    curPhase = PHASE_PLAY;
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
            drawScoreEffects();
            drawDamageEffects();
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
}
loadSettings();
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
requestAnimationFrame(gameLoop);
