// 音效合成模块（从 audio.ts 拆出）：连击跟踪 + 全部 play* 音效函数
import { audioConfig } from "./audioConfig.js";
import { getAudioCtx, isSoundEnabled, vol, autoDisconnect, createNoiseBuffer } from "./audioCore.js";

// ========== 连击音效 ==========
// 连击窗口 1.5 秒：窗口内连续击杀时播放音调递增的短音（从第 2 连击起）
const COMBO_WINDOW = 1.5;
const COMBO_SCALE = [392, 440, 494, 587, 659, 784, 880, 988, 1175, 1319];
let comboCount = 0;
let comboLastTime = 0;

// 击杀通知：在敌机销毁时调用，内部跟踪连击并播放递增音
function notifyEnemyKill(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  if (now - comboLastTime > COMBO_WINDOW) {
    comboCount = 0;
  }
  comboCount++;
  comboLastTime = now;
  // 第 2 连击起播放：与击毁爆炸音叠加，音调随连击数递增
  if (comboCount >= 2) {
    const idx = Math.min(comboCount - 2, COMBO_SCALE.length - 1);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    autoDisconnect(osc, gain);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(COMBO_SCALE[idx], now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.start(now);
    osc.stop(now + 0.09);
  }
}
// ========== 音效合成函数 ==========

function playShoot(): void {
  if (!isSoundEnabled()) return;
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

function playEnemyDestroySmall(): void {
  if (!isSoundEnabled()) return;
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

function playEnemyDestroyMedium(): void {
  if (!isSoundEnabled()) return;
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

function playEnemyDestroyBig(): void {
  if (!isSoundEnabled()) return;
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

function playHeal(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.heal;
  const ctx = getAudioCtx();
  c.notes.forEach((freq: number, i: number) => {
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

function playHit(): void {
  if (!isSoundEnabled()) return;
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
function playEnemyHit(): void {
  if (!isSoundEnabled()) return;
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

function playGameOver(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.gameOver;
  const ctx = getAudioCtx();
  c.notes.forEach((freq: number, i: number) => {
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

function playFirepower(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.firepower;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  c.notes.forEach((freq: number, i: number) => {
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

function playShield(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.shield;
  const ctx = getAudioCtx();
  c.notes.forEach((freq: number, i: number) => {
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

function playSpread(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.spread;
  const ctx = getAudioCtx();
  c.notes.forEach((freq: number, i: number) => {
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

function playLevelUp(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.levelUp;
  const ctx = getAudioCtx();
  c.notes.forEach((freq: number, i: number) => {
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
function playUpgradeSelect(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.upgradeSelect;
  const ctx = getAudioCtx();
  c.notes.forEach((freq: number, i: number) => {
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
function playLaser(): void {
  if (!isSoundEnabled()) return;
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
function playLightning(): void {
  if (!isSoundEnabled()) return;
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
function playMissile(): void {
  if (!isSoundEnabled()) return;
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
function playMissileHit(): void {
  if (!isSoundEnabled()) return;
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
function playWingmanHit(): void {
  if (!isSoundEnabled()) return;
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

// BOSS 来袭预警音效：急促警报
function playBossWarning(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.bossWarning;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  autoDisconnect(osc, gain);
  osc.type = c.type;
  osc.frequency.setValueAtTime(c.freq1, now);
  osc.frequency.setValueAtTime(c.freq2, now + c.t1);
  osc.frequency.setValueAtTime(c.freq3, now + c.t2);
  gain.gain.setValueAtTime(vol(c.volume), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + c.duration);
  osc.start(now);
  osc.stop(now + c.duration);
}

// BOSS 受击音效：沉重钝击
function playBossHit(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.bossHit;
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

// 进化合成音效：华丽上行和弦
function playEvolution(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.evolution;
  const ctx = getAudioCtx();
  c.notes.forEach((freq: number, i: number) => {
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

// BOSS 击毁音效：大规模爆炸
function playBossDestroy(): void {
  if (!isSoundEnabled()) return;
  const c = audioConfig.bossDestroy;
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

export {
  notifyEnemyKill,
  playShoot,
  playEnemyDestroySmall,
  playEnemyDestroyMedium,
  playEnemyDestroyBig,
  playHeal,
  playHit,
  playEnemyHit,
  playGameOver,
  playFirepower,
  playShield,
  playSpread,
  playLevelUp,
  playUpgradeSelect,
  playLaser,
  playLightning,
  playMissile,
  playMissileHit,
  playWingmanHit,
  playBossWarning,
  playBossHit,
  playBossDestroy,
  playEvolution,
};
