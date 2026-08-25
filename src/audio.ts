// 游戏音效模块 - 使用 Web Audio API 程序化合成

// ========== 音效配置类型 ==========
interface NoiseConfig {
  volume: number;
  duration: number;
  amplitude: number;
}

interface ToneConfig {
  type: OscillatorType;
  freqStart: number;
  freqEnd: number;
  volume: number;
  duration: number;
}

interface ToneWithNoiseConfig {
  noise: NoiseConfig;
  tone: ToneConfig;
}

interface BigExplosionConfig {
  noise: NoiseConfig;
  tone1: ToneConfig;
  tone2: ToneConfig;
}

interface MelodyConfig {
  type: OscillatorType;
  notes: number[];
  noteInterval: number;
  attackTime: number;
  volume: number;
  duration: number;
}

interface HitAlarmConfig {
  type: OscillatorType;
  freq1: number;
  freq2: number;
  freq3: number;
  t1: number;
  t2: number;
  volume: number;
  duration: number;
}

interface HitConfig {
  noise: NoiseConfig;
  subBass: ToneConfig;
  buzz: ToneConfig;
  alarm: HitAlarmConfig;
}

interface FirepowerConfig extends MelodyConfig {
  noise: NoiseConfig;
}

interface AudioConfig {
  masterVolume: number;
  shoot: {
    type: OscillatorType;
    freqStart: number;
    freqEnd: number;
    duration: number;
    volume: number;
  };
  enemyDestroySmall: ToneWithNoiseConfig;
  enemyDestroyMedium: ToneWithNoiseConfig;
  enemyDestroyBig: BigExplosionConfig;
  heal: MelodyConfig;
  hit: HitConfig;
  enemyHit: {
    type: OscillatorType;    // 波形类型
    freqStart: number;       // 起始频率
    freqEnd: number;         // 结束频率
    duration: number;        // 持续时间（秒）
    volume: number;          // 音量（0~1，受 masterVolume 缩放）
  };
  gameOver: MelodyConfig;
  firepower: FirepowerConfig;
  shield: MelodyConfig;
  spread: MelodyConfig;
  levelUp: MelodyConfig;
  upgradeSelect: MelodyConfig;
  laser: ToneWithNoiseConfig;       // 激光发射：低频嗡鸣 + 噪声
  lightning: ToneWithNoiseConfig;   // 闪电链：高频噼啪 + 噪声
  missile: ToneWithNoiseConfig;     // 导弹发射：低频呼啸 + 噪声
  missileHit: BigExplosionConfig;   // 导弹命中爆炸
  wingmanHit: ToneWithNoiseConfig;  // 僚机命中
  bossWarning: HitAlarmConfig;      // BOSS 来袭预警
  bossHit: ToneWithNoiseConfig;     // BOSS 受击
  bossDestroy: BigExplosionConfig;  // BOSS 击毁
  evolution: MelodyConfig;           // 进化合成
}

// ========== BGM 配置 ==========
// 合成 BGM：lookahead 调度器模式（setInterval 周期检查，提前调度音符）
// 两首曲目：normal（平稳琶音）/ boss（急促低音驱动）
interface BgmNote {
  freq: number;       // 频率（0 表示休止符）
  beats: number;      // 持续拍数
  type: OscillatorType;
  volume: number;
}

interface BgmTrack {
  bpm: number;                          // 每分钟拍数
  lead: BgmNote[];                      // 主旋律（琶音）
  bass: BgmNote[];                      // 低音
}

