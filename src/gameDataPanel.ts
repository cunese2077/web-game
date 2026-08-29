// 游戏数据面板模块：成就列表 + 对局记录表（固定高度分页）+ 删除确认 + Tooltip
// 从 ui.ts 拆出（保持函数签名不变，ui.ts 统一 re-export）
import { ctx, width, height, fontScale } from "./canvas.js";
import { getStats, getAchievementDefs, getAchievementTier, isUnlocked, deleteAchievement, resetAllData, getRecords, deleteRecord } from "./achievement.js";
import { t } from "./i18n.js";
import type { TextKey } from "./i18n.js";

// ========== 游戏数据页面状态 ==========
let gameDataOpen: boolean = false;
let deleteConfirmVisible: boolean = false;
let pendingDeleteRecordId: number | null = null; // null=删除全部, number=删除指定记录
let currentPage: number = 1;
const PAGE_SIZE = 10;

// Tooltip 系统
let mouseX: number = -1;
let mouseY: number = -1;
let tooltipText: string = "";
let tooltipX: number = 0;
let tooltipY: number = 0;
let tooltipVisible: boolean = false;

interface InfoIconArea {
  x: number;
  y: number;
  r: number;  // 半径
  desc: string;
  achievementId?: string;
}

let infoIconAreas: InfoIconArea[] = [];

function setMousePosition(x: number, y: number): void {
  mouseX = x;
  mouseY = y;
}

interface GameDataHitArea {
  x: number;
  w: number;
  y: number;
  h: number;
  type: "back" | "deleteOne" | "deleteAll" | "confirm" | "cancel" | "prevPage" | "nextPage" | "deleteRecord";
  achievementId?: string;
  recordId?: number;
}

let gameDataHitAreas: GameDataHitArea[] = [];

function isGameDataOpen(): boolean {
  return gameDataOpen;
}

function openGameData(): void {
  gameDataOpen = true;
  deleteConfirmVisible = false;
  pendingDeleteRecordId = null;
  currentPage = 1;
}

function closeGameData(): void {
  gameDataOpen = false;
  deleteConfirmVisible = false;
}

