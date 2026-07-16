// 游戏音效模块 - 使用 Web Audio API 程序化合成
// ========== 音效配置对象 ==========
const audioConfig = {
    masterVolume: 1.0,
    shoot: {
        type: "sine",
        freqStart: 1200,
        freqEnd: 600,
        duration: 0.06,
        volume: 0.1,
    },
    enemyDestroySmall: {
        noise: { volume: 0.12, duration: 0.1, amplitude: 0.3 },
        tone: { type: "sawtooth", freqStart: 600, freqEnd: 100, volume: 0.1, duration: 0.1 },
    },
    enemyDestroyMedium: {
        noise: { volume: 0.15, duration: 0.2, amplitude: 0.4 },
        tone: { type: "sawtooth", freqStart: 400, freqEnd: 60, volume: 0.12, duration: 0.2 },
    },
    enemyDestroyBig: {
        noise: { volume: 0.2, duration: 0.4, amplitude: 0.5 },
        tone1: { type: "sawtooth", freqStart: 300, freqEnd: 30, volume: 0.15, duration: 0.4 },
        tone2: { type: "square", freqStart: 150, freqEnd: 20, volume: 0.08, duration: 0.3 },
    },
    heal: {
        type: "sine",
        notes: [523, 659, 784],
        noteInterval: 0.08,
        attackTime: 0.03,
        volume: 0.15,
        duration: 0.3,
    },
    hit: {
        noise: { volume: 0.4, duration: 0.15, amplitude: 0.8 },
        subBass: { type: "sine", freqStart: 200, freqEnd: 40, volume: 0.5, duration: 0.4 },
        buzz: { type: "sawtooth", freqStart: 400, freqEnd: 60, volume: 0.3, duration: 0.35 },
        alarm: { type: "square", freq1: 800, freq2: 600, freq3: 800, t1: 0.1, t2: 0.2, volume: 0.15, duration: 0.3 },
    },
    // 敌机受击音效：轻量短促的"叮"声，与玩家扣血音效（hit）区分
    // 音量远低于 hit（0.06 vs 0.4~0.5），避免淹没玩家扣血反馈
    enemyHit: {
        type: "triangle", // 三角波，音色柔和
        freqStart: 900, // 起始频率 900Hz
        freqEnd: 500, // 快速下降到 500Hz
        duration: 0.04, // 持续仅 40ms，短促清脆
        volume: 0.06, // 低音量，不干扰其他音效
    },
    gameOver: {
        type: "triangle",
        notes: [392, 349, 330, 262],
        noteInterval: 0.2,
        attackTime: 0.02,
        volume: 0.15,
        duration: 0.4,
    },
    firepower: {
        type: "sawtooth",
        notes: [440, 554, 660],
        noteInterval: 0.06,
        attackTime: 0.02,
        volume: 0.12,
        duration: 0.25,
        noise: { volume: 0.08, duration: 0.08, amplitude: 0.4 },
    },
    shield: {
        type: "sine",
        notes: [262, 392],
        noteInterval: 0.1,
        attackTime: 0.04,
        volume: 0.18,
        duration: 0.4,
    },
    spread: {
        type: "triangle",
        notes: [523, 659, 784, 1047],
        noteInterval: 0.04,
        attackTime: 0.02,
        volume: 0.12,
        duration: 0.2,
    },
    levelUp: {
        type: "sine",
        notes: [523, 659, 784, 1047],
        noteInterval: 0.08,
        attackTime: 0.03,
        volume: 0.18,
        duration: 0.35,
    },
    // 升级选择确认音效：短促清脆的双音上行
    upgradeSelect: {
        type: "sine",
        notes: [880, 1320],
        noteInterval: 0.06,
        attackTime: 0.02,
        volume: 0.15,
        duration: 0.2,
    },
    // 激光发射音效：低频持续嗡鸣 + 白噪声，模拟高能光束
    laser: {
        noise: { volume: 0.3, duration: 0.3, amplitude: 0.8 },
        tone: { type: "sawtooth", freqStart: 300, freqEnd: 50, volume: 0.3, duration: 0.3 },
    },
    // 闪电链音效：高频噼啪 + 噪声，模拟电弧放电
    lightning: {
        noise: { volume: 0.3, duration: 0.12, amplitude: 0.8 },
        tone: { type: "square", freqStart: 2400, freqEnd: 200, volume: 0.2, duration: 0.12 },
    },
    // 导弹发射音效：低频呼啸 + 噪声，模拟推进器点火
    missile: {
        noise: { volume: 0.3, duration: 0.25, amplitude: 0.7 },
        tone: { type: "sawtooth", freqStart: 500, freqEnd: 60, volume: 0.3, duration: 0.25 },
    },
    // 导弹命中爆炸音效：噪声 + 双音下降，模拟爆炸冲击
    missileHit: {
        noise: { volume: 0.5, duration: 0.4, amplitude: 1.0 },
        tone1: { type: "sawtooth", freqStart: 800, freqEnd: 15, volume: 0.35, duration: 0.4 },
        tone2: { type: "square", freqStart: 400, freqEnd: 8, volume: 0.25, duration: 0.35 },
    },
    // 僚机命中音效：清脆高频 + 噪声，区别于普通子弹
    wingmanHit: {
        noise: { volume: 0.15, duration: 0.06, amplitude: 0.4 },
        tone: { type: "triangle", freqStart: 1200, freqEnd: 600, volume: 0.15, duration: 0.06 },
    },
};
let audioCtx = null;
// 音效开关状态（由 settings.ts 控制）
let soundEnabled = true;
function setSoundEnabled(enabled) {
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
function createNoiseBuffer(audioCtx, duration, amplitude) {
    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * amplitude;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    return source;
}
// ========== 音效合成函数 ==========
function playShoot() {
    if (!soundEnabled)
        return;
    const c = audioConfig.shoot;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.type;
    osc.frequency.setValueAtTime(c.freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(c.freqEnd, ctx.currentTime + c.duration);
    gain.gain.setValueAtTime(vol(c.volume), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + c.duration);
}
function playEnemyDestroySmall() {
    if (!soundEnabled)
        return;
    const c = audioConfig.enemyDestroySmall;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.tone.type;
    osc.frequency.setValueAtTime(c.tone.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.tone.freqEnd, now + c.tone.duration);
    gain.gain.setValueAtTime(vol(c.tone.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.tone.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
    osc.start(now);
    osc.stop(now + c.tone.duration);
}
function playEnemyDestroyMedium() {
    if (!soundEnabled)
        return;
    const c = audioConfig.enemyDestroyMedium;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.tone.type;
    osc.frequency.setValueAtTime(c.tone.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.tone.freqEnd, now + c.tone.duration);
    gain.gain.setValueAtTime(vol(c.tone.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.tone.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
    osc.start(now);
    osc.stop(now + c.tone.duration);
}
function playEnemyDestroyBig() {
    if (!soundEnabled)
        return;
    const c = audioConfig.enemyDestroyBig;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.tone1.type;
    osc.frequency.setValueAtTime(c.tone1.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.tone1.freqEnd, now + c.tone1.duration);
    gain.gain.setValueAtTime(vol(c.tone1.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.tone1.duration);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    autoDisconnect(osc2, gain2);
    osc2.type = c.tone2.type;
    osc2.frequency.setValueAtTime(c.tone2.freqStart, now);
    osc2.frequency.exponentialRampToValueAtTime(c.tone2.freqEnd, now + c.tone2.duration);
    gain2.gain.setValueAtTime(vol(c.tone2.volume), now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + c.tone2.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
    osc.start(now);
    osc.stop(now + c.tone1.duration);
    osc2.start(now);
    osc2.stop(now + c.tone2.duration);
}
function playHeal() {
    if (!soundEnabled)
        return;
    const c = audioConfig.heal;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        autoDisconnect(osc, gain);
        osc.type = c.type;
        const startTime = ctx.currentTime + i * c.noteInterval;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol(c.volume), startTime + c.attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + c.duration);
        osc.start(startTime);
        osc.stop(startTime + c.duration);
    });
}
function playHit() {
    if (!soundEnabled)
        return;
    const c = audioConfig.hit;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.subBass.type;
    osc.frequency.setValueAtTime(c.subBass.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.subBass.freqEnd, now + c.subBass.duration);
    gain.gain.setValueAtTime(vol(c.subBass.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.subBass.duration);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    autoDisconnect(osc2, gain2);
    osc2.type = c.buzz.type;
    osc2.frequency.setValueAtTime(c.buzz.freqStart, now);
    osc2.frequency.exponentialRampToValueAtTime(c.buzz.freqEnd, now + c.buzz.duration);
    gain2.gain.setValueAtTime(vol(c.buzz.volume), now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + c.buzz.duration);
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    autoDisconnect(osc3, gain3);
    osc3.type = c.alarm.type;
    osc3.frequency.setValueAtTime(c.alarm.freq1, now);
    osc3.frequency.setValueAtTime(c.alarm.freq2, now + c.alarm.t1);
    osc3.frequency.setValueAtTime(c.alarm.freq3, now + c.alarm.t2);
    gain3.gain.setValueAtTime(vol(c.alarm.volume), now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + c.alarm.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
    osc.start(now);
    osc.stop(now + c.subBass.duration);
    osc2.start(now);
    osc2.stop(now + c.buzz.duration);
    osc3.start(now);
    osc3.stop(now + c.alarm.duration);
}
// 敌机受击音效：轻量短促的单音，子弹击中敌机但未击毁时播放
function playEnemyHit() {
    if (!soundEnabled)
        return;
    const c = audioConfig.enemyHit;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.type;
    osc.frequency.setValueAtTime(c.freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(c.freqEnd, ctx.currentTime + c.duration);
    gain.gain.setValueAtTime(vol(c.volume), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + c.duration);
}
function playGameOver() {
    if (!soundEnabled)
        return;
    const c = audioConfig.gameOver;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        autoDisconnect(osc, gain);
        osc.type = c.type;
        const startTime = ctx.currentTime + i * c.noteInterval;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol(c.volume), startTime + c.attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + c.duration);
        osc.start(startTime);
        osc.stop(startTime + c.duration);
    });
}
function playFirepower() {
    if (!soundEnabled)
        return;
    const c = audioConfig.firepower;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        autoDisconnect(osc, gain);
        osc.type = c.type;
        const startTime = now + i * c.noteInterval;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol(c.volume), startTime + c.attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + c.duration);
        osc.start(startTime);
        osc.stop(startTime + c.duration);
    });
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
}
function playShield() {
    if (!soundEnabled)
        return;
    const c = audioConfig.shield;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        autoDisconnect(osc, gain);
        osc.type = c.type;
        const startTime = ctx.currentTime + i * c.noteInterval;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol(c.volume), startTime + c.attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + c.duration);
        osc.start(startTime);
        osc.stop(startTime + c.duration);
    });
}
function playSpread() {
    if (!soundEnabled)
        return;
    const c = audioConfig.spread;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        autoDisconnect(osc, gain);
        osc.type = c.type;
        const startTime = ctx.currentTime + i * c.noteInterval;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol(c.volume), startTime + c.attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + c.duration);
        osc.start(startTime);
        osc.stop(startTime + c.duration);
    });
}
function playLevelUp() {
    if (!soundEnabled)
        return;
    const c = audioConfig.levelUp;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        autoDisconnect(osc, gain);
        osc.type = c.type;
        const startTime = ctx.currentTime + i * c.noteInterval;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol(c.volume), startTime + c.attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + c.duration);
        osc.start(startTime);
        osc.stop(startTime + c.duration);
    });
}
// 升级选择确认音效
function playUpgradeSelect() {
    if (!soundEnabled)
        return;
    const c = audioConfig.upgradeSelect;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        autoDisconnect(osc, gain);
        osc.type = c.type;
        const startTime = ctx.currentTime + i * c.noteInterval;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol(c.volume), startTime + c.attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + c.duration);
        osc.start(startTime);
        osc.stop(startTime + c.duration);
    });
}
// 激光发射音效：低频嗡鸣 + 噪声
function playLaser() {
    if (!soundEnabled)
        return;
    const c = audioConfig.laser;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.tone.type;
    osc.frequency.setValueAtTime(c.tone.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.tone.freqEnd, now + c.tone.duration);
    gain.gain.setValueAtTime(vol(c.tone.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.tone.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
    osc.start(now);
    osc.stop(now + c.tone.duration);
}
// 闪电链音效：高频噼啪 + 噪声
function playLightning() {
    if (!soundEnabled)
        return;
    const c = audioConfig.lightning;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.tone.type;
    osc.frequency.setValueAtTime(c.tone.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.tone.freqEnd, now + c.tone.duration);
    gain.gain.setValueAtTime(vol(c.tone.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.tone.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
    osc.start(now);
    osc.stop(now + c.tone.duration);
}
// 导弹发射音效：低频呼啸 + 噪声
function playMissile() {
    if (!soundEnabled)
        return;
    const c = audioConfig.missile;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.tone.type;
    osc.frequency.setValueAtTime(c.tone.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.tone.freqEnd, now + c.tone.duration);
    gain.gain.setValueAtTime(vol(c.tone.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.tone.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
    osc.start(now);
    osc.stop(now + c.tone.duration);
}
// 导弹命中爆炸音效：噪声 + 双音下降
function playMissileHit() {
    if (!soundEnabled)
        return;
    const c = audioConfig.missileHit;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.tone1.type;
    osc.frequency.setValueAtTime(c.tone1.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.tone1.freqEnd, now + c.tone1.duration);
    gain.gain.setValueAtTime(vol(c.tone1.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.tone1.duration);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    autoDisconnect(osc2, gain2);
    osc2.type = c.tone2.type;
    osc2.frequency.setValueAtTime(c.tone2.freqStart, now);
    osc2.frequency.exponentialRampToValueAtTime(c.tone2.freqEnd, now + c.tone2.duration);
    gain2.gain.setValueAtTime(vol(c.tone2.volume), now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + c.tone2.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
    osc.start(now);
    osc.stop(now + c.tone1.duration);
    osc2.start(now);
    osc2.stop(now + c.tone2.duration);
}
// 僚机命中音效：清脆高频 + 噪声
function playWingmanHit() {
    if (!soundEnabled)
        return;
    const c = audioConfig.wingmanHit;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    autoDisconnect(noise, noiseGain);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = c.tone.type;
    osc.frequency.setValueAtTime(c.tone.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.tone.freqEnd, now + c.tone.duration);
    gain.gain.setValueAtTime(vol(c.tone.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.tone.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
    osc.start(now);
    osc.stop(now + c.tone.duration);
}
export { audioConfig, resumeAudio, setSoundEnabled, isSoundEnabled, playShoot, playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig, playHeal, playHit, playEnemyHit, playGameOver, playFirepower, playShield, playSpread, playLevelUp, playUpgradeSelect, playLaser, playLightning, playMissile, playMissileHit, playWingmanHit, };
