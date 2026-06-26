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
};
let audioCtx = null;
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
    const c = audioConfig.shoot;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = c.type;
    osc.frequency.setValueAtTime(c.freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(c.freqEnd, ctx.currentTime + c.duration);
    gain.gain.setValueAtTime(vol(c.volume), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + c.duration);
}
function playEnemyDestroySmall() {
    const c = audioConfig.enemyDestroySmall;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
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
    const c = audioConfig.enemyDestroyMedium;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
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
    const c = audioConfig.enemyDestroyBig;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = c.tone1.type;
    osc.frequency.setValueAtTime(c.tone1.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.tone1.freqEnd, now + c.tone1.duration);
    gain.gain.setValueAtTime(vol(c.tone1.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.tone1.duration);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
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
    const c = audioConfig.heal;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
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
    const c = audioConfig.hit;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const noise = createNoiseBuffer(ctx, c.noise.duration, c.noise.amplitude);
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = c.subBass.type;
    osc.frequency.setValueAtTime(c.subBass.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(c.subBass.freqEnd, now + c.subBass.duration);
    gain.gain.setValueAtTime(vol(c.subBass.volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.subBass.duration);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = c.buzz.type;
    osc2.frequency.setValueAtTime(c.buzz.freqStart, now);
    osc2.frequency.exponentialRampToValueAtTime(c.buzz.freqEnd, now + c.buzz.duration);
    gain2.gain.setValueAtTime(vol(c.buzz.volume), now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + c.buzz.duration);
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
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
function playGameOver() {
    const c = audioConfig.gameOver;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
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
    const c = audioConfig.firepower;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
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
    noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);
    noise.start(now);
    noise.stop(now + c.noise.duration);
}
function playShield() {
    const c = audioConfig.shield;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
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
    const c = audioConfig.spread;
    const ctx = getAudioCtx();
    c.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
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
export { audioConfig, resumeAudio, playShoot, playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig, playHeal, playHit, playGameOver, playFirepower, playShield, playSpread, };
