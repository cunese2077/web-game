// 画布初始化 - 响应式自适应设备宽高
// 纯 JS 控制画布尺寸，支持高 DPI 设备（devicePixelRatio）渲染清晰文字
// 导出 fontScale 供所有模块统一字体缩放（基于画布宽度与设计基准 480px 的比值）
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
// 画布逻辑宽高（live binding：resize 时重新赋值，导入方自动获取最新值）
// 注意：必须用 let 而非 const，否则导入方拿到的是初始化时的快照，不会随 resize 更新
// 绘图代码应使用此逻辑宽高，而非 canvas.width/height（后者是缓冲区物理像素尺寸）
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
// 获取浏览器实际可视区域尺寸（排除地址栏/工具栏/安全区）
// 优先使用 visualViewport API（反映用户实际可见区域，最准确）
// 回退到 window.innerWidth/innerHeight（layout viewport，排除地址栏）
function getViewportSize() {
    if (window.visualViewport) {
        return { w: window.visualViewport.width, h: window.visualViewport.height };
    }
    return { w: window.innerWidth, h: window.innerHeight };
}
// 计算画布尺寸
function computeCanvasSize() {
    if (isTouchDevice()) {
        // 触摸设备：使用浏览器可视区域（visualViewport），排除状态栏/地址栏/工具栏/安全区
        // 注意：screen.width/height 是屏幕物理尺寸，包含状态栏和浏览器UI，
        // 会导致画布超出可视区域，顶部和底部被遮挡
        return getViewportSize();
    }
    else {
        // 桌面设备：限制最大值，居中显示
        return {
            w: Math.min(window.innerWidth, 480),
            h: Math.min(window.innerHeight, 800),
        };
    }
}
// 应用画布尺寸：设置绘图缓冲区（canvas.width/height）和 CSS 显示尺寸
// 高 DPI 适配：缓冲区尺寸 = 逻辑尺寸 × devicePixelRatio，CSS 尺寸 = 逻辑尺寸
// ctx.scale(dpr) 后所有绘图命令使用逻辑坐标，文字在高 DPI 屏幕上清晰不模糊
function applyCanvasSize(w, h) {
    const dpr = window.devicePixelRatio || 1;
    const bufW = Math.round(w * dpr);
    const bufH = Math.round(h * dpr);
    if (canvas.width === bufW && canvas.height === bufH)
        return;
    canvas.width = bufW;
    canvas.height = bufH;
    // CSS 显示尺寸设为逻辑像素，canvas 缓冲区按 dpr 倍率渲染
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    width = w;
    height = h;
    // 触摸设备 fontScale 下限 1.0：手机宽度通常 360-414px，不设下限则 fontScale≈0.75-0.86，
    // 导致 8px 基础字号缩小到 6px 几乎无法阅读；设 1.0 下限确保手机字体不小于桌面端
    fontScale = isTouchDevice() ? Math.max(w / 480, 1) : Math.min(w / 480, 2);
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
// 监听 visualViewport 变化（移动端地址栏显示/隐藏、键盘弹出等场景，
// 这些变化可能不触发 window resize，需单独监听 visualViewport.resize）
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeCanvas);
}
// 横竖屏切换：延迟重新计算（等待屏幕旋转完成）
window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        const { w, h } = computeCanvasSize();
        applyCanvasSize(w, h);
    }, 200);
});
export { canvas, ctx };
