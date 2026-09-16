// 帧时间基建（#6 60fps 改造核心）
// 设计原则：帧率从"80+ 处隐式假设"收敛为这里导出的一个显式常量。
// 主循环保持 accumulator 固定步长，只改 TARGET_DELTA 一个常量即可切换帧率；
// 所有游戏逻辑通过 getDt()/getDtSec() 驱动，与帧率解耦。
//
// 时间化改造规则（换算基准：原 20fps，1 帧 = 50ms，每秒 20 帧）：
//   计时器：原帧数 × 50 → ms
//   移动：  原每帧位移 × 20 → px/s，再乘 getDtSec()
//
// 回退机制：TARGET_DELTA 改回 50 即回到 20fps，时间化逻辑自动等价（dt=50 恒等）。
// 逻辑步长（ms）。默认 1000/60 = 60fps（阶段 3 已切换）。
// 逃生门：URL 带 ?fps=20 可临时回退 20fps（浏览器 A/B 对比/问题排查用）。
function resolveTargetDelta() {
    try {
        const params = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
        const fps = Number(params.get("fps"));
        if (fps > 0 && Number.isFinite(fps))
            return 1000 / fps;
    }
    catch {
        // 非浏览器环境（测试）走默认值
    }
    return 1000 / 60;
}
export const TARGET_DELTA = resolveTargetDelta();
// 当前步长（ms）。固定步长下恒等于 TARGET_DELTA；
// 时间化代码禁止直接引用 TARGET_DELTA，统一走此函数（未来支持可变步长时只改这里）
function getDt() {
    return TARGET_DELTA;
}
// 步长（秒）。移动类代码用：x += speedPerSec * getDtSec()
function getDtSec() {
    return TARGET_DELTA / 1000;
}
export { getDt, getDtSec };
