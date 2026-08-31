// BGM 合成模块（从 audio.ts 拆出）：曲目配置 + lookahead 调度器
// 合成 BGM：lookahead 调度器模式（setInterval 周期检查，提前调度音符）
// 两首曲目：normal（平稳琶音）/ boss（急促低音驱动）
import { getAudioCtx, vol, autoDisconnect, isSoundEnabled } from "./audioCore.js";

// ========== BGM 配置 ==========
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
  if (!isSoundEnabled()) {
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
  if (!bgmCurrent || !isSoundEnabled()) return;
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

// 期望曲目查询（供 audio.ts 门面在取消静音时恢复）
function getBgmDesired(): BgmTrackId | null {
  return bgmDesired;
}

export { startBgm, stopBgm, pauseBgm, getBgmDesired };