function drawGameData(): void {
  const cx = width / 2;
  const stats = getStats();
  const achDefs = getAchievementDefs();
  const allRecords = getRecords();

  gameDataHitAreas = [];

  ctx.save();

  // 半透明遮罩
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(0, 0, width, height);

  // 返回按钮（左上角）
  ctx.textAlign = "left";
  ctx.fillStyle = "#ccc";
  ctx.font = `${Math.round(16 * fontScale)}px arial`;
  ctx.fillText(t("gameData.back"), Math.round(16 * fontScale), Math.round(30 * fontScale));
  gameDataHitAreas.push({
    x: 0, w: Math.round(100 * fontScale),
    y: 0, h: Math.round(40 * fontScale),
    type: "back",
  });

  // 标题
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd700";
  ctx.font = `bold ${Math.round(26 * fontScale)}px arial`;
  ctx.shadowColor = "#ff8c00";
  ctx.shadowBlur = 10;
  ctx.fillText(t("gameData.title"), cx, Math.round(30 * fontScale));
  ctx.shadowBlur = 0;

  // 内容区域
  let curY = Math.round(50 * fontScale);
  const leftX = Math.round(16 * fontScale);
  const rightX = width - Math.round(16 * fontScale);
  const contentW = rightX - leftX;

  // === 汇总统计（紧凑单行） ===
  ctx.font = `${Math.round(12 * fontScale)}px arial`;
  ctx.fillStyle = "#999";
  ctx.textAlign = "center";
  const summaryLine = `${t("gameData.highScore")}:${stats.highestScore}  ${t("gameData.highLevel")}:${stats.highestLevel}  ${t("gameData.totalGames")}:${stats.totalGames}  ${t("gameData.totalKills")}:${stats.totalKills}  ${t("gameData.totalBossKills")}:${stats.totalBossKills}`;
  ctx.fillText(summaryLine, cx, curY);
  curY += Math.round(20 * fontScale);

  // === 成就列表 ===
  const unlockedCount = achDefs.filter(d => isUnlocked(d.id)).length;
  ctx.fillStyle = "#ffd700";
  ctx.font = `bold ${Math.round(13 * fontScale)}px arial`;
  ctx.fillText(t("gameData.achievements") + " " + unlockedCount + "/" + achDefs.length, cx, curY);
  curY += Math.round(16 * fontScale);

  // 成就详情列表（紧凑排列，两列居中布局 + 分档标记 + info 图标）
  infoIconAreas = [];
  const achFontSize = Math.round(11 * fontScale);
  const achLineH = Math.round(18 * fontScale);
  ctx.font = `${achFontSize}px arial`;
  const achColW = Math.round(150 * fontScale);  // 每列宽度
  const achTotalW = achColW * 2;
  const achStartX = cx - achTotalW / 2;          // 整体居中起点
  // 分档颜色和标记
  const tierColors = ["#444", "#cd7f32", "#c0c0c0", "#ffd700"]; // 未解锁/铜/银/金
  const tierSymbols = ["☆", "◈", "◆", "★"]; // 未解锁/铜/银/金
  let colIdx = 0;
  for (const ach of achDefs) {
    const tier = getAchievementTier(ach.id);
    const unlocked = tier >= 1;
    const col = colIdx % 2;
    const row = Math.floor(colIdx / 2);
    const x = achStartX + col * achColW;
    const y = curY + row * achLineH;

    // 成就名（带分档符号+颜色）
    ctx.textAlign = "left";
    ctx.fillStyle = tierColors[tier];
    const prefix = tierSymbols[tier] + " ";
    const nameStr = prefix + t(ach.label);
    ctx.fillText(nameStr, x, y);
    const textEndX = x + ctx.measureText(nameStr).width;

    // info 图标（ⓘ）— 紧跟成就名后面
    const iconR = Math.round(6 * fontScale);
    const iconGap = Math.round(4 * fontScale);
    const iconCx = textEndX + iconGap + iconR;
    const iconCy = y - Math.round(3 * fontScale);

    // 绘制圆形 info 图标
    ctx.beginPath();
    ctx.arc(iconCx, iconCy, iconR, 0, Math.PI * 2);
    ctx.fillStyle = unlocked ? "rgba(255, 215, 0, 0.3)" : "rgba(100, 100, 100, 0.3)";
    ctx.fill();
    ctx.fillStyle = unlocked ? "#ffd700" : "#666";
    ctx.font = `bold ${Math.round(9 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.fillText("i", iconCx, iconCy + Math.round(3 * fontScale));
    ctx.font = `${achFontSize}px arial`;  // 恢复字体

    // info 描述：显示当前档位 + 下一档目标
    const tierLabels: TextKey[] = ["achievement.tier.bronze", "achievement.tier.silver", "achievement.tier.gold"];
    const clampedTier = Math.min(tier, ach.tiers.length);
    let tooltip: string;
    if (clampedTier >= 1) {
      // 已解锁：当前档位
      const curName = t(tierLabels[clampedTier - 1]);
      const curDesc = t(ach.tiers[clampedTier - 1].desc);
      const nextIdx = clampedTier; // tiers 是 0-based，下一档索引 = clampedTier
      if (nextIdx < ach.tiers.length) {
        // 还有下一档
        const nextName = t(tierLabels[nextIdx]);
        const nextDesc = t(ach.tiers[nextIdx].desc);
        tooltip = `当前：${curName} - ${curDesc}\n下一档：${nextName} - ${nextDesc}`;
      } else if (ach.tiers.length > 1) {
        // 多档位成就已满级
        tooltip = `当前：${curName} - ${curDesc}（已满级）`;
      } else {
        // 单档位成就，不显示满级提示
        tooltip = `当前：${curName} - ${curDesc}`;
      }
    } else {
      // 未解锁：显示首档目标
      const nextName = t(tierLabels[0]);
      const nextDesc = t(ach.tiers[0].desc);
      tooltip = `下一档：${nextName} - ${nextDesc}`;
    }
    infoIconAreas.push({
      x: iconCx,
      y: iconCy,
      r: iconR + Math.round(2 * fontScale),
      desc: tooltip,
      achievementId: ach.id,
    });

    colIdx++;
  }
  const achRows = Math.ceil(achDefs.length / 2);
  curY += achRows * achLineH + Math.round(8 * fontScale);

  // === 分隔线 ===
  ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, curY);
  ctx.lineTo(rightX, curY);
  ctx.stroke();
  curY += Math.round(22 * fontScale);

  // === 对局记录列表 ===
  if (allRecords.length === 0) {
    // 无数据：仅在固定高度区域内居中显示提示
    const rowH = Math.round(22 * fontScale);
    const dataContainerH = PAGE_SIZE * rowH;
    ctx.textAlign = "center";
    ctx.fillStyle = "#666";
    ctx.font = `${Math.round(14 * fontScale)}px arial`;
    ctx.fillText(t("gameData.noData"), cx, curY + dataContainerH / 2);
    curY += dataContainerH;
  } else {
    // 有数据：显示表格标题 + 表头 + 数据行 + 分页
    const totalPages = Math.ceil(allRecords.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageRecords = allRecords.slice(startIdx, startIdx + PAGE_SIZE);
    const totalGames = stats.totalGames;

    const rowFontSize = Math.round(11 * fontScale);
    const rowH = Math.round(22 * fontScale);

    // 固定列宽布局（局号 | 等级 | 得分 | 击杀敌机数 | 击杀BOSS数 | 删除）
    const colNo = leftX + Math.round(2 * fontScale);        // 局号列起始
    const colLv = colNo + Math.round(36 * fontScale);       // 等级列起始
    const colSc = colLv + Math.round(66 * fontScale);       // 得分列起始
    const colKl = colSc + Math.round(56 * fontScale);       // 击杀敌机数列起始
    const colBo = colKl + Math.round(72 * fontScale);       // 击杀BOSS数列起始
    const delAreaRight = rightX - Math.round(2 * fontScale);

    // 表格标题
    ctx.font = `bold ${Math.round(14 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ccc";
    ctx.fillText(t("gameData.recordTitle"), cx, curY);
    curY += Math.round(20 * fontScale);

    // 表头
    ctx.font = `bold ${rowFontSize}px arial`;
    ctx.textAlign = "left";
    ctx.fillStyle = "#666";
    ctx.fillText("#", colNo, curY);
    ctx.fillText(t("gameData.highLevel"), colLv, curY);
    ctx.fillText(t("gameData.score"), colSc, curY);
    ctx.fillText(t("gameData.killsCol"), colKl, curY);
    ctx.fillText(t("gameData.bossKillsCol"), colBo, curY);
    curY += rowH;

    // 数据行区域：固定10行高度
    const dataContainerH = PAGE_SIZE * rowH;
    const dataContentY = curY;

    for (let i = 0; i < pageRecords.length; i++) {
      const rec = pageRecords[i];

      // 行背景（交替色）
      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.fillRect(leftX, curY - rowH + Math.round(4 * fontScale), contentW, rowH);
      }

      // 局号
      ctx.textAlign = "left";
      ctx.font = `${rowFontSize}px arial`;
      ctx.fillStyle = "#aaa";
      ctx.fillText(String(totalGames - startIdx - i), colNo, curY);

      // 各列数据（左对齐固定列宽）
      ctx.fillStyle = "#ccc";
      ctx.fillText(String(rec.level), colLv, curY);
      ctx.fillText(String(rec.score), colSc, curY);
      ctx.fillText("×" + rec.kills, colKl, curY);
      ctx.fillText("×" + rec.bossKills, colBo, curY);

      // 删除按钮
      const delText = t("gameData.deleteRecord");
      ctx.textAlign = "right";
      ctx.fillStyle = "#f66";
      ctx.font = `${Math.round(10 * fontScale)}px arial`;
      ctx.fillText(delText, delAreaRight, curY);
      const delW = ctx.measureText(delText).width + Math.round(6 * fontScale);
      gameDataHitAreas.push({
        x: delAreaRight - delW, w: delW,
        y: curY - rowH + Math.round(4 * fontScale), h: rowH,
        type: "deleteRecord",
        recordId: rec.id,
      });

      curY += rowH;
    }

    curY = dataContentY + dataContainerH;

    // === 分页控制（固定在表格底部下方） ===
    curY += Math.round(8 * fontScale);
    ctx.textAlign = "center";
    ctx.font = `${Math.round(14 * fontScale)}px arial`;

    // 上一页
    if (currentPage > 1) {
      ctx.fillStyle = "#4af";
      ctx.fillText(t("gameData.prevPage"), cx - Math.round(70 * fontScale), curY);
      const prevW = ctx.measureText(t("gameData.prevPage")).width + Math.round(12 * fontScale);
      gameDataHitAreas.push({
        x: cx - Math.round(70 * fontScale) - prevW / 2, w: prevW,
        y: curY - Math.round(20 * fontScale), h: Math.round(24 * fontScale),
        type: "prevPage",
      });
    }

    // 页码
    ctx.fillStyle = "#aaa";
    const pageInfo = t("gameData.pageInfo", { P: currentPage, T: totalPages });
    ctx.fillText(pageInfo, cx, curY);

    // 下一页
    if (currentPage < totalPages) {
      ctx.fillStyle = "#4af";
      ctx.fillText(t("gameData.nextPage"), cx + Math.round(70 * fontScale), curY);
      const nextW = ctx.measureText(t("gameData.nextPage")).width + Math.round(12 * fontScale);
      gameDataHitAreas.push({
        x: cx + Math.round(70 * fontScale) - nextW / 2, w: nextW,
        y: curY - Math.round(20 * fontScale), h: Math.round(24 * fontScale),
        type: "nextPage",
      });
    }
  }

  // === 底部：删除全部数据（无数据时隐藏） ===
  if (allRecords.length > 0) {
    const bottomBtnY = height - Math.round(24 * fontScale);
    ctx.textAlign = "center";

    if (!deleteConfirmVisible) {
    ctx.fillStyle = "#f66";
    ctx.font = `${Math.round(14 * fontScale)}px arial`;
    ctx.fillText(t("gameData.deleteAll"), cx, bottomBtnY);
    const delAllW = ctx.measureText(t("gameData.deleteAll")).width + Math.round(16 * fontScale);
    gameDataHitAreas.push({
      x: cx - delAllW / 2, w: delAllW,
      y: bottomBtnY - Math.round(22 * fontScale), h: Math.round(26 * fontScale),
      type: "deleteAll",
    });
  } else {
    // 确认对话框 — 圆角卡片 + 半透明遮罩 + 按钮样式
    // 半透明遮罩
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    const dlgW = Math.round(280 * fontScale);
    const dlgH = Math.round(140 * fontScale);
    const dlgX = cx - dlgW / 2;
    const dlgY = height / 2 - dlgH / 2;
    const radius = Math.round(12 * fontScale);

    // 卡片背景
    ctx.fillStyle = "rgba(30, 30, 50, 0.95)";
    ctx.beginPath();
    ctx.moveTo(dlgX + radius, dlgY);
    ctx.lineTo(dlgX + dlgW - radius, dlgY);
    ctx.quadraticCurveTo(dlgX + dlgW, dlgY, dlgX + dlgW, dlgY + radius);
    ctx.lineTo(dlgX + dlgW, dlgY + dlgH - radius);
    ctx.quadraticCurveTo(dlgX + dlgW, dlgY + dlgH, dlgX + dlgW - radius, dlgY + dlgH);
    ctx.lineTo(dlgX + radius, dlgY + dlgH);
    ctx.quadraticCurveTo(dlgX, dlgY + dlgH, dlgX, dlgY + dlgH - radius);
    ctx.lineTo(dlgX, dlgY + radius);
    ctx.quadraticCurveTo(dlgX, dlgY, dlgX + radius, dlgY);
    ctx.closePath();
    ctx.fill();

    // 边框
    ctx.strokeStyle = "rgba(255, 100, 100, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 顶部警告色条
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dlgX + radius, dlgY);
    ctx.lineTo(dlgX + dlgW - radius, dlgY);
    ctx.quadraticCurveTo(dlgX + dlgW, dlgY, dlgX + dlgW, dlgY + radius);
    ctx.lineTo(dlgX + dlgW, dlgY + radius);
    ctx.lineTo(dlgX, dlgY + radius);
    ctx.lineTo(dlgX, dlgY + radius);
    ctx.quadraticCurveTo(dlgX, dlgY, dlgX + radius, dlgY);
    ctx.closePath();
    ctx.clip();
    const barH = Math.round(4 * fontScale);
    const barGrad = ctx.createLinearGradient(dlgX, dlgY, dlgX + dlgW, dlgY);
    barGrad.addColorStop(0, "#f66");
    barGrad.addColorStop(1, "#f90");
    ctx.fillStyle = barGrad;
    ctx.fillRect(dlgX, dlgY, dlgW, barH + radius);
    ctx.restore();

    // 提示文字
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(14 * fontScale)}px arial`;
    ctx.textAlign = "center";
    ctx.fillText(
      pendingDeleteRecordId !== null ? t("gameData.deleteRecordConfirm") : t("gameData.deleteAllConfirm"),
      cx, dlgY + Math.round(52 * fontScale)
    );

    // 按钮区域
    const btnW = Math.round(90 * fontScale);
    const btnH = Math.round(32 * fontScale);
    const btnY = dlgY + dlgH - Math.round(46 * fontScale);
    const btnGap = Math.round(20 * fontScale);
    const confirmX = cx - btnW - btnGap / 2;
    const cancelX = cx + btnGap / 2;

    // 确认按钮 — 红色填充
    ctx.fillStyle = "#c44";
    ctx.beginPath();
    const btnR = Math.round(6 * fontScale);
    ctx.moveTo(confirmX + btnR, btnY);
    ctx.lineTo(confirmX + btnW - btnR, btnY);
    ctx.quadraticCurveTo(confirmX + btnW, btnY, confirmX + btnW, btnY + btnR);
    ctx.lineTo(confirmX + btnW, btnY + btnH - btnR);
    ctx.quadraticCurveTo(confirmX + btnW, btnY + btnH, confirmX + btnW - btnR, btnY + btnH);
    ctx.lineTo(confirmX + btnR, btnY + btnH);
    ctx.quadraticCurveTo(confirmX, btnY + btnH, confirmX, btnY + btnH - btnR);
    ctx.lineTo(confirmX, btnY + btnR);
    ctx.quadraticCurveTo(confirmX, btnY, confirmX + btnR, btnY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(13 * fontScale)}px arial`;
    ctx.fillText(t("gameData.confirm"), confirmX + btnW / 2, btnY + btnH / 2 + Math.round(5 * fontScale));
    gameDataHitAreas.push({
      x: confirmX, w: btnW,
      y: btnY, h: btnH,
      type: "confirm",
    });

    // 取消按钮 — 边框样式
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cancelX + btnR, btnY);
    ctx.lineTo(cancelX + btnW - btnR, btnY);
    ctx.quadraticCurveTo(cancelX + btnW, btnY, cancelX + btnW, btnY + btnR);
    ctx.lineTo(cancelX + btnW, btnY + btnH - btnR);
    ctx.quadraticCurveTo(cancelX + btnW, btnY + btnH, cancelX + btnW - btnR, btnY + btnH);
    ctx.lineTo(cancelX + btnR, btnY + btnH);
    ctx.quadraticCurveTo(cancelX, btnY + btnH, cancelX, btnY + btnH - btnR);
    ctx.lineTo(cancelX, btnY + btnR);
    ctx.quadraticCurveTo(cancelX, btnY, cancelX + btnR, btnY);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#ccc";
    ctx.font = `${Math.round(13 * fontScale)}px arial`;
    ctx.fillText(t("gameData.cancel"), cancelX + btnW / 2, btnY + btnH / 2 + Math.round(5 * fontScale));
    gameDataHitAreas.push({
      x: cancelX, w: btnW,
      y: btnY, h: btnH,
      type: "cancel",
    });
  }
  } // end if allRecords.length > 0

  // === Tooltip 绘制（鼠标悬停在 info 图标上） ===
  tooltipVisible = false;
  if (mouseX >= 0 && mouseY >= 0) {
    for (const icon of infoIconAreas) {
      const dx = mouseX - icon.x;
      const dy = mouseY - icon.y;
      if (dx * dx + dy * dy <= icon.r * icon.r) {
        tooltipText = icon.desc;
        tooltipX = mouseX;
        tooltipY = mouseY;
        tooltipVisible = true;
        break;
      }
    }
  }

  if (tooltipVisible) {
    const tipFontSize = Math.round(12 * fontScale);
    ctx.font = `${tipFontSize}px arial`;
    const tipLines = tooltipText.split("\n");
    const tipLineH = Math.round(16 * fontScale);
    let maxLineW = 0;
    for (const line of tipLines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineW) maxLineW = w;
    }
    const tipW = maxLineW + Math.round(16 * fontScale);
    const tipH = tipLines.length * tipLineH + Math.round(8 * fontScale);
    let tipX = tooltipX + Math.round(10 * fontScale);
    let tipY = tooltipY - tipH - Math.round(4 * fontScale);
    if (tipX + tipW > width) tipX = width - tipW - Math.round(4 * fontScale);
    if (tipY < 0) tipY = tooltipY + Math.round(16 * fontScale);

    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(tipX, tipY, tipW, tipH);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(tipX, tipY, tipW, tipH);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    for (let i = 0; i < tipLines.length; i++) {
      ctx.fillText(tipLines[i], tipX + Math.round(8 * fontScale), tipY + Math.round(14 * fontScale) + i * tipLineH);
    }
  }

  ctx.restore();
}

