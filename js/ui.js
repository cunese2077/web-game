// UI 绘制模块：背景、logo、loading、暂停、游戏结束、得分动效
import { ctx, width, height } from "./canvas.js";
import { bg, startImg, pause, gameLoad } from "./resources.js";
import { PHASE_LOADING, PHASE_PLAY } from "./constants.js";
import { getGameScore } from "./score.js";
// ========== 得分动效系统 ==========
const scoreEffects = [];
const SCORE_EFFECT_FRAMES = 30;
class ScoreEffectObj {
    constructor(x, y, score) {
        this.x = x;
        this.y = y;
        this.score = score;
        this.frame = SCORE_EFFECT_FRAMES;
        this.removable = false;
    }
    update() {
        this.frame--;
        if (this.frame <= 0) {
            this.removable = true;
        }
    }
    draw() {
        const progress = 1 - this.frame / SCORE_EFFECT_FRAMES;
        const floatY = this.y - progress * 40;
        const alpha = 1 - progress * 0.8;
        const scale = 1 + progress * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, floatY);
        ctx.scale(scale, scale);
        ctx.font = "bold 22px arial";
        ctx.textAlign = "center";
        ctx.shadowColor = this.score >= 100 ? "#ff0" : this.score >= 20 ? "#f80" : "#fff";
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.score >= 100 ? "#ff0" : this.score >= 20 ? "#f80" : "#fff";
        ctx.fillText("+" + this.score, 0, 0);
        ctx.restore();
    }
}
function addScoreEffect(x, y, score) {
    scoreEffects.push(new ScoreEffectObj(x, y, score));
}
function drawScoreEffects() {
    for (let i = scoreEffects.length - 1; i >= 0; i--) {
        scoreEffects[i].update();
        if (scoreEffects[i].removable) {
            scoreEffects.splice(i, 1);
        }
        else {
            scoreEffects[i].draw();
        }
    }
}
function clearScoreEffects() {
    scoreEffects.length = 0;
}
// 画滚动背景
function paintBg() {
    let y = 0;
    return function () {
        ctx.drawImage(bg, 0, y);
        ctx.drawImage(bg, 0, y - 852);
        y++ === 852 && (y = 0);
    };
}
// 画开始 logo
function paintLogo() {
    ctx.drawImage(startImg, 40, 0);
}
// 加载动画
function loading() {
    let index = 0;
    return function () {
        index % 1 === 0 &&
            ctx.drawImage(gameLoad[Math.floor(index)], 0, height - gameLoad[0].height);
        index += 0.5;
        if (index > 3) {
            index = 0;
            return PHASE_PLAY;
        }
        return PHASE_LOADING;
    };
}
// 画暂停图标
function drawPause() {
    ctx.drawImage(pause, (width - pause.width) / 2, (height - pause.height) / 2);
}
// 画游戏结束界面
function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", width / 2, height / 2 - 60);
    ctx.font = "28px arial";
    ctx.fillText("SCORE: " + getGameScore(), width / 2, height / 2);
    ctx.font = "20px arial";
    ctx.fillStyle = "#ccc";
    ctx.fillText("Click to Restart", width / 2, height / 2 + 50);
    ctx.textAlign = "left";
}
export { paintBg, paintLogo, loading, drawPause, drawGameOver, addScoreEffect, drawScoreEffects, clearScoreEffects };