const bgmTracks: Record<"normal" | "boss", BgmTrack> = {
  // 普通 BGM：A 小调五声琶音，110 BPM，温和氛围
  normal: {
    bpm: 110,
    lead: [
      { freq: 220.0, beats: 0.5, type: "triangle", volume: 0.045 },
      { freq: 329.6, beats: 0.5, type: "triangle", volume: 0.045 },
      { freq: 440.0, beats: 0.5, type: "triangle", volume: 0.045 },
      { freq: 329.6, beats: 0.5, type: "triangle", volume: 0.045 },
      { freq: 261.6, beats: 0.5, type: "triangle", volume: 0.045 },
      { freq: 329.6, beats: 0.5, type: "triangle", volume: 0.045 },
      { freq: 523.3, beats: 0.5, type: "triangle", volume: 0.04 },
      { freq: 329.6, beats: 0.5, type: "triangle", volume: 0.045 },
    ],
    bass: [
      { freq: 110.0, beats: 2, type: "sine", volume: 0.07 },
      { freq: 87.3, beats: 2, type: "sine", volume: 0.07 },
      { freq: 98.0, beats: 2, type: "sine", volume: 0.07 },
      { freq: 110.0, beats: 2, type: "sine", volume: 0.07 },
    ],
  },
  // BOSS BGM：D 小调，150 BPM，锯齿波低音驱动 + 上行音阶，紧张感
  boss: {
    bpm: 150,
    lead: [
      { freq: 293.7, beats: 0.5, type: "square", volume: 0.03 },
      { freq: 349.2, beats: 0.5, type: "square", volume: 0.03 },
      { freq: 440.0, beats: 0.5, type: "square", volume: 0.03 },
      { freq: 587.3, beats: 0.5, type: "square", volume: 0.03 },
      { freq: 440.0, beats: 0.5, type: "square", volume: 0.03 },
      { freq: 349.2, beats: 0.5, type: "square", volume: 0.03 },
      { freq: 466.2, beats: 0.5, type: "square", volume: 0.03 },
      { freq: 440.0, beats: 0.5, type: "square", volume: 0.03 },
    ],
    bass: [
      { freq: 73.4, beats: 0.5, type: "sawtooth", volume: 0.05 },
      { freq: 73.4, beats: 0.5, type: "sawtooth", volume: 0.05 },
      { freq: 87.3, beats: 0.5, type: "sawtooth", volume: 0.05 },
      { freq: 73.4, beats: 0.5, type: "sawtooth", volume: 0.05 },
    ],
  },
};

// BGM 运行时状态
type BgmTrackId = keyof typeof bgmTracks;
let bgmCurrent: BgmTrackId | null = null;    // 当前曲目
let bgmDesired: BgmTrackId | null = null;    // 期望曲目（静音时保留意图）
let bgmSchedulerId: number | null = null;    // setInterval 句柄
let bgmNextLeadTime = 0;                     // 下一个主旋律音符调度时间
let bgmNextBassTime = 0;                     // 下一个低音音符调度时间
let bgmLeadIndex = 0;
let bgmBassIndex = 0;

// 停止 BGM（幂等）：清调度器并复位游标
function stopBgm(): void {
  if (bgmSchedulerId !== null) {
    clearInterval(bgmSchedulerId);
    bgmSchedulerId = null;
  }
  bgmCurrent = null;
  bgmDesired = null;
  bgmLeadIndex = 0;
  bgmBassIndex = 0;
}

// 暂停 BGM 调度（静音时）：保留 bgmDesired 以便恢复
function pauseBgm(): void {
  if (bgmSchedulerId !== null) {
    clearInterval(bgmSchedulerId);
    bgmSchedulerId = null;
  }
  bgmCurrent = null;
  bgmLeadIndex = 0;
  bgmBassIndex = 0;
}

// 启动/切换 BGM（幂等：同曲目不重启）
// track: "normal"（普通战斗）| "boss"（BOSS 战）
function startBgm(track: BgmTrackId): void {
  if (!soundEnabled) {
    // 静音中：仅记录意图，取消静音时由 setSoundEnabled 恢复
    bgmDesired = track;
    return;
  }
  if (bgmCurrent === track && bgmSchedulerId !== null) return;
  // 切换曲目：清旧调度器
  if (bgmSchedulerId !== null) {
    clearInterval(bgmSchedulerId);
    bgmSchedulerId = null;
  }
  bgmCurrent = track;
  bgmDesired = track;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  bgmNextLeadTime = now + 0.1;
  bgmNextBassTime = now + 0.1;
  bgmLeadIndex = 0;
  bgmBassIndex = 0;
  // lookahead 调度器：每 60ms 检查一次，提前调度 0.2s 内到期的音符
  bgmSchedulerId = window.setInterval(scheduleBgmNotes, 60);
}

// 调度单个 BGM 音符（短包络，避免爆音）
function scheduleBgmNote(freq: number, beats: number, type: OscillatorType, volume: number, startTime: number, beatDur: number): void {
  const ctx = getAudioCtx();
  const dur = beats * beatDur;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  autoDisconnect(osc, gain);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol(volume), startTime + 0.02);
  gain.gain.setValueAtTime(vol(volume), startTime + dur * 0.6);
  gain.gain.linearRampToValueAtTime(0, startTime + dur * 0.95);
  osc.start(startTime);
  osc.stop(startTime + dur);
}

