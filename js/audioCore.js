// 音频核心基础设施（从 audio.ts 拆出）：AudioContext 管理、音效开关状态、公共工具
import { audioConfig } from "./audioConfig.js";
let audioCtx = null;
// 音效开关状态（由 settings.ts 经 audio.ts 门面的 setSoundEnabled 控制）
let soundEnabled = true;
// 仅更新开关状态；BGM 联动（静音暂停 / 取消静音恢复）由 audio.ts 门面组合实现
function setSoundEnabledCore(enabled) {
    soundEnabled = enabled;
}
function isSoundEnabled() {
    return soundEnabled;
}
function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}
function resumeAudio() {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") {
        ctx.resume();
    }
}
function vol(v) {
    return v * audioConfig.masterVolume;
}
// 自动断开：音源节点（振荡器/噪声源）播放结束后断开自身和关联节点，
// 避免 stop() 后节点仍留在音频图中无法被 GC，长时间游戏后孤儿节点累积导致内存泄漏和性能下降（移动端尤其严重）
function autoDisconnect(source, ...nodes) {
    source.onended = () => {
        source.disconnect();
        for (const n of nodes)
            n.disconnect();
    };
}
// ========== 辅助：创建噪声缓冲 ==========
function createNoiseBuffer(ctx, duration, amplitude) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * amplitude;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
}
export { setSoundEnabledCore, isSoundEnabled, getAudioCtx, resumeAudio, vol, autoDisconnect, createNoiseBuffer };
