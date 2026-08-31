// ========== 音效配置对象 ==========
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
export { audioConfig };
