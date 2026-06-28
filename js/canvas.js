// 画布初始化 - 响应式自适应设备宽高
// 纯 JS 控制画布尺寸（不依赖 CSS width/height），避免移动端地址栏变化导致的"拉伸"问题
// 导出 fontScale 供所有模块统一字体缩放（基于画布宽度与设计基准 480px 的比值）
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
// 画布宽高（live binding：resize 时重新赋值，导入方自动获取最新值）
// 注意：必须用 let 而非 const，否则导入方拿到的是初始化时的快照，不会随 resize 更新
export let width = 0;
export let height = 0;
// 字体缩放系数（基于画布宽度与设计基准 480px 的比值，上限 2×）
// 桌面 480px → fontScale=1，手机 412px → fontScale=0.86，平板 1024px → fontScale=2
// 所有 ctx.font 设置应乘以 fontScale，确保大屏设备字体比例协调
export let fontScale = 1;
// 检测触摸设备（手机、平板）
// navigator.maxTouchPoints > 0：大多数触摸设备（含 iPadOS 桌面模式）
// 'ontouchstart' in window：iOS Safari 兼容
// 比 CSS @media (hover: none) and (pointer: coarse) 更可靠，iPadOS 13+ 桌面模式下媒体查询失效
function isTouchDevice() {
    return navigator.maxTouchPoints > 0 || "ontouchstart" in window;
}
// 计算画布尺寸
function computeCanvasSize() {
    if (isTouchDevice()) {
        // 触摸设备：使用 screen 尺寸（固定值，不受地址栏显示/隐藏影响）
        const sw = screen.width;
        const sh = screen.height;
        // 根据当前方向确定宽高（screen.width/height 不会随横竖屏切换互换）
        if (window.innerHeight > window.innerWidth) {
            return { w: Math.min(sw, sh), h: Math.max(sw, sh) };
        }
        else {
            return { w: Math.max(sw, sh), h: Math.min(sw, sh) };
        }
    }
    else {
        // 桌面设备：限制最大值，居中显示
        return {
            w: Math.min(window.innerWidth, 480),
            h: Math.min(window.innerHeight, 800),
        };
    }
}
// 应用画布尺寸：设置绘图缓冲区（canvas.width/height）
// canvas 元素会按 width/height 属性自动 1:1 显示，无需设置 CSS style
function applyCanvasSize(w, h) {
    if (canvas.width === w && canvas.height === h)
        return;
    canvas.width = w;
    canvas.height = h;
    width = w;
    height = h;
    fontScale = Math.min(w / 480, 2);
}
// debounce：避免移动端地址栏变化导致的频繁 resize 重置 canvas
let resizeTimer = null;
function resizeCanvas() {
    if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(() => {
        resizeTimer = null;
        const { w, h } = computeCanvasSize();
        applyCanvasSize(w, h);
    }, 300);
}
// 初始化时立即设置（不 debounce，确保首屏正确）
(() => {
    const { w, h } = computeCanvasSize();
    applyCanvasSize(w, h);
})();
// 监听窗口尺寸变化（桌面窗口缩放、移动端地址栏变化）
window.addEventListener("resize", resizeCanvas);
// 横竖屏切换：延迟重新计算（等待屏幕旋转完成）
window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        const { w, h } = computeCanvasSize();
        applyCanvasSize(w, h);
    }, 200);
});
export { canvas, ctx };
