// 玩家输入模块（从 hero.ts 拆出）：鼠标/触摸移动 + mouseout 暂停 + resize 边界钳制
// 只依赖 heroState（不依赖 heroEntity），避免输入绑定与实体类的循环依赖
import { canvas, width, height } from "./canvas.js";
import { heroImg } from "./resources.js";
import { PHASE_PLAY, PHASE_PAUSE, PHASE_BOSS, PHASE_BOSS_WARNING } from "./constants.js";
import { getDebugPanelArea, getDebugToggleArea } from "./debug.js";
import { getActiveHero, getSoundIconArea, getPauseBtnArea } from "./heroState.js";

let eventsBound: boolean = false;

function bindEventsOnce(): void {
  if (eventsBound) return;
  eventsBound = true;

  const move = (e: MouseEvent | TouchEvent): void => {
    const hero = getActiveHero();
    if (!hero) return;
    const curPhase = hero._getCurrentPhase();
    if (curPhase === PHASE_PLAY || curPhase === PHASE_BOSS_WARNING || curPhase === PHASE_BOSS) {
      const offsetX = e instanceof MouseEvent ? e.offsetX : e.touches[0].pageX;
      const offsetY = e instanceof MouseEvent ? e.offsetY : e.touches[0].pageY;
      // 排除音效按钮区域：点击按钮时不应移动战机
      const sndArea = getSoundIconArea();
      if (offsetX >= sndArea.x && offsetX < sndArea.x + sndArea.w &&
          offsetY >= sndArea.y && offsetY < sndArea.y + sndArea.h) {
        return;
      }
      // 排除暂停按钮区域：点击按钮时不应移动战机
      const pauseArea = getPauseBtnArea();
      if (offsetX >= pauseArea.x && offsetX < pauseArea.x + pauseArea.w &&
          offsetY >= pauseArea.y && offsetY < pauseArea.y + pauseArea.h) {
        return;
      }
      // 排除调试面板区域：点击调试按钮时不应移动战机
      const dbgPanel = getDebugPanelArea();
      if (dbgPanel && offsetX >= dbgPanel.x && offsetX < dbgPanel.x + dbgPanel.w &&
          offsetY >= dbgPanel.y && offsetY < dbgPanel.y + dbgPanel.h) {
        return;
      }
      const dbgToggle = getDebugToggleArea();
      if (dbgToggle && offsetX >= dbgToggle.x && offsetX < dbgToggle.x + dbgToggle.w &&
          offsetY >= dbgToggle.y && offsetY < dbgToggle.y + dbgToggle.h) {
        return;
      }
      const w = heroImg[0].width;
      const h = heroImg[0].height;
      let nx = offsetX - w / 2;
      let ny = offsetY - h / 2;
      if (nx < 20 - w / 2) nx = 20 - w / 2;
      else if (nx > width - w / 2 - 20) nx = width - w / 2 - 20;
      if (ny < 0) ny = 0;
      else if (ny > height - h / 2) ny = height - h / 2;
      hero.x = nx;
      hero.y = ny;
      hero.count = 2;
    }
  };

  canvas.addEventListener("mousemove", move as EventListener, false);
  canvas.addEventListener("touchmove", move as EventListener, false);
  // 触摸开始即响应：首次按下时立刻移动战机到手指位置，
  // 避免 touchmove 才触发的 1 帧延迟，提升触摸跟手感
  canvas.addEventListener("touchstart", move as EventListener, false);

  // Web 端鼠标移出画布时暂停（移动端无 mouseout 事件，通过 HUD 暂停按钮触发）
  canvas.onmouseout = (): void => {
    const hero = getActiveHero();
    if (!hero) return;
    const phase = hero._getCurrentPhase();
    // BOSS 预警/战斗阶段不进入暂停（避免恢复时丢失 BOSS 阶段）
    if (phase === PHASE_PLAY) {
      hero._setCurrentPhase(PHASE_PAUSE);
    }
  };

  // 画布尺寸变化时，将战机位置限制在新边界内
  window.addEventListener("resize", (): void => {
    const hero = getActiveHero();
    if (!hero) return;
    const w = width;
    const h = height;
    const hw = heroImg[0].width;
    const hh = heroImg[0].height;
    if (hero.x < 20 - hw / 2) hero.x = 20 - hw / 2;
    else if (hero.x > w - hw / 2 - 20) hero.x = w - hw / 2 - 20;
    if (hero.y < 0) hero.y = 0;
    else if (hero.y > h - hh / 2) hero.y = h - hh / 2;
  });
}

export { bindEventsOnce };