// 处理游戏数据页面的点击事件
function handleGameDataClick(clickX: number, clickY: number): string | null {
  for (const area of gameDataHitAreas) {
    if (clickX >= area.x && clickX < area.x + area.w &&
        clickY >= area.y && clickY < area.y + area.h) {
      switch (area.type) {
        case "back":
          closeGameData();
          return "back";
        case "deleteOne":
          if (area.achievementId) {
            deleteAchievement(area.achievementId);
          }
          return "deleteOne";
        case "deleteRecord":
          if (area.recordId !== undefined) {
            pendingDeleteRecordId = area.recordId;
            deleteConfirmVisible = true;
          }
          return "deleteRecord";
        case "deleteAll":
          pendingDeleteRecordId = null;
          deleteConfirmVisible = true;
          return "deleteAll";
        case "confirm":
          if (pendingDeleteRecordId !== null) {
            deleteRecord(pendingDeleteRecordId);
          } else {
            resetAllData();
          }
          deleteConfirmVisible = false;
          pendingDeleteRecordId = null;
          return "confirm";
        case "cancel":
          deleteConfirmVisible = false;
          pendingDeleteRecordId = null;
          return "cancel";
        case "prevPage":
          if (currentPage > 1) currentPage--;
          return "prevPage";
        case "nextPage":
          currentPage++;
          return "nextPage";
      }
    }
  }
  return null;
}

export { isGameDataOpen, openGameData, closeGameData, drawGameData, handleGameDataClick, setMousePosition };
