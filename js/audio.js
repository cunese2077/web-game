// 游戏音效模块 - 使用 Web Audio API 程序化合成

// ========== 音效配置对象（集中管理，方便调优） ==========
const audioConfig = {
  // 主音量倍率（全局缩放，0~1）
  masterVolume: 1.0,

  // 【子弹发射】短促正弦波"嘭"声
  shoot: {
    type: "sine",         // 振荡器波形类型
    freqStart: 1200,      // 起始频率（Hz）
    freqEnd: 600,         // 结束频率（Hz），产生下滑音效
    duration: 0.06,       // 持续时间（秒）
    volume: 0.1,          // 音量（0~1，会被 masterVolume 缩放）
  },

  // 【小型敌机摧毁】快速短促爆裂
  enemyDestroySmall: {
    noise: { volume: 0.12, duration: 0.1, amplitude: 0.3 },  // 噪声层：瞬态爆裂感
    tone: { type: "sawtooth", freqStart: 600, freqEnd: 100, volume: 0.1, duration: 0.1 },  // 音调层：锯齿波下滑
  },

  // 【中型敌机摧毁】中等爆炸
  enemyDestroyMedium: {
    noise: { volume: 0.15, duration: 0.2, amplitude: 0.4 },  // 噪声层：更强的爆裂
    tone: { type: "sawtooth", freqStart: 400, freqEnd: 60, volume: 0.12, duration: 0.2 },   // 音调层：更低频的下滑
  },

  // 【大型敌机摧毁】大型爆炸（双音调+噪声）
  enemyDestroyBig: {
    noise: { volume: 0.2, duration: 0.4, amplitude: 0.5 },                                // 噪声层：最强烈的爆裂
    tone1: { type: "sawtooth", freqStart: 300, freqEnd: 30, volume: 0.15, duration: 0.4 },  // 主音调：锯齿波低频下滑
    tone2: { type: "square", freqStart: 150, freqEnd: 20, volume: 0.08, duration: 0.3 },    // 副音调：方波超低频补充
  },

  // 【拾取恢复道具】C5-E5-G5 上升和弦
  heal: {
    type: "sine",                  // 波形类型
    notes: [523, 659, 784],        // 和弦音符频率（C5, E5, G5）
    noteInterval: 0.08,            // 音符间隔时间（秒）
    attackTime: 0.03,              // 起音时间（秒），音量从0渐入
    volume: 0.15,                  // 单音符音量
    duration: 0.3,                 // 单音符持续时间（秒）
  },

  // 【玩家扣血】四层叠加：爆裂噪声 + 低频重击 + 中频嗡鸣 + 警示蜂鸣
  hit: {
    noise:   { volume: 0.4,  duration: 0.15, amplitude: 0.8 },                          // 第1层：爆裂噪声（瞬态冲击感）
    subBass: { type: "sine",    freqStart: 200, freqEnd: 40,  volume: 0.5,  duration: 0.4 },   // 第2层：低频重击（sub-bass thump）
    buzz:    { type: "sawtooth", freqStart: 400, freqEnd: 60,  volume: 0.3,  duration: 0.35 },  // 第3层：中频锯齿波嗡鸣
    alarm:   { type: "square",  freq1: 800, freq2: 600, freq3: 800, t1: 0.1, t2: 0.2, volume: 0.15, duration: 0.3 },  // 第4层：双音警示蜂鸣（freq1→freq2→freq3 切换时间 t1/t2）
  },

  // 【游戏结束】G4-F4-E4-C4 下降音阶
  gameOver: {
    type: "triangle",               // 波形类型
    notes: [392, 349, 330, 262],    // 音阶音符频率（G4, F4, E4, C4）
    noteInterval: 0.2,              // 音符间隔时间（秒）
    attackTime: 0.02,               // 起音时间（秒）
    volume: 0.15,                   // 单音符音量
    duration: 0.4,                  // 单音符持续时间（秒）
  },
};

let audioCtx = null;

// 延迟初始化 AudioContext（需要用户交互后才能创建）
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// 确保 AudioContext 已激活（用户交互后调用）
function resumeAudio() {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

// 辅助：应用主音量
function vol(v) {
  return v * audioConfig.masterVolume;
}

// ========== 音效合成函数 ==========

// 子弹发射：短促正弦波"嘭"声
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

// 小型敌机摧毁：快速短促爆裂
function playEnemyDestroySmall() {
  const c = audioConfig.enemyDestroySmall;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const bufferSize = ctx.sampleRate * c.noise.duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * c.noise.amplitude;
  }
  noise.buffer = buffer;
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

// 中型敌机摧毁：中等爆炸
function playEnemyDestroyMedium() {
  const c = audioConfig.enemyDestroyMedium;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const bufferSize = ctx.sampleRate * c.noise.duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * c.noise.amplitude;
  }
  noise.buffer = buffer;
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

// 大型敌机摧毁：大型爆炸
function playEnemyDestroyBig() {
  const c = audioConfig.enemyDestroyBig;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const bufferSize = ctx.sampleRate * c.noise.duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * c.noise.amplitude;
  }
  noise.buffer = buffer;
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

// 拾取恢复道具：上升和弦
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

// 玩家扣血：强烈撞击+低频震动+警示
function playHit() {
  const c = audioConfig.hit;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  // 第一层：爆裂噪声（瞬态冲击）
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const bufferSize = ctx.sampleRate * c.noise.duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * c.noise.amplitude;
  }
  noise.buffer = buffer;
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(vol(c.noise.volume), now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + c.noise.duration);

  // 第二层：低频重击（sub-bass thump）
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = c.subBass.type;
  osc.frequency.setValueAtTime(c.subBass.freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(c.subBass.freqEnd, now + c.subBass.duration);
  gain.gain.setValueAtTime(vol(c.subBass.volume), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + c.subBass.duration);

  // 第三层：中频锯齿波嗡鸣
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = c.buzz.type;
  osc2.frequency.setValueAtTime(c.buzz.freqStart, now);
  osc2.frequency.exponentialRampToValueAtTime(c.buzz.freqEnd, now + c.buzz.duration);
  gain2.gain.setValueAtTime(vol(c.buzz.volume), now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + c.buzz.duration);

  // 第四层：双音警示蜂鸣
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

// 游戏结束：下降音阶
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

export { audioConfig, resumeAudio, playShoot, playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig, playHeal, playHit, playGameOver };
