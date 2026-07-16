// 升级选择界面模块 - PHASE_LEVEL_UP 时显示 3 选 1 卡片 + 刷新按钮
import { ctx, width, height, fontScale } from "./canvas.js";
import { getCurrentOffers, getRerollsLeft, rerollOffers, applyUpgrade } from "./upgrade.js";
import { t } from "./i18n.js";
let cardHitAreas = [];
let rerollHitArea = null;
// ========== 稀有度颜色 ==========
function getRarityColors(rarity) {
    switch (rarity) {
        case "rare": return { border: "#4af", glow: "#4af", bg: "rgba(68,170,255,0.15)", tag: "rgba(68,170,255,0.35)", label: "upgrade.rarity.rare" };
        case "epic": return { border: "#c6f", glow: "#c6f", bg: "rgba(204,102,255,0.15)", tag: "rgba(204,102,255,0.35)", label: "upgrade.rarity.epic" };
        case "legendary": return { border: "#fd0", glow: "#fd0", bg: "rgba(255,215,0,0.15)", tag: "rgba(255,215,0,0.35)", label: "upgrade.rarity.legendary" };
        default: return { border: "#aaa", glow: "#fff", bg: "rgba(255,255,255,0.08)", tag: "rgba(170,170,170,0.25)", label: "upgrade.rarity.common" };
    }
}
// ========== 卡片布局计算 ==========
function calcLayout() {
    const gap = Math.round(8 * fontScale);
    const maxCardW = Math.round(120 * fontScale);
    const padding = Math.round(16 * fontScale);
    // 自适应宽度：确保 3 张卡片 + 2 个间距不超出画布
    const cardW = Math.min(maxCardW, (width - padding * 2 - gap * 2) / 3);
    const cardH = Math.round(170 * fontScale);
    const totalW = cardW * 3 + gap * 2;
    const startX = (width - totalW) / 2;
    const startY = (height - cardH) / 2 - Math.round(20 * fontScale);
    return { cardW, cardH, gap, startX, startY };
}
// ========== 绘制升级选择界面 ==========
function drawUpgradeUI() {
    const offers = getCurrentOffers();
    if (offers.length === 0)
        return;
    const { cardW, cardH, gap, startX, startY } = calcLayout();
    // 半透明遮罩
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.textAlign = "center";
    // 标题
    ctx.fillStyle = "#fd0";
    ctx.font = `bold ${Math.round(28 * fontScale)}px arial`;
    ctx.shadowColor = "#fd0";
    ctx.shadowBlur = 12;
    const titleY = startY - Math.round(36 * fontScale);
    ctx.fillText(t("upgrade.title"), width / 2, titleY);
    ctx.shadowBlur = 0;
    // 提示文案：标题下方单行，水平居中
    const hintFontSize = Math.round(11 * fontScale);
    ctx.font = `${hintFontSize}px arial`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    const rerollsLeft = getRerollsLeft();
    const hintText = t("upgrade.hint.select") + "  ·  " + t("upgrade.hint.random") + "  ·  " + t("upgrade.hint.reroll") + " " + rerollsLeft + " " + t("upgrade.hint.times");
    ctx.fillText(hintText, width / 2, titleY + Math.round(18 * fontScale));
    // 绘制卡片
    cardHitAreas = [];
    for (let i = 0; i < offers.length; i++) {
        const cx = startX + i * (cardW + gap);
        _drawCard(offers[i], cx, startY, cardW, cardH, i);
    }
    // 刷新按钮（rerollsLeft 已在上方提示文案中声明）
    const btnW = Math.round(100 * fontScale);
    const btnH = Math.round(36 * fontScale);
    const btnX = (width - btnW) / 2;
    const btnY = startY + cardH + Math.round(20 * fontScale);
    const canReroll = rerollsLeft > 0;
    ctx.fillStyle = canReroll ? "rgba(255,215,0,0.2)" : "rgba(100,100,100,0.15)";
    _roundRect(btnX, btnY, btnW, btnH, Math.round(6 * fontScale));
    ctx.fill();
    ctx.strokeStyle = canReroll ? "#fd0" : "#666";
    ctx.lineWidth = Math.max(1, Math.round(1.5 * fontScale));
    _roundRect(btnX, btnY, btnW, btnH, Math.round(6 * fontScale));
    ctx.stroke();
    ctx.fillStyle = canReroll ? "#fd0" : "#666";
    ctx.font = `bold ${Math.round(16 * fontScale)}px arial`;
    ctx.fillText(t("upgrade.reroll") + " (" + rerollsLeft + ")", width / 2, btnY + btnH / 2 + Math.round(6 * fontScale));
    rerollHitArea = canReroll ? { x: btnX, y: btnY, w: btnW, h: btnH } : null;
    ctx.restore();
}
// ========== 绘制单张卡片 ==========
function _drawCard(offer, x, y, w, h, index) {
    const colors = getRarityColors(offer.def.rarity);
    const r = Math.round(8 * fontScale);
    // 卡片背景
    ctx.fillStyle = "rgba(20, 20, 40, 0.9)";
    _roundRect(x, y, w, h, r);
    ctx.fill();
    // 稀有度发光边框
    ctx.save();
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = Math.max(1, Math.round(2 * fontScale));
    _roundRect(x, y, w, h, r);
    ctx.stroke();
    ctx.restore();
    // 稀有度背景高光
    ctx.fillStyle = colors.bg;
    _roundRect(x + 2, y + 2, w - 4, h - 4, Math.max(1, r - 2));
    ctx.fill();
    // 稀有度标签（右上角 tag）
    const rarityText = t(colors.label);
    const tagFontSize = Math.round(9 * fontScale);
    ctx.font = `bold ${tagFontSize}px arial`;
    const tagWidth = ctx.measureText(rarityText).width + Math.round(6 * fontScale) * 2;
    const tagHeight = Math.round(16 * fontScale);
    const tagX = x + w - tagWidth - Math.round(4 * fontScale);
    const tagY = y + Math.round(4 * fontScale);
    ctx.fillStyle = colors.tag;
    _roundRect(tagX, tagY, tagWidth, tagHeight, Math.round(3 * fontScale));
    ctx.fill();
    ctx.fillStyle = colors.border;
    ctx.textAlign = "center";
    ctx.fillText(rarityText, tagX + tagWidth / 2, tagY + tagHeight / 2 + tagFontSize * 0.35);
    // BOSS 传说标识（左上角，仅传说稀有度显示）
    if (offer.def.rarity === "legendary") {
        const bossText = t("upgrade.boss");
        const bossFontSize = Math.round(9 * fontScale);
        ctx.font = `bold ${bossFontSize}px arial`;
        const bossTagWidth = ctx.measureText(bossText).width + Math.round(6 * fontScale) * 2;
        const bossTagHeight = Math.round(16 * fontScale);
        const bossTagX = x + Math.round(4 * fontScale);
        const bossTagY = y + Math.round(4 * fontScale);
        // 金色背景 + 脉冲发光
        ctx.save();
        ctx.shadowColor = "#fd0";
        ctx.shadowBlur = 6;
        ctx.fillStyle = "rgba(255, 170, 0, 0.6)";
        _roundRect(bossTagX, bossTagY, bossTagWidth, bossTagHeight, Math.round(3 * fontScale));
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(bossText, bossTagX + bossTagWidth / 2, bossTagY + bossTagHeight / 2 + bossFontSize * 0.35);
    }
    const contentX = x + Math.round(8 * fontScale);
    const contentW = w - Math.round(16 * fontScale);
    const centerX = x + w / 2;
    // 图标区域：留出稀有度标签空间 + 适当顶部间距，整体视觉居中
    const iconY = y + Math.round(36 * fontScale);
    const iconCenterY = iconY + Math.round(16 * fontScale);
    const iconBottom = _drawIcon(offer.def.icon, centerX, iconCenterY, colors.border);
    // "新!" 标签绘制在图标右侧，水平居中对齐图标中心
    if (offer.isNew) {
        const newFontSize = Math.round(10 * fontScale);
        ctx.font = `bold ${newFontSize}px arial`;
        const newText = t("upgrade.new");
        const newWidth = ctx.measureText(newText).width;
        // 图标半宽约 14*fontScale，"新!" 放在图标右边缘外 + 间距
        const iconHalfW = Math.round(14 * fontScale);
        const newX = centerX + iconHalfW + Math.round(4 * fontScale);
        // 背景 pill
        const pillPad = Math.round(3 * fontScale);
        const pillW = newWidth + pillPad * 2;
        const pillH = newFontSize + pillPad * 2;
        const pillX = newX - pillPad;
        const pillY = iconCenterY - pillH / 2;
        ctx.fillStyle = "rgba(255, 68, 68, 0.85)";
        _roundRect(pillX, pillY, pillW, pillH, Math.round(3 * fontScale));
        ctx.fill();
        // 文字
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.fillText(newText, newX, iconCenterY + newFontSize * 0.35);
    }
    // 文字从图标底部 + 间距开始排列，不受"新!"标签影响
    // 需要额外留出字体 ascent 空间（基线上方约 0.85 × fontSize）
    const iconTextGap = Math.round(24 * fontScale);
    let textY = iconBottom + iconTextGap;
    // 名称
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(14 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.fillText(t(offer.def.label), centerX, textY);
    textY += Math.round(20 * fontScale);
    // 等级信息
    const isMaxLevel = offer.nextLevel >= offer.def.maxLevel;
    if (isMaxLevel) {
        ctx.fillStyle = "#fd0";
        ctx.font = `${Math.round(11 * fontScale)}px arial`;
        ctx.fillText(t("upgrade.maxLevel"), centerX, textY);
    }
    else {
        ctx.fillStyle = "#aaa";
        ctx.font = `${Math.round(11 * fontScale)}px arial`;
        ctx.fillText(t("upgrade.lv") + " " + offer.currentLevel + " → " + offer.nextLevel, centerX, textY);
    }
    textY += Math.round(16 * fontScale);
    // 描述
    const descIdx = Math.min(Math.max(offer.currentLevel - 1, 0), offer.def.descriptions.length - 1);
    const descKey = offer.def.descriptions[descIdx];
    if (descKey) {
        ctx.fillStyle = "#ccc";
        ctx.font = `${Math.round(11 * fontScale)}px arial`;
        ctx.textAlign = "center";
        _wrapText(t(descKey), contentX, textY, contentW, Math.round(14 * fontScale));
    }
    // 记录点击区域
    cardHitAreas.push({ x, y, w, h, offerIndex: index });
}
// ========== 绘制图标（Canvas 几何图形） ==========
// 返回图标底部 y 坐标，用于后续文本布局
function _drawIcon(icon, cx, cy, color) {
    ctx.save();
    const size = Math.round(14 * fontScale);
    switch (icon) {
        case "bullet": {
            // 子弹：向上箭头，底部 = cy + size
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(cx, cy - size);
            ctx.lineTo(cx + size * 0.6, cy + size * 0.3);
            ctx.lineTo(cx + size * 0.2, cy + size * 0.1);
            ctx.lineTo(cx + size * 0.2, cy + size);
            ctx.lineTo(cx - size * 0.2, cy + size);
            ctx.lineTo(cx - size * 0.2, cy + size * 0.1);
            ctx.lineTo(cx - size * 0.6, cy + size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            return cy + size;
        }
        case "heart": {
            // 心形，底部 = cy + s
            ctx.fillStyle = "#f44";
            const s = size * 0.8;
            ctx.beginPath();
            ctx.moveTo(cx, cy + s * 0.3);
            ctx.bezierCurveTo(cx, cy - s * 0.3, cx - s, cy - s * 0.3, cx - s, cy + s * 0.1);
            ctx.bezierCurveTo(cx - s, cy + s * 0.6, cx, cy + s, cx, cy + s);
            ctx.bezierCurveTo(cx, cy + s, cx + s, cy + s * 0.6, cx + s, cy + s * 0.1);
            ctx.bezierCurveTo(cx + s, cy - s * 0.3, cx, cy - s * 0.3, cx, cy + s * 0.3);
            ctx.fill();
            ctx.restore();
            return cy + s;
        }
        case "sword": {
            // 剑，底部 = cy + size * 0.4
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(cx, cy - size);
            ctx.lineTo(cx + size * 0.15, cy - size * 0.2);
            ctx.lineTo(cx - size * 0.15, cy - size * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(cx - size * 0.3, cy - size * 0.2, size * 0.6, Math.max(1, Math.round(3 * fontScale)));
            ctx.fillRect(cx - size * 0.08, cy - size * 0.2, size * 0.16, size * 0.6);
            ctx.restore();
            return cy + size * 0.4;
        }
        case "lightning": {
            // 闪电，底部 = cy + s
            ctx.fillStyle = "#ff0";
            const s = size * 0.9;
            ctx.beginPath();
            ctx.moveTo(cx + s * 0.1, cy - s);
            ctx.lineTo(cx - s * 0.4, cy + s * 0.1);
            ctx.lineTo(cx, cy + s * 0.05);
            ctx.lineTo(cx - s * 0.1, cy + s);
            ctx.lineTo(cx + s * 0.4, cy - s * 0.1);
            ctx.lineTo(cx, cy - s * 0.05);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            return cy + s;
        }
        case "boot": {
            // 双向箭头（移速），底部 = cy + s * 0.5
            ctx.fillStyle = color;
            const s = size * 0.7;
            ctx.beginPath();
            ctx.moveTo(cx - s, cy);
            ctx.lineTo(cx - s * 0.4, cy - s * 0.5);
            ctx.lineTo(cx - s * 0.4, cy - s * 0.15);
            ctx.lineTo(cx + s * 0.4, cy - s * 0.15);
            ctx.lineTo(cx + s * 0.4, cy - s * 0.5);
            ctx.lineTo(cx + s, cy);
            ctx.lineTo(cx + s * 0.4, cy + s * 0.5);
            ctx.lineTo(cx + s * 0.4, cy + s * 0.15);
            ctx.lineTo(cx - s * 0.4, cy + s * 0.15);
            ctx.lineTo(cx - s * 0.4, cy + s * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            return cy + s * 0.5;
        }
        case "missile": {
            // 追踪导弹：橙红色导弹 + 尾焰，底部 = cy + size
            ctx.fillStyle = "#f74";
            ctx.beginPath();
            ctx.moveTo(cx, cy - size); // 弹头尖端
            ctx.lineTo(cx + size * 0.3, cy - size * 0.3); // 右肩
            ctx.lineTo(cx + size * 0.3, cy + size * 0.6); // 右尾
            ctx.lineTo(cx - size * 0.3, cy + size * 0.6); // 左尾
            ctx.lineTo(cx - size * 0.3, cy - size * 0.3); // 左肩
            ctx.closePath();
            ctx.fill();
            // 尾翼
            ctx.fillStyle = "#c44";
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.3, cy + size * 0.3);
            ctx.lineTo(cx - size * 0.6, cy + size * 0.7);
            ctx.lineTo(cx - size * 0.3, cy + size * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + size * 0.3, cy + size * 0.3);
            ctx.lineTo(cx + size * 0.6, cy + size * 0.7);
            ctx.lineTo(cx + size * 0.3, cy + size * 0.6);
            ctx.closePath();
            ctx.fill();
            // 尾焰
            ctx.fillStyle = "#fa0";
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.2, cy + size * 0.6);
            ctx.lineTo(cx, cy + size);
            ctx.lineTo(cx + size * 0.2, cy + size * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            return cy + size;
        }
        case "orb": {
            // 护盾球体：蓝色发光圆，底部 = cy + s
            const s = size * 0.8;
            ctx.shadowColor = "#4af";
            ctx.shadowBlur = 8;
            ctx.fillStyle = "#4af";
            ctx.beginPath();
            ctx.arc(cx, cy, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // 高光
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.beginPath();
            ctx.arc(cx - s * 0.25, cy - s * 0.25, s * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return cy + s;
        }
        case "bomb": {
            // 爆裂弹：红色圆 + 引线，底部 = cy + size
            const r = size * 0.55;
            // 球体
            ctx.fillStyle = "#e33";
            ctx.beginPath();
            ctx.arc(cx, cy + size * 0.15, r, 0, Math.PI * 2);
            ctx.fill();
            // 高光
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.beginPath();
            ctx.arc(cx - r * 0.25, cy + size * 0.15 - r * 0.25, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
            // 引线
            ctx.strokeStyle = "#fa0";
            ctx.lineWidth = Math.max(1, Math.round(2 * fontScale));
            ctx.beginPath();
            ctx.moveTo(cx + r * 0.4, cy + size * 0.15 - r * 0.7);
            ctx.quadraticCurveTo(cx + r * 0.8, cy - size * 0.6, cx + r * 0.5, cy - size * 0.8);
            ctx.stroke();
            // 火花
            ctx.fillStyle = "#ff0";
            ctx.beginPath();
            ctx.arc(cx + r * 0.5, cy - size * 0.8, Math.max(1, Math.round(3 * fontScale)), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return cy + size;
        }
        case "star": {
            // 五角星（幸运），底部 = cy + outerR
            ctx.fillStyle = "#fd0";
            const outerR = size * 0.9;
            const innerR = size * 0.4;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const outerAngle = (Math.PI / 2) + (i * 2 * Math.PI / 5);
                const innerAngle = outerAngle + Math.PI / 5;
                if (i === 0) {
                    ctx.moveTo(cx + Math.cos(outerAngle) * outerR, cy - Math.sin(outerAngle) * outerR);
                }
                else {
                    ctx.lineTo(cx + Math.cos(outerAngle) * outerR, cy - Math.sin(outerAngle) * outerR);
                }
                ctx.lineTo(cx + Math.cos(innerAngle) * innerR, cy - Math.sin(innerAngle) * innerR);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            return cy + outerR;
        }
        case "shield": {
            // 护盾（护甲），底部 = cy + size
            ctx.fillStyle = "#8af";
            ctx.beginPath();
            ctx.moveTo(cx, cy - size);
            ctx.lineTo(cx + size * 0.7, cy - size * 0.5);
            ctx.lineTo(cx + size * 0.7, cy + size * 0.2);
            ctx.quadraticCurveTo(cx + size * 0.4, cy + size * 0.8, cx, cy + size);
            ctx.quadraticCurveTo(cx - size * 0.4, cy + size * 0.8, cx - size * 0.7, cy + size * 0.2);
            ctx.lineTo(cx - size * 0.7, cy - size * 0.5);
            ctx.closePath();
            ctx.fill();
            // 内部高光
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 0.6);
            ctx.lineTo(cx + size * 0.35, cy - size * 0.3);
            ctx.lineTo(cx, cy + size * 0.2);
            ctx.lineTo(cx - size * 0.35, cy - size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            return cy + size;
        }
    }
    ctx.restore();
    return cy + size;
}
// ========== 圆角矩形路径 ==========
function _roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
// ========== 自动换行文本 ==========
function _wrapText(text, x, y, maxWidth, lineHeight) {
    const chars = text.split("");
    let line = "";
    let curY = y;
    for (const char of chars) {
        const testLine = line + char;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
            ctx.fillText(line, x + maxWidth / 2, curY);
            line = char;
            curY += lineHeight;
        }
        else {
            line = testLine;
        }
    }
    if (line) {
        ctx.fillText(line, x + maxWidth / 2, curY);
    }
}
// ========== 处理点击 ==========
// 返回: "selected" (选中卡片), "rerolled" (刷新), null (无效点击)
function handleUpgradeClick(clickX, clickY) {
    // 检查卡片点击
    for (const area of cardHitAreas) {
        if (clickX >= area.x && clickX < area.x + area.w &&
            clickY >= area.y && clickY < area.y + area.h) {
            const offers = getCurrentOffers();
            if (area.offerIndex < offers.length) {
                applyUpgrade(offers[area.offerIndex]);
                return "selected";
            }
        }
    }
    // 检查刷新按钮点击
    if (rerollHitArea) {
        if (clickX >= rerollHitArea.x && clickX < rerollHitArea.x + rerollHitArea.w &&
            clickY >= rerollHitArea.y && clickY < rerollHitArea.y + rerollHitArea.h) {
            if (rerollOffers()) {
                return "rerolled";
            }
        }
    }
    return null;
}
// 清除升级界面状态（游戏重启时调用）
function clearUpgradeUI() {
    cardHitAreas = [];
    rerollHitArea = null;
}
export { drawUpgradeUI, handleUpgradeClick, clearUpgradeUI };