// BGM lookahead 核心：调度到期的主旋律/低音音符，循环曲目
function scheduleBgmNotes(): void {
  if (!bgmCurrent || !soundEnabled) return;
  const track = bgmTracks[bgmCurrent];
  const beatDur = 60 / track.bpm;          // 一拍的秒数
  const lookahead = 0.2;                   // 提前调度窗口（秒）
  const ctx = getAudioCtx();

  while (bgmNextLeadTime < ctx.currentTime + lookahead) {
    const note = track.lead[bgmLeadIndex];
    if (note.freq > 0) {
      scheduleBgmNote(note.freq, note.beats, note.type, note.volume, bgmNextLeadTime, beatDur);
    }
    bgmNextLeadTime += note.beats * beatDur;
    bgmLeadIndex = (bgmLeadIndex + 1) % track.lead.length;
  }
  while (bgmNextBassTime < ctx.currentTime + lookahead) {
    const note = track.bass[bgmBassIndex];
    if (note.freq > 0) {
      scheduleBgmNote(note.freq, note.beats, note.type, note.volume, bgmNextBassTime, beatDur);
    }
    bgmNextBassTime += note.beats * beatDur;
    bgmBassIndex = (bgmBassIndex + 1) % track.bass.length;
  }
}

// ========== 连击音效 ==========
// 连击窗口 1.5 秒：窗口内连续击杀时播放音调递增的短音（从第 2 连击起）
const COMBO_WINDOW = 1.5;
const COMBO_SCALE = [392, 440, 494, 587, 659, 784, 880, 988, 1175, 1319];
let comboCount = 0;
let comboLastTime = 0;

// 击杀通知：在敌机销毁时调用，内部跟踪连击并播放递增音
function notifyEnemyKill(): void {
  if (!soundEnabled) return;
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

// ========== 音效配置对象 ==========
const audioConfig: AudioConfig = {
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
    type: "triangle",        // 三角波，音色柔和
    freqStart: 900,          // 起始频率 900Hz
    freqEnd: 500,            // 快速下降到 500Hz
    duration: 0.04,          // 持续仅 40ms，短促清脆
    volume: 0.06,            // 低音量，不干扰其他音效
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
  // BOSS 来袭预警：急促警报双音交替
  bossWarning: {
    type: "square",
    freq1: 880,
    freq2: 660,
    freq3: 880,
    t1: 0.15,
    t2: 0.3,
    volume: 0.2,
    duration: 0.45,
  },
  // BOSS 受击：沉重钝击
  bossHit: {
    noise: { volume: 0.15, duration: 0.08, amplitude: 0.5 },
    tone: { type: "sawtooth", freqStart: 200, freqEnd: 80, volume: 0.12, duration: 0.08 },
  },
  // BOSS 击毁：大规模爆炸
  bossDestroy: {
    noise: { volume: 0.4, duration: 0.6, amplitude: 1.0 },
    tone1: { type: "sawtooth", freqStart: 400, freqEnd: 15, volume: 0.3, duration: 0.6 },
    tone2: { type: "square", freqStart: 200, freqEnd: 8, volume: 0.2, duration: 0.5 },
  },
  // 进化合成：华丽上行和弦 + 高频泛音，标志两武器融合
  evolution: {
    type: "sine",
    notes: [523, 659, 784, 1047, 1319],
    noteInterval: 0.07,
    attackTime: 0.02,
    volume: 0.2,
    duration: 0.4,
  },
};

let audioCtx: AudioContext | null = null;

// 音效开关状态（由 settings.ts 控制）
let soundEnabled: boolean = true;

// 音效总开关：同步控制 BGM（静音时暂停调度，恢复时按 bgmDesired 重启）
function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (!enabled) {
    pauseBgm();
  } else if (bgmDesired !== null) {
    startBgm(bgmDesired);
  }
}

function isSoundEnabled(): boolean {
  return soundEnabled;
}

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

function resumeAudio(): void {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

function vol(v: number): number {
  return v * audioConfig.masterVolume;
}

// 自动断开：音源节点（振荡器/噪声源）播放结束后断开自身和关联节点，
// 避免 stop() 后节点仍留在音频图中无法被 GC，长时间游戏后孤儿节点累积导致内存泄漏和性能下降（移动端尤其严重）
function autoDisconnect(source: AudioScheduledSourceNode, ...nodes: AudioNode[]): void {
  source.onended = (): void => {
    source.disconnect();
    for (const n of nodes) n.disconnect();
  };
}

// ========== 辅助：创建噪声缓冲 ==========
function createNoiseBuffer(audioCtx: AudioContext, duration: number, amplitude: number): AudioBufferSourceNode {
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

function playShoot(): void {
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  if (!soundEnabled) return;
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
  audioConfig,
  resumeAudio,
  setSoundEnabled,
  isSoundEnabled,
  startBgm,
  stopBgm,
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
