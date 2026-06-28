// UI 绘制模块：背景、logo、loading、暂停、游戏结束、得分动效
import { ctx, width, height, fontScale } from "./canvas.js";
import { bg, startImg, pause, gameLoad } from "./resources.js";
import { PHASE_LOADING, PHASE_PLAY } from "./constants.js";
import { getGameScore } from "./score.js";
import { getLevel, getTotalExp } from "./level.js";
import { t } from "./i18n.js";
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
        ctx.font = `bold ${Math.round(22 * fontScale)}px arial`;
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
// ========== 伤害浮动动效系统 ==========
// 子弹击中敌机时，在命中位置显示 "-X" 伤害数字，上浮并淡出
const damageEffects = [];
class DamageEffectObj {
    constructor(x, y, damage, fontSize, color, floatDistance, frames) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.fontSize = fontSize;
        this.color = color;
        this.floatDistance = floatDistance;
        this.frames = frames;
        this.frame = frames;
        this.removable = false;
    }
    update() {
        this.frame--;
        if (this.frame <= 0) {
            this.removable = true;
        }
    }
    // 当前实际渲染的 y 位置（含上浮进度），用于动态偏移计算
    getCurrentY() {
        const progress = 1 - this.frame / this.frames;
        return this.y - progress * this.floatDistance;
    }
    draw() {
        const floatY = this.getCurrentY();
        const alpha = 1 - (1 - this.frame / this.frames) * 0.8;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${this.fontSize}px arial`;
        ctx.textAlign = "center";
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = this.color;
        ctx.fillText("-" + this.damage, this.x, floatY);
        ctx.restore();
    }
}
// 添加伤害浮动动效：动态找空槽，避免与同 x 附近的现存动效重叠
//
// 【算法】"找空槽"而非"找最高"：
//   1. 收集同 x 附近（xRange 内）现存动效的当前 y（含上浮进度）
//   2. 从传入 y（敌机顶部，最自然位置）开始，依次尝试 y, y-stackOffset, y-2*stackOffset, ...
//   3. 找到第一个与所有现存动效当前 y 距离 >= stackOffset 的空槽，用作新动效起始 y
//   4. 优先用最低位置（最接近敌机），只有被占用才向上找
//
// 【不重叠的数学保证】所有动效上浮速度相同（每帧 floatDistance/frames），
//   因此两个动效的相对距离在整个生命周期内恒定 = 起始 y 差值。
//   只要起始间距 >= stackOffset（>fontSize），整个生命周期永不重叠。
//
// 【兜底】找不到不重叠的空槽时，跳过本次伤害文本显示（return），彻底避免重叠。
//   场景：大型敌机持续受击，连续命中动效起始 y 间距仅 ~6px（敌机下移 2px/帧 × 子弹间隔 3 帧），
//   远小于 stackOffset，向上找空槽很快跑出屏幕顶部。此时已有足够的伤害文本在显示，跳过不影响信息传达。
function addDamageEffect(x, y, damage, fontSize, color, floatDistance, frames, stackOffset) {
    const xRange = fontSize * 2; // x 检测范围：字号 2 倍（同 x 附近的动效才需要堆叠）
    // 【关键】只收集"屏幕内可见"的动效参与堆叠计算（curY >= 0）。
    // 已跑出屏幕顶部（curY < 0）的动效不可见，不占用空槽，否则会阻挡新动效找空槽导致兜底重叠。
    // 候选位置也限制在 y >= 0（屏幕内），避免动效堆叠到屏幕外不可见。
    // 【兜底】若所有可见空槽都被占用（极端情况），用传入 y 保证可见（可能轻微重叠但优先可见）。
    const visibleCeiling = 0; // 可见性阈值：curY >= 0 视为可见
    // 收集同 x 附近且可见（curY >= 0）的现存动效当前 y
    const occupiedY = [];
    for (const e of damageEffects) {
        if (e.removable)
            continue;
        const curY = e.getCurrentY();
        if (curY < visibleCeiling)
            continue; // 屏幕外不可见，不占用空槽
        if (Math.abs(e.x - x) > xRange)
            continue; // x 不在附近，不冲突
        occupiedY.push(curY);
    }
    // 从传入 y 开始向上找空槽：候选位置与所有可见占用位置距离 >= stackOffset
    // 候选位置也必须在屏幕内（>= visibleCeiling），避免堆叠到屏幕外
    // 若传入 y < 0（敌机在屏幕外），从 visibleCeiling 开始向上找
    const searchStartY = Math.max(y, visibleCeiling);
    let startY = searchStartY; // 默认用搜索起始 y（保证可见）
    let chosenSlot = -1; // -1 表示兜底
    for (let i = 0;; i++) {
        const candidateY = searchStartY - i * stackOffset;
        // 候选位置跑出屏幕顶部则停止，使用兜底
        if (candidateY < visibleCeiling)
            break;
        // 检查候选位置是否与任一可见现存动效距离 < stackOffset（冲突）
        const conflict = occupiedY.some(oy => Math.abs(oy - candidateY) < stackOffset);
        if (!conflict) {
            startY = candidateY;
            chosenSlot = i;
            break;
        }
        // 继续向上找下一个空槽
    }
    // 【关键】兜底（找不到不重叠的空槽）时跳过本次伤害文本显示，避免重叠。
    // 场景：大型敌机持续受击，敌机下移速度(2px/帧)远小于 stackOffset，
    // 连续命中的动效起始 y 间距仅 ~6px，向上找空槽时很快跑出屏幕顶部。
    // 此时已有足够的伤害文本在显示，跳过本次不会影响信息传达，且彻底避免重叠。
    if (chosenSlot === -1) {
        return; // 不产生新动效，避免重叠
    }
    damageEffects.push(new DamageEffectObj(x, startY, damage, fontSize, color, floatDistance, frames));
}
function drawDamageEffects() {
    for (let i = damageEffects.length - 1; i >= 0; i--) {
        damageEffects[i].update();
        if (damageEffects[i].removable) {
            damageEffects.splice(i, 1);
        }
        else {
            damageEffects[i].draw();
        }
    }
}
function clearDamageEffects() {
    damageEffects.length = 0;
}
// 画滚动背景
// 背景图拉伸到画布宽高，确保铺满整个屏幕（支持任意尺寸的设备）
// 使用 height 作为滚动周期，两张图交替滚动实现无缝循环
function paintBg() {
    let y = 0;
    return function () {
        ctx.drawImage(bg, 0, y, width, height);
        ctx.drawImage(bg, 0, y - height, width, height);
        y++;
        // 使用 >= 而非 ===：移动端地址栏显示/隐藏、横竖屏切换会导致画布尺寸缩小，
        // 若 y 已超过新 height，=== 比较永远不成立，y 无限递增使两张 drawImage 都画在画布外，
        // 画布不被覆盖，产生残影累积（子弹/敌机/战机残影不消失）
        if (y >= height)
            y = 0;
    };
}
// 画开始 logo（水平+垂直居中，避免大屏设备内容偏上）
function paintLogo() {
    ctx.drawImage(startImg, (width - startImg.width) / 2, (height - startImg.height) / 2);
}
// 加载动画
function loading() {
    let index = 0;
    return function () {
        index % 1 === 0 &&
            ctx.drawImage(gameLoad[Math.floor(index)], (width - gameLoad[0].width) / 2, height - gameLoad[0].height);
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
    ctx.font = `bold ${Math.round(40 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.fillText(t("gameOver.title"), width / 2, height / 2 - 80);
    ctx.font = `${Math.round(28 * fontScale)}px arial`;
    ctx.fillText(t("gameOver.score") + getGameScore(), width / 2, height / 2 - 30);
    ctx.fillStyle = "#fd0";
    ctx.font = `${Math.round(24 * fontScale)}px arial`;
    ctx.fillText(t("gameOver.level") + getLevel() + t("gameOver.totalExp") + getTotalExp(), width / 2, height / 2 + 10);
    ctx.font = `${Math.round(20 * fontScale)}px arial`;
    ctx.fillStyle = "#ccc";
    ctx.fillText(t("gameOver.restart"), width / 2, height / 2 + 60);
    ctx.textAlign = "left";
}
export { paintBg, paintLogo, loading, drawPause, drawGameOver, addScoreEffect, drawScoreEffects, clearScoreEffects, addDamageEffect, drawDamageEffects, clearDamageEffects };
