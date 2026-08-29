// 设置面板模块：设置界面绘制 + 点击处理（含下拉选择面板）
// 从 ui.ts 拆出（保持函数签名不变，ui.ts 统一 re-export）
import { ctx, width, height, fontScale } from "./canvas.js";
import { getSettingItems } from "./settings.js";
import { t } from "./i18n.js";
let settingHitAreas = [];
// 当前展开的设置项索引（-1 表示全部收起）
let expandedItem = -1;
function drawSettings() {
    const cx = width / 2;
    const items = getSettingItems();
    ctx.save();
    ctx.textAlign = "center";
    // 半透明遮罩
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);
    // 标题
    ctx.fillStyle = "#ffd700";
    ctx.font = `bold ${Math.round(32 * fontScale)}px arial`;
    ctx.shadowColor = "#ff8c00";
    ctx.shadowBlur = 10;
    ctx.fillText(t("settings.title"), cx, Math.round(60 * fontScale));
    ctx.shadowBlur = 0;
    // 设置项列表
    const itemFontSize = Math.round(20 * fontScale);
    const optionFontSize = Math.round(18 * fontScale);
    const lineH = Math.round(50 * fontScale);
    const optionLineH = Math.round(38 * fontScale);
    settingHitAreas = [];
    const pendingDropdowns = [];
    let curY = Math.round(110 * fontScale);
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isToggleType = item.toggle !== undefined;
        // 标签（左侧）
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = `${itemFontSize}px arial`;
        ctx.fillText(t(item.label), Math.round(30 * fontScale), curY);
        if (isToggleType) {
            // 开关型设置项：radio 样式 ○ 关  ● 开
            const isOn = item.toggle();
            const radioFontSize = Math.round(16 * fontScale);
            const rightX = width - Math.round(30 * fontScale);
            // "关"选项（左侧）
            ctx.font = `${radioFontSize}px arial`;
            ctx.textAlign = "right";
            const offX = rightX - Math.round(55 * fontScale);
            ctx.fillStyle = !isOn ? "#f44" : "#888";
            ctx.fillText((!isOn ? "● " : "○ ") + t("settings.sound.off"), offX, curY);
            // "开"选项（右侧）
            ctx.textAlign = "right";
            ctx.fillStyle = isOn ? "#4f4" : "#888";
            ctx.fillText((isOn ? "● " : "○ ") + t("settings.sound.on"), rightX, curY);
            // 记录点击区域（整行宽度）
            settingHitAreas.push({
                x: Math.round(30 * fontScale),
                w: width - Math.round(60 * fontScale),
                y: curY - lineH * 0.7,
                h: lineH * 0.9,
                type: "toggle",
                itemIndex: i,
                optionIndex: -1,
            });
            curY += lineH;
        }
        else {
            // 下拉选择型设置项
            const currentIdx = item.current ? item.current() : 0;
            const isExpanded = expandedItem === i;
            const arrow = isExpanded ? " ▲" : " ▼";
            const optionText = (item.optionLabels ? t(item.optionLabels[currentIdx]) : "") + arrow;
            ctx.textAlign = "right";
            ctx.fillStyle = "#ffd700";
            ctx.font = `bold ${optionFontSize}px arial`;
            ctx.fillText(optionText, width - Math.round(30 * fontScale), curY);
            settingHitAreas.push({
                x: Math.round(30 * fontScale),
                w: width - Math.round(60 * fontScale),
                y: curY - lineH * 0.7,
                h: lineH * 0.9,
                type: "toggle",
                itemIndex: i,
                optionIndex: -1,
            });
            // 收集展开的下拉面板数据，延迟绘制
            if (isExpanded && item.optionLabels) {
                pendingDropdowns.push({
                    baseY: curY + lineH * 0.3,
                    optionLabels: item.optionLabels,
                    currentIdx,
                    itemIndex: i,
                });
            }
            curY += lineH;
        }
    }
    // 返回按钮
    const backY = curY + Math.round(20 * fontScale);
    ctx.textAlign = "center";
    ctx.fillStyle = "#aaa";
    ctx.font = `${Math.round(18 * fontScale)}px arial`;
    ctx.fillText(t("settings.back"), cx, backY);
    settingHitAreas.push({
        x: Math.round(30 * fontScale),
        w: width - Math.round(60 * fontScale),
        y: backY - Math.round(25 * fontScale),
        h: Math.round(30 * fontScale),
        type: "back",
        itemIndex: -1,
        optionIndex: -1,
    });
    // 最后绘制下拉面板（保证在所有元素最上层）
    for (const dd of pendingDropdowns) {
        const dropdownBaseY = dd.baseY;
        const padH = Math.round(6 * fontScale);
        const padW = Math.round(12 * fontScale);
        const optionPadW = Math.round(10 * fontScale);
        // 计算自适应宽度：测量所有选项文字，取最大宽度
        ctx.font = `${optionFontSize}px arial`;
        let maxTextW = 0;
        for (const label of dd.optionLabels) {
            const w = ctx.measureText(t(label)).width;
            if (w > maxTextW)
                maxTextW = w;
        }
        // "● " 前缀宽度
        const prefixW = ctx.measureText("● ").width;
        const dropdownW = maxTextW + prefixW + padW * 2 + optionPadW;
        const dropdownH = dd.optionLabels.length * optionLineH + padH * 2;
        const dropdownX = width - Math.round(30 * fontScale) - dropdownW;
        // 半透明背景 + 金色边框
        ctx.fillStyle = "rgba(20, 20, 40, 0.95)";
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = Math.max(1, Math.round(1.5 * fontScale));
        ctx.beginPath();
        const r = Math.round(6 * fontScale);
        ctx.moveTo(dropdownX + r, dropdownBaseY);
        ctx.lineTo(dropdownX + dropdownW - r, dropdownBaseY);
        ctx.arcTo(dropdownX + dropdownW, dropdownBaseY, dropdownX + dropdownW, dropdownBaseY + r, r);
        ctx.lineTo(dropdownX + dropdownW, dropdownBaseY + dropdownH - r);
        ctx.arcTo(dropdownX + dropdownW, dropdownBaseY + dropdownH, dropdownX + dropdownW - r, dropdownBaseY + dropdownH, r);
        ctx.lineTo(dropdownX + r, dropdownBaseY + dropdownH);
        ctx.arcTo(dropdownX, dropdownBaseY + dropdownH, dropdownX, dropdownBaseY + dropdownH - r, r);
        ctx.lineTo(dropdownX, dropdownBaseY + r);
        ctx.arcTo(dropdownX, dropdownBaseY, dropdownX + r, dropdownBaseY, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        let optY = dropdownBaseY + padH + optionLineH * 0.7;
        for (let j = 0; j < dd.optionLabels.length; j++) {
            const isSelected = j === dd.currentIdx;
            const prefix = isSelected ? "● " : "  ";
            ctx.textAlign = "left";
            ctx.fillStyle = isSelected ? "#ffd700" : "#ccc";
            ctx.font = `${optionFontSize}px arial`;
            ctx.fillText(prefix + t(dd.optionLabels[j]), dropdownX + padW, optY);
            settingHitAreas.push({
                x: dropdownX,
                w: dropdownW,
                y: optY - optionLineH * 0.7,
                h: optionLineH * 0.9,
                type: "option",
                itemIndex: dd.itemIndex,
                optionIndex: j,
            });
            optY += optionLineH;
        }
    }
    ctx.restore();
}
// 处理设置界面点击
function handleSettingsClick(clickX, clickY) {
    // 优先匹配下拉面板选项（最上层，防止穿透到底层元素）
    for (const area of settingHitAreas) {
        if (area.type !== "option")
            continue;
        if (clickX >= area.x && clickX < area.x + area.w &&
            clickY >= area.y && clickY < area.y + area.h) {
            const item = getSettingItems()[area.itemIndex];
            item.select(area.optionIndex);
            expandedItem = -1;
            return "option";
        }
    }
    // 检查是否点击在下拉面板区域内（点击面板空白处收起，不穿透）
    const checkedItemIndices = new Set();
    for (const area of settingHitAreas) {
        if (area.type !== "option")
            continue;
        if (checkedItemIndices.has(area.itemIndex))
            continue;
        checkedItemIndices.add(area.itemIndex);
        // 找到面板的边界（所有同 itemIndex 的 option 区域的并集）
        const panelAreas = settingHitAreas.filter(a => a.type === "option" && a.itemIndex === area.itemIndex);
        if (panelAreas.length === 0)
            continue;
        const panelX = Math.min(...panelAreas.map(a => a.x));
        const panelW = Math.max(...panelAreas.map(a => a.x + a.w)) - panelX;
        const panelY = Math.min(...panelAreas.map(a => a.y));
        const panelH = Math.max(...panelAreas.map(a => a.y + a.h)) - panelY;
        if (clickX >= panelX && clickX < panelX + panelW &&
            clickY >= panelY && clickY < panelY + panelH) {
            // 点击在面板区域内但不在选项上 → 收起面板，不穿透
            expandedItem = -1;
            return null;
        }
    }
    // 匹配其他元素（toggle / back）
    for (const area of settingHitAreas) {
        if (area.type === "option")
            continue;
        if (clickX >= area.x && clickX < area.x + area.w &&
            clickY >= area.y && clickY < area.y + area.h) {
            if (area.type === "back") {
                expandedItem = -1;
                return "back";
            }
            if (area.type === "toggle") {
                const item = getSettingItems()[area.itemIndex];
                if (item.toggle !== undefined) {
                    item.onToggle();
                }
                else {
                    expandedItem = expandedItem === area.itemIndex ? -1 : area.itemIndex;
                }
                return "option";
            }
        }
    }
    // 点击空白区域收起
    expandedItem = -1;
    return null;
}
export { drawSettings, handleSettingsClick };
