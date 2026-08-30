// 结算面板模块：游戏结束界面（得分/等级/新纪录 + Build 摘要 + 成就 + 底部按钮）
// 从 ui.ts 拆出（保持函数签名不变，ui.ts 统一 re-export）
import { ctx, width, height, fontScale } from "./canvas.js";
import { getGameScore } from "./score.js";
import { getLevel, getTotalExp } from "./level.js";
import { getBuildSummary } from "./upgrade.js";
import { getHighScore, getHighLevel } from "./record.js";
import { getStats, getLastGame, getAchievementDefs } from "./achievement.js";
import { t } from "./i18n.js";
// 游戏结束界面返回主页按钮点击区域
let gameOverBackBtnX = 0;
let gameOverBackBtnW = 0;
let gameOverBackBtnY = 0;
let gameOverBackBtnH = 0;
function getGameOverBackBtnArea() {
    return { x: gameOverBackBtnX, y: gameOverBackBtnY, w: gameOverBackBtnW, h: gameOverBackBtnH };
}
// 结算入场动画帧计数器
let gameOverAnimFrame = 0;
function resetGameOverAnim() {
    gameOverAnimFrame = 0;
}
// 稀有度颜色（Build 摘要条目）
function rarityColor(rarity) {
    if (rarity === "legendary")
        return "#ffd700";
    if (rarity === "epic")
        return "#c64fff";
    if (rarity === "rare")
        return "#4a9eff";
    return "#ccc";
}
// 绘制一组 Build 条目（左侧标题 + 右侧条目列表），返回下一组起始 Y
function drawGroup(title, entries, startY, cx, halfW, itemFontSize, lineHeight) {
    if (entries.length === 0)
        return startY;
    ctx.font = `bold ${itemFontSize}px arial`;
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "left";
    ctx.fillText(t(title), cx - halfW, startY);
    let y = startY + lineHeight;
    for (const entry of entries) {
        const nameStr = t(entry.label);
        const levelStr = entry.type === "weapon" ? `Lv${entry.level}` : `×${entry.level}`;
        ctx.fillStyle = rarityColor(entry.rarity);
        ctx.font = `${itemFontSize}px arial`;
        ctx.fillText(nameStr, cx - halfW + Math.round(4 * fontScale), y);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.fillText(levelStr, cx + halfW, y);
        ctx.textAlign = "left";
        y += lineHeight;
    }
    return y;
}
// 画游戏结束界面（含 Build 摘要）
function drawGameOver() {
    gameOverAnimFrame++;
    // 入场动画辅助函数
    const animAlpha = (start, dur) => {
        if (gameOverAnimFrame < start)
            return 0;
        if (gameOverAnimFrame >= start + dur)
            return 1;
        return (gameOverAnimFrame - start) / dur;
    };
    const animOffset = (start, dur, dist) => {
        if (gameOverAnimFrame < start)
            return -dist;
        if (gameOverAnimFrame >= start + dur)
            return 0;
        return -dist * (1 - (gameOverAnimFrame - start) / dur);
    };
    // 遮罩渐入
    const overlayAlpha = animAlpha(0, 8) * 0.7;
    ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
    ctx.fillRect(0, 0, width, height);
    const cx = width / 2;
    let curY = height * 0.12;
    // === 上半部分：标题+得分+等级+纪录（渐入+下滑）===
    const topAlpha = animAlpha(4, 12);
    const topOffset = animOffset(4, 12, 25);
    ctx.save();
    ctx.globalAlpha = topAlpha;
    ctx.textAlign = "center";
    ctx.translate(0, topOffset);
    // 标题
    ctx.fillStyle = "#f44";
    ctx.font = `bold ${Math.round(36 * fontScale)}px arial`;
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 10;
    ctx.fillText(t("gameOver.title"), cx, curY);
    ctx.shadowBlur = 0;
    curY += Math.round(40 * fontScale);
    // 得分
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(26 * fontScale)}px arial`;
    ctx.fillText(t("gameOver.score") + getGameScore(), cx, curY);
    curY += Math.round(28 * fontScale);
    // 等级 + 总经验
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.round(20 * fontScale)}px arial`;
    ctx.fillText(t("gameOver.level") + getLevel() + t("gameOver.totalExp") + getTotalExp(), cx, curY);
    curY += Math.round(24 * fontScale);
    // 历史最高分/最高等级（新纪录时醒目提示）
    const score = getGameScore();
    const level = getLevel();
    const highScore = getHighScore();
    const highLevel = getHighLevel();
    const isNewScore = score >= highScore && score > 0;
    const isNewLevel = level >= highLevel && level > 1;
    if (isNewScore || isNewLevel) {
        // 新纪录醒目提示：大字 + 发光 + 星号装饰（增大与上方的距离）
        curY += Math.round(6 * fontScale);
        ctx.save();
        ctx.font = `bold ${Math.round(24 * fontScale)}px arial`;
        ctx.textAlign = "center";
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "#ffd700";
        if (isNewScore && isNewLevel) {
            ctx.fillText("★ " + t("gameOver.newRecord") + " ★", cx, curY);
        }
        else if (isNewScore) {
            ctx.fillText(t("gameOver.highScore") + " " + t("gameOver.newRecord"), cx, curY);
        }
        else {
            ctx.fillText(t("gameOver.highLevel") + " " + t("gameOver.newRecord"), cx, curY);
        }
        ctx.restore();
        curY += Math.round(30 * fontScale);
    }
    ctx.font = `${Math.round(16 * fontScale)}px arial`;
    if (highScore > 0) {
        ctx.fillStyle = "#888";
        ctx.fillText(t("gameOver.highScore") + highScore, cx, curY);
        curY += Math.round(22 * fontScale);
    }
    if (highLevel > 0) {
        ctx.fillStyle = "#888";
        ctx.fillText(t("gameOver.highLevel") + highLevel, cx, curY);
        curY += Math.round(22 * fontScale);
    }
    ctx.restore(); // 上半部分动画结束
    // === 下半部分：Build摘要+成就+统计+按钮（延迟渐入）===
    const bottomAlpha = animAlpha(14, 12);
    const bottomOffset = animOffset(14, 12, 20);
    ctx.save();
    ctx.globalAlpha = bottomAlpha;
    ctx.textAlign = "center";
    ctx.translate(0, bottomOffset);
    curY += Math.round(4 * fontScale);
    // === Build 摘要 ===
    const build = getBuildSummary();
    if (build.length > 0) {
        // 分隔线
        ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - width * 0.35, curY);
        ctx.lineTo(cx + width * 0.35, curY);
        ctx.stroke();
        curY += Math.round(36 * fontScale); // 分隔线到标题的间距
        // Build 摘要标题
        ctx.fillStyle = "#ffd700";
        ctx.font = `bold ${Math.round(18 * fontScale)}px arial`;
        ctx.fillText(t("gameOver.build"), cx, curY);
        curY += Math.round(22 * fontScale);
        // 分为武器和被动两组
        const weapons = build.filter(e => e.type === "weapon");
        const passives = build.filter(e => e.type !== "weapon");
        const itemFontSize = Math.round(14 * fontScale);
        const lineHeight = Math.round(20 * fontScale);
        const halfW = width * 0.42;
        // 左列：武器，右列：被动
        const leftStartY = curY;
        // 绘制左列
        let nextY = leftStartY;
        if (weapons.length > 0) {
            nextY = drawGroup("gameOver.weapons", weapons, nextY, cx, halfW, itemFontSize, lineHeight);
        }
        // 绘制右列（如果两列不并排，就顺序放）
        if (passives.length > 0) {
            nextY = drawGroup("gameOver.passives", passives, nextY, cx, halfW, itemFontSize, lineHeight);
        }
        // 先计算两列高度，取较大值
        const leftH = weapons.length > 0 ? (1 + weapons.length) * lineHeight : 0;
        const rightH = passives.length > 0 ? (1 + passives.length) * lineHeight : 0;
        curY = Math.max(nextY, leftStartY + Math.max(leftH, rightH)) + Math.round(8 * fontScale);
    }
    // === 成就展示（本局新解锁/升档的成就） ===
    const stats = getStats();
    const lastGame = getLastGame();
    const achDefs = getAchievementDefs();
    const achHalfW = width * 0.42;
    // 显示本局新解锁或升档的成就
    const newTierMap = new Map();
    for (const nt of lastGame.newAchievementTiers) {
        newTierMap.set(nt.id, nt.tier);
    }
    const tierColors = ["#444", "#cd7f32", "#c0c0c0", "#ffd700"]; // 未解锁/铜/银/金
    const tierSymbols = ["☆", "◈", "◆", "★"];
    if (newTierMap.size > 0) {
        // 分隔线
        ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - width * 0.35, curY);
        ctx.lineTo(cx + width * 0.35, curY);
        ctx.stroke();
        curY += Math.round(16 * fontScale); // 分隔线到标题的间距
        ctx.fillStyle = "#ffd700";
        ctx.font = `bold ${Math.round(14 * fontScale)}px arial`;
        ctx.fillText(t("gameOver.achievements") + " " + newTierMap.size, cx, curY);
        curY += Math.round(18 * fontScale);
        // 本局新解锁/升档成就列表
        const achFontSize = Math.round(12 * fontScale);
        const achLineH = Math.round(16 * fontScale);
        ctx.font = `${achFontSize}px arial`;
        for (const [achId, tier] of newTierMap) {
            const ach = achDefs.find(d => d.id === achId);
            if (!ach)
                continue;
            ctx.textAlign = "left";
            ctx.fillStyle = tierColors[tier];
            ctx.fillText(tierSymbols[tier] + " " + t(ach.label), cx - achHalfW, curY);
            curY += achLineH;
            // 限制显示数量，避免界面过长
            if (curY > height * 0.82)
                break;
        }
        curY += Math.round(4 * fontScale);
    }
    // === 统计摘要（本局数据） ===
    {
        ctx.font = `${Math.round(12 * fontScale)}px arial`;
        ctx.fillStyle = "#777";
        ctx.textAlign = "center";
        const statLine = `${t("gameOver.stats")}${stats.totalGames}：${t("gameData.highLevel")} ${lastGame.level} | ${t("gameData.killsCol")} ${lastGame.kills} | ${t("gameData.bossKillsCol")} ${lastGame.bossKills}`;
        ctx.fillText(statLine, cx, curY);
        curY += Math.round(14 * fontScale);
    }
    // 底部按钮行：重新开始 + 返回主页，同一行居中，交替闪烁
    const bottomY = height * 0.92;
    const bottomFontSize = Math.round(16 * fontScale);
    ctx.font = `${bottomFontSize}px arial`;
    ctx.fillStyle = "#ccc";
    const blinkAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
    const gap = Math.round(30 * fontScale);
    const restartText = t("gameOver.restart");
    const backText = t("pause.backToMain");
    const restartW = ctx.measureText(restartText).width;
    const backW = ctx.measureText(backText).width;
    const totalW = restartW + gap + backW;
    const startX = cx - totalW / 2;
    // 重新开始（左侧，闪烁）
    ctx.textAlign = "left";
    ctx.globalAlpha = blinkAlpha;
    ctx.fillText(restartText, startX, bottomY);
    ctx.globalAlpha = 1;
    // 返回主页（右侧，闪烁）
    ctx.globalAlpha = blinkAlpha;
    ctx.fillText(backText, startX + restartW + gap, bottomY);
    ctx.globalAlpha = 1;
    // 记录返回主页点击区域
    gameOverBackBtnX = startX + restartW + gap - Math.round(8 * fontScale);
    gameOverBackBtnW = backW + Math.round(16 * fontScale);
    gameOverBackBtnY = bottomY - bottomFontSize;
    gameOverBackBtnH = Math.round(24 * fontScale);
    ctx.restore();
}
export { drawGameOver, getGameOverBackBtnArea, resetGameOverAnim };
